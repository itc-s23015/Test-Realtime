"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Ably from "ably";
import StockChart from "./StockChart";
import PlayerInfo from "./PlayerInfo";
import ControlButtons from "./ControlButtons";
import CardList from "./card";

const INITIAL_MONEY = 100000;
const INITIAL_HOLDING = 10;
const AUTO_UPDATE_INTERVAL = 2000; // 2秒

// 株価データを生成する関数
function generateStockData(seed = Date.now()) {
    const data = [];
    let price = 15000;
    const startDate = new Date('2024-01-01');
    
    // シード値を使って再現可能な乱数生成
    let random = seed;
    const seededRandom = () => {
        random = (random * 9301 + 49297) % 233280;
        return random / 233280;
    };

    for (let i = 0; i < 180; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);

        price += (seededRandom() - 0.48) * 500;
        price = Math.max(10000, Math.min(20000, price));

        data.push({
            date: date.toISOString().split('T')[0],
            price: Math.round(price),
            volume: Math.floor(seededRandom() * 100000000) + 50000000
        });
    }
    return data;
}

const Game = () => {
    const router = useRouter();
    
    // URL パラメータから部屋番号を取得
    const [roomNumber, setRoomNumber] = useState(null);
    const [error, setError] = useState("");
    const [stockData, setStockData] = useState([]);
    const [money, setMoney] = useState(INITIAL_MONEY);
    const [holding, setHolding] = useState(INITIAL_HOLDING);
    const [allPlayers, setAllPlayers] = useState({});
    const [selectedTarget, setSelectedTarget] = useState(null);
    const [status, setStatus] = useState("connecting");

    // Refs
    const clientRef = useRef(null);
    const chRef = useRef(null);
    const autoTimerRef = useRef(null);
    const navigatingRef = useRef(false);

    const clientId = useMemo(() => {
        if (typeof window === "undefined") return "";
        return sessionStorage.getItem("playerName") || `player-${crypto.randomUUID().slice(0, 6)}`;
    }, []);

    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        const room = query.get("room");

        if (!room) {
            setError("ルーム番号が指定されていません");
            router.push("/");
            return;
        }

        const roomU = room.toUpperCase();
        setRoomNumber(roomU);
        console.log("🎮 ゲーム画面: 部屋番号", roomU);

        // Ably接続
        const client = new Ably.Realtime.Promise({
            authUrl: `/api/ably-token?clientId=${encodeURIComponent(clientId)}&room=${encodeURIComponent(roomU)}`,
            closeOnUnload: true,
        });
        clientRef.current = client;

        client.connection.on(({ current }) => {
            setStatus(current);
            console.log("📡 接続状態:", current);
        });

        client.connection.once("connected", async () => {
            const channelName = `rooms:${roomU}`;
            const ch = client.channels.get(channelName);
            chRef.current = ch;

            await ch.attach();
            console.log("✅ チャンネル接続完了:", channelName);

            // Presenceに参加（プレイヤーデータ付き）
            await ch.presence.enter({
                name: clientId,
                money: INITIAL_MONEY,
                holding: INITIAL_HOLDING,
            });

            // 既存のプレイヤー情報を取得
            await refreshPlayers();

            // Presenceの変更を監視
            ch.presence.subscribe(["enter", "leave", "update"], refreshPlayers);

            // 株価初期化（ホストのみ）
            const members = await ch.presence.get();
            const ids = members.map(m => m.clientId).sort();
            const isHost = ids[0] === clientId;

            if (isHost) {
                console.log("👑 ホストとして株価データを初期化");
                const seed = Date.now();
                const initialData = generateStockData(seed);
                setStockData(initialData);
                
                // 他のプレイヤーに初期データを送信
                await ch.publish("stock-init", {
                    seed,
                    data: initialData,
                    by: clientId,
                });

                // 自動変動開始（ホストのみ）
                startAutoUpdate(ch, initialData);
            }

            // イベント購読
            ch.subscribe("stock-init", (msg) => {
                console.log("📊 株価データ受信");
                setStockData(msg.data.data);
            });

            ch.subscribe("stock-update", (msg) => {
                console.log("📈 株価更新:", msg.data.changeAmount);
                setStockData(msg.data.stockData);
            });

            ch.subscribe("attack", async (msg) => {
                if (msg.data.targetId === clientId) {
                    console.log("⚔️ 攻撃を受けました:", msg.data.effectAmount);
                    const newHolding = Math.max(0, holding + msg.data.effectAmount);
                    setHolding(newHolding);
                    
                    // Presenceを更新
                    await ch.presence.update({
                        name: clientId,
                        money,
                        holding: newHolding,
                    });

                    setError(`⚔️ 攻撃を受けました！保有株が ${Math.abs(msg.data.effectAmount)} 株減少`);
                    setTimeout(() => setError(""), 3000);
                }
            });

            async function refreshPlayers() {
                const mem = await ch.presence.get();
                const players = {};
                mem.forEach(m => {
                    players[m.clientId] = {
                        name: m.data?.name || m.clientId,
                        money: m.data?.money || INITIAL_MONEY,
                        holding: m.data?.holding || INITIAL_HOLDING,
                    };
                });
                setAllPlayers(players);
                console.log("👥 プレイヤー情報更新:", Object.keys(players).length, "人");
            }
        });

        return () => {
            console.log("🧹 クリーンアップ");
            if (autoTimerRef.current) {
                clearInterval(autoTimerRef.current);
            }
            try { chRef.current?.unsubscribe(); } catch {}
            try { chRef.current?.presence.leave(); } catch {}
            
            const doClose = () => { try { clientRef.current?.close(); } catch {} };
            if (navigatingRef.current) setTimeout(doClose, 200);
            else doClose();
        };
    }, [router, clientId, holding, money]);

    // 自動変動を開始（ホストのみ）
    const startAutoUpdate = (ch, initialData) => {
        if (autoTimerRef.current) return;

        let currentData = [...initialData];

        autoTimerRef.current = setInterval(async () => {
            const lastPrice = currentData[currentData.length - 1].price;
            const changeAmount = Math.floor((Math.random() - 0.5) * 600);
            const newPrice = Math.round(Math.max(10000, Math.min(20000, lastPrice + changeAmount)));

            // データ更新
            currentData[currentData.length - 1] = {
                ...currentData[currentData.length - 1],
                price: newPrice,
                volume: Math.floor(Math.random() * 100000000) + 50000000
            };

            if (currentData.length >= 180) {
                currentData.shift();
                const lastDate = new Date(currentData[currentData.length - 1].date);
                lastDate.setDate(lastDate.getDate() + 1);

                currentData.push({
                    date: lastDate.toISOString().split('T')[0],
                    price: newPrice,
                    volume: Math.floor(Math.random() * 100000000) + 50000000
                });
            }

            setStockData([...currentData]);

            // 全員に送信
            try {
                await ch.publish("stock-update", {
                    stockData: currentData,
                    changeAmount,
                    isAuto: true,
                });
                console.log("🤖 自動変動送信:", changeAmount);
            } catch (e) {
                console.error("❌ 自動変動送信失敗:", e);
            }
        }, AUTO_UPDATE_INTERVAL);
    };

    // 株価変動ボタンクリック処理
    const handleButtonClick = async (changeAmount) => {
        if (!chRef.current || stockData.length === 0) return;

        console.log("🔘 手動変動:", changeAmount);

        const lastPrice = stockData[stockData.length - 1].price;
        const newPrice = Math.round(Math.max(10000, Math.min(20000, lastPrice + changeAmount)));

        const newData = [...stockData];
        newData[newData.length - 1] = {
            ...newData[newData.length - 1],
            price: newPrice,
            volume: Math.floor(Math.random() * 100000000) + 50000000
        };

        if (newData.length >= 180) {
            newData.shift();
            const lastDate = new Date(newData[newData.length - 1].date);
            lastDate.setDate(lastDate.getDate() + 1);

            newData.push({
                date: lastDate.toISOString().split('T')[0],
                price: newPrice,
                volume: Math.floor(Math.random() * 100000000) + 50000000
            });
        }

        setStockData(newData);

        try {
            await chRef.current.publish("stock-update", {
                stockData: newData,
                changeAmount,
                isAuto: false,
            });
            console.log("✅ 手動変動送信完了");
        } catch (e) {
            console.error("❌ 手動変動送信失敗:", e);
            setError("株価変動の送信に失敗しました");
        }
    };

    // 攻撃ボタンの処理
    const handleAttack = async (effectAmount) => {
        if (!chRef.current) return;

        const otherPlayers = Object.keys(allPlayers).filter(id => id !== clientId);
        
        if (otherPlayers.length >= 1 && !selectedTarget) {
            setError("❌ ターゲットを選択してください");
            setTimeout(() => setError(""), 3000);
            return;
        }

        console.log("⚔️ 攻撃:", effectAmount, "ターゲット:", selectedTarget);

        try {
            await chRef.current.publish("attack", {
                targetId: selectedTarget || otherPlayers[0],
                effectAmount,
                attackerId: clientId,
            });

            setError(`✅ 攻撃成功！相手の株を ${Math.abs(effectAmount)} 株減らしました`);
            setTimeout(() => setError(""), 3000);
        } catch (e) {
            console.error("❌ 攻撃送信失敗:", e);
            setError("攻撃の送信に失敗しました");
        }
    };

    // ターゲット選択
    const handleTargetSelect = (targetId) => {
        setSelectedTarget(targetId);
        console.log("🎯 ターゲット選択:", targetId);
    };

    // 他のプレイヤーのリスト取得
    const otherPlayers = Object.keys(allPlayers)
        .filter(id => id !== clientId)
        .map(id => ({
            id,
            name: allPlayers[id].name,
            holding: allPlayers[id].holding
        }));

    const statusBadge = 
        status === "connected" ? { text: "接続中", color: "#10b981" } :
        status === "connecting" ? { text: "接続中...", color: "#f59e0b" } :
        { text: "切断", color: "#ef4444" };

    return (
        <div style={{ 
            width: '100%', 
            minHeight: '100vh', 
            backgroundColor: '#f9fafb', 
            padding: '32px' 
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                    <h1 style={{ 
                        textAlign: 'center', 
                        fontSize: '32px', 
                        fontWeight: 'bold',
                        color: '#111827',
                        margin: 0
                    }}>
                        株価ゲーム 📈
                    </h1>
                    <span style={{
                        background: statusBadge.color,
                        color: '#fff',
                        padding: '6px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                    }}>
                        {statusBadge.text}
                    </span>
                </div>

                {error && (
                    <div style={{
                        color: error.startsWith('✅') ? '#16a34a' : '#dc2626',
                        marginBottom: '20px',
                        padding: '16px',
                        backgroundColor: error.startsWith('✅') ? '#dcfce7' : '#fee2e2',
                        borderRadius: '12px',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        border: `2px solid ${error.startsWith('✅') ? '#16a34a' : '#dc2626'}`
                    }}>
                        {error.startsWith('✅') ? '' : '⚠️ '}{error}
                    </div>
                )}

                {/* プレイヤー情報 */}
                {roomNumber && money !== null && holding !== null && (
                    <PlayerInfo money={money} holding={holding} roomNumber={roomNumber} />
                )}

                {/* 他のプレイヤー情報（ターゲット選択） */}
                {otherPlayers.length > 0 && (
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        marginTop: '24px',
                        padding: '24px'
                    }}>
                        <h2 style={{
                            marginBottom: '16px',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            color: '#111827'
                        }}>
                            🎯 ターゲット選択 {otherPlayers.length >= 2 && "(必須)"}
                        </h2>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '12px'
                        }}>
                            {otherPlayers.map((player, index) => (
                                <button
                                    key={player.id}
                                    onClick={() => handleTargetSelect(player.id)}
                                    style={{
                                        padding: '16px',
                                        borderRadius: '8px',
                                        border: selectedTarget === player.id ? '3px solid #3b82f6' : '2px solid #e5e7eb',
                                        backgroundColor: selectedTarget === player.id ? '#dbeafe' : 'white',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        textAlign: 'left'
                                    }}
                                >
                                    <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                                        👤 {player.name}
                                    </div>
                                    <div style={{ color: '#6b7280', fontSize: '14px' }}>
                                        ID: {player.id.substring(0, 8)}...
                                    </div>
                                    <div style={{ marginTop: '8px', fontSize: '16px', fontWeight: 'bold' }}>
                                        📊 保有株: {player.holding} 株
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* 株価チャート */}
                {stockData.length > 0 && (
                    <StockChart stockData={stockData} />
                )}

                {/* コントロールボタン */}
                {stockData.length > 0 && (
                    <ControlButtons onButtonClick={handleButtonClick} />
                )}

                {/* 攻撃ボタン */}
                {otherPlayers.length > 0 && (
                    <CardList 
                        onButtonClick={handleAttack}
                        selectedTarget={selectedTarget}
                        hasTargets={otherPlayers.length >= 1}
                    />
                )}
            </div>
        </div>
    );
};

export default Game;