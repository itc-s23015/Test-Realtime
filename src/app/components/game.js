"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Ably from "ably";
import StockChart from "./StockChart";
import PlayerInfo from "./PlayerInfo";
import ControlButtons from "./ControlButtons";
import GameTimer from "./GameTimer";
import { CARD_TYPES, CARD_DEFINITIONS, executeCardEffect } from "./cardDefinitions";
import Hand from "./Hand";

const INITIAL_MONEY = 100000;
const INITIAL_HOLDING = 10;
const AUTO_UPDATE_INTERVAL = 2000; // 10秒ごとに自動変動
const GAME_DURATION = 300;

function generateStockData(seed = Date.now()) {
    const data = [];
    let price = 15000;
    const startDate = new Date('2024-01-01');
    
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

function getInitialHand() {
    return [
        { id: CARD_TYPES.REDUCE_HOLDINGS_SMALL },
        { id: CARD_TYPES.REDUCE_HOLDINGS_MEDIUM },
        { id: CARD_TYPES.REDUCE_HOLDINGS_LARGE },
    ];
}

const Game = () => {
    const router = useRouter();
    
    const [roomNumber, setRoomNumber] = useState(null);
    const [error, setError] = useState("");
    const [stockData, setStockData] = useState([]);
    const [money, setMoney] = useState(INITIAL_MONEY);
    const [holding, setHolding] = useState(INITIAL_HOLDING);
    const [allPlayers, setAllPlayers] = useState({});
    const [selectedTarget, setSelectedTarget] = useState(null);
    const [status, setStatus] = useState("connecting");
    const [hand, setHand] = useState(getInitialHand());

    // Refs
    const clientRef = useRef(null);
    const chRef = useRef(null);
    const autoTimerRef = useRef(null);
    const navigatingRef = useRef(false);
    const initializedRef = useRef(false);
    const holdingRef = useRef(holding);
    const moneyRef = useRef(money);
    
    useEffect(() => {
        holdingRef.current = holding;
    }, [holding]);
    
    useEffect(() => {
        moneyRef.current = money;
    }, [money]);

    const clientId = useMemo(() => {
        if (typeof window === "undefined") return "";
        return sessionStorage.getItem("playerName") || `player-${crypto.randomUUID().slice(0, 6)}`;
    }, []);

    const roomU = useMemo(() => {
        if (!roomNumber) return "";
        return roomNumber.toUpperCase();
    }, [roomNumber]);

    const updatePresence = useCallback(async (newMoney, newHolding) => {
        if (!chRef.current) return;
        
        try {
            await chRef.current.presence.update({
                name: clientId,
                money: newMoney,
                holding: newHolding,
            });
            console.log("✅ Presence更新:", { money: newMoney, holding: newHolding });
        } catch (e) {
            console.error("❌ Presence更新失敗:", e);
        }
    }, [clientId]);

    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        const room = query.get("room");

        if (!room) {
            setError("ルーム番号が指定されていません");
            router.push("/");
            return;
        }

        setRoomNumber(room.toUpperCase());
    }, [router]);

    // 修正: 自動更新ロジック
    const startAutoUpdate = useCallback((ch, initialData) => {
        if (autoTimerRef.current) {
            console.log("⚠️ 既に自動更新タイマーが起動しています");
            return;
        }

        console.log("🤖 自動更新タイマーを開始します (10秒間隔)");
        let currentData = [...initialData];

        autoTimerRef.current = setInterval(async () => {
            const lastPrice = currentData[currentData.length - 1].price;
            const changeAmount = Math.floor((Math.random() - 0.5) * 600);
            const newPrice = Math.round(Math.max(10000, Math.min(20000, lastPrice + changeAmount)));

            // 🔧 修正: 日付を正しく進める（前回の日付から+1日）
            const lastDateStr = currentData[currentData.length - 1].date;
            const lastDate = new Date(lastDateStr);
            lastDate.setDate(lastDate.getDate() + 1); // 1日進める

            const newPoint = {
                date: lastDate.toISOString().split('T')[0], // YYYY-MM-DD形式
                price: newPrice,
                volume: Math.floor(Math.random() * 100000000) + 50000000
            };

            // 最大180ポイントを維持（古いデータを削除）
            if (currentData.length >= 180) {
                currentData = [...currentData.slice(1), newPoint];
            } else {
                currentData = [...currentData, newPoint];
            }

            // ローカル状態を更新
            setStockData([...currentData]);

            // Ablyで同期
            try {
                await ch.publish("stock-update", {
                    stockData: currentData,
                    changeAmount,
                    isAuto: true,
                });
                console.log("🤖 自動変動送信成功:", {
                    変動額: changeAmount,
                    新価格: newPrice,
                    日付: newPoint.date,
                    データ数: currentData.length
                });
            } catch (e) {
                console.error("❌ 自動変動送信失敗:", e);
            }
        }, AUTO_UPDATE_INTERVAL);
    }, []);

    useEffect(() => {
        if (!roomU || !clientId || initializedRef.current) return;
        
        initializedRef.current = true;
        console.log("🎮 ゲーム画面初期化: 部屋番号", roomU);

        const client = new Ably.Realtime.Promise({
            authUrl: `/api/ably-token?clientId=${encodeURIComponent(clientId)}&room=${encodeURIComponent(roomU)}`,
            closeOnUnload: false,
        });
        clientRef.current = client;

        client.connection.on(({ current }) => {
            setStatus(current);
            console.log("📡 接続状態:", current);
            
            if (current === "failed" || current === "suspended") {
                setError("⚠️ 接続が切断されました。ページを再読み込みしてください。");
            }
        });

        client.connection.once("connected", async () => {
            const channelName = `rooms:${roomU}`;
            const ch = client.channels.get(channelName);
            chRef.current = ch;

            await ch.attach();
            console.log("✅ チャンネル接続完了:", channelName);

            await ch.presence.enter({
                name: clientId,
                money: INITIAL_MONEY,
                holding: INITIAL_HOLDING,
            });

            await refreshPlayers();

            ch.presence.subscribe(["enter", "leave", "update"], refreshPlayers);

            const members = await ch.presence.get();
            const ids = members.map(m => m.clientId).sort();
            const isHost = ids[0] === clientId;

            if (isHost) {
                console.log("👑 ホストとして株価データを初期化");
                const seed = Date.now();
                const initialData = generateStockData(seed);
                setStockData(initialData);
                
                await ch.publish("stock-init", {
                    seed,
                    data: initialData,
                    by: clientId,
                });

                // 🔧 修正: useCallbackで定義した関数を使用
                startAutoUpdate(ch, initialData);
            }

            ch.subscribe("stock-init", (msg) => {
                console.log("📊 株価データ受信");
                setStockData(msg.data.data);
            });

            ch.subscribe("stock-update", (msg) => {
                console.log("📈 株価更新受信:", {
                    変動額: msg.data.changeAmount,
                    自動: msg.data.isAuto,
                    データ数: msg.data.stockData.length
                });
                setStockData(msg.data.stockData);
            });

            ch.subscribe("card-used", async (msg) => {
                const { cardId, playerId, targetId } = msg.data;
                console.log("🃏 カード使用受信:", cardId, "by", playerId);

                if (targetId === clientId) {
                    const snapshot = {
                        ...allPlayers,
                        [clientId]: {
                            ...(allPlayers[clientId] ?? { name: clientId, money: moneyRef.current }),
                            holding: holdingRef.current,
                        },
                    };
                    const result = executeCardEffect(cardId, { players: snapshot }, playerId, targetId);

                    if (result.success && result.needsSync) {
                        const newHolding = result.gameState.players[clientId].holding;
                        setHolding(newHolding);
                        
                        setTimeout(() => {
                            updatePresence(moneyRef.current, newHolding);
                        }, 50);

                        setError(`⚔️ ${CARD_DEFINITIONS[cardId]?.name}を受けました！`);
                        setTimeout(() => setError(""), 3000);
                    }
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
            console.log("🧹 クリーンアップ開始");
            
            if (autoTimerRef.current) {
                console.log("⏹️ 自動更新タイマー停止");
                clearInterval(autoTimerRef.current);
                autoTimerRef.current = null;
            }
            
            const cleanup = async () => {
                try {
                    if (chRef.current) {
                        console.log("📤 Presenceから退出中...");
                        chRef.current.unsubscribe();
                        
                        try {
                            await Promise.race([
                                chRef.current.presence.leave(),
                                new Promise((_, reject) => 
                                    setTimeout(() => reject(new Error("timeout")), 1000)
                                )
                            ]);
                        } catch (e) {
                            console.warn("Presence退出タイムアウト:", e);
                        }
                    }
                } catch (e) {
                    console.warn("チャンネルクリーンアップエラー:", e);
                }
                
                try {
                    if (clientRef.current?.connection?.state === "connected") {
                        console.log("🔌 Ably接続をクローズ中...");
                        clientRef.current.close();
                    }
                } catch (e) {
                    console.warn("接続クローズエラー:", e);
                }
            };
            
            if (navigatingRef.current) {
                setTimeout(cleanup, 300);
            } else {
                cleanup();
            }
        };
    }, [roomU, clientId, router, updatePresence, startAutoUpdate]);

    const handleButtonClick = async (changeAmount) => {
        if (!chRef.current || stockData.length === 0) return;

        console.log("🔘 手動変動:", changeAmount);

        const lastPrice = stockData[stockData.length - 1].price;
        const newPrice = Math.round(Math.max(10000, Math.min(20000, lastPrice + changeAmount)));

        // 🔧 修正: 最後のポイントを更新（日付はそのまま）
        const newData = [...stockData];
        newData[newData.length - 1] = {
            ...newData[newData.length - 1],
            price: newPrice,
            volume: Math.floor(Math.random() * 100000000) + 50000000
        };

        setStockData(newData);

        try {
            await chRef.current.publish("stock-update", {
                stockData: newData,
                changeAmount,
                isAuto: false,
            });
            console.log("✅ 手動変動送信完了:", { 変動額: changeAmount, 新価格: newPrice });
        } catch (e) {
            console.error("❌ 手動変動送信失敗:", e);
            setError("株価変動の送信に失敗しました");
        }
    };

    const handlePlayCard = async (cardIndex) => {
        if (!chRef.current || cardIndex < 0 || cardIndex >= hand.length) return;

        const card = hand[cardIndex];
        const cardDef = CARD_DEFINITIONS[card.id];

        const otherPlayers = Object.keys(allPlayers).filter(id => id !== clientId);
        if (cardDef.needsTarget && otherPlayers.length >= 1 && !selectedTarget) {
            setError("❌ ターゲットを選択してください");
            setTimeout(() => setError(""), 3000);
            return;
        }

        const targetId = selectedTarget || otherPlayers[0];

        console.log("🃏 カード使用:", card.id, "ターゲット:", targetId);

        try {
            await chRef.current.publish("card-used", {
                cardId: card.id,
                playerId: clientId,
                targetId,
                timestamp: Date.now(),
            });

            setHand(prev => prev.filter((_, i) => i !== cardIndex));

            setError(`✅ ${cardDef.name}を使用しました！`);
            setTimeout(() => setError(""), 3000);
        } catch (e) {
            console.error("❌ カード使用送信失敗:", e);
            setError("カード使用の送信に失敗しました");
        }
    };

    const handleTargetSelect = (targetId) => {
        setSelectedTarget(targetId);
        console.log("🎯 ターゲット選択:", targetId);
    };

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

                {roomNumber && money !== null && holding !== null && (
                    <PlayerInfo money={money} holding={holding} roomNumber={roomNumber} />
                )}

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
                            {otherPlayers.map((player) => (
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

                {stockData.length > 0 && (
                    <StockChart stockData={stockData} />
                )}

                {stockData.length > 0 && (
                    <ControlButtons onButtonClick={handleButtonClick} />
                )}

                <Hand
                    hand={hand}
                    onPlay={handlePlayCard}
                    maxHand={8}
                />
            </div>
        </div>
    );
};

export default Game;