"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Ably from "ably";
import StockChart from "./StockChart";
import PlayerInfo from "./PlayerInfo";
import ControlButtons from "./ControlButtons";
import CardList from "./card";

// 初期値の定義
const INITIAL_MONEY = 100000;
const INITIAL_HOLDING = 10;
const AUTO_UPDATE_INTERVAL = 10000;

// 株価データ生成関数
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

// サイドバーコンポーネント
function SideBar({ side, open, onToggle, width, title, children }) {
  const isLeft = side === "left";
  return (
    <aside
      style={{
        position: "fixed",
        top: 0,
        bottom: 0,
        [isLeft ? "left" : "right"]: 0,
        width,
        transform: `translateX(${open ? "0%" : isLeft ? "-95%" : "95%"})`,
        transition: "transform .25s ease",
        background: "#ffffff",
        borderLeft: isLeft ? "none" : "1px solid #e5e7eb",
        borderRight: isLeft ? "1px solid #e5e7eb" : "none",
        boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        padding: "16px 16px 16px",
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <button
        onClick={onToggle}
        style={{
          position: "absolute",
          top: 80,
          [isLeft ? "right" : "left"]: -28,
          width: 28,
          height: 56,
          borderRadius: "0 8px 8px 0",
          background: "#fff",
          boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
          cursor: "pointer",
        }}
      >
        {isLeft ? (open ? "◀" : "▶") : (open ? "▶" : "◀")}
      </button>
      <div style={{ fontWeight: 800, color: "#111827" }}>{title}</div>
      <div>{children}</div>
    </aside>
  );
}

// ログコンポーネント
function Log({ log = [] }) {
  return (
    <div
      style={{
        background: "#ffffff", // 背景色を白に変更
        border: "1px solid #2a2a2a",
        borderRadius: 12,
        padding: 10,
        height: 300, // 高さを300pxに変更
        color: "#000000", // ログの文章を黒に変更
        overflow: "auto",
      }}
    >
      {log.length === 0 ? (
        <div style={{ opacity: 0.6, fontSize: 12 }}>ログはまだありません</div>
      ) : (
        log
          .slice()
          .reverse()
          .map((l, i) => (
            <div key={i} style={{ fontSize: 12, lineHeight: 1.4 }}>
              {l}
            </div>
          ))
      )}
    </div>
  );
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

    // ログの状態管理
    const [logs, setLogs] = useState([]);

    // サイドバーの開閉状態
    const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
    const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

    // サイドバーのトグル処理
    const handleLeftSidebarToggle = () => {
        setIsLeftSidebarOpen(!isLeftSidebarOpen);
    };

    const handleRightSidebarToggle = () => {
        setIsRightSidebarOpen(!isRightSidebarOpen);
    };

    // ログ更新関数
    const addLog = (message) => {
        setLogs((prevLogs) => [...prevLogs, message]);
    };

    // Refs
    const clientRef = useRef(null);
    const chRef = useRef(null);
    const autoTimerRef = useRef(null);
    const navigatingRef = useRef(false);
    const initializedRef = useRef(false);

    // 最新のholding値を常に参照できるようにRefで保持
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

    // Presence更新関数（useCallbackで安定化）
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

    useEffect(() => {
        if (!roomU || !clientId || initializedRef.current) return;
        
        initializedRef.current = true;
        console.log("🎮 ゲーム画面初期化: 部屋番号", roomU);

        const client = new Ably.Realtime.Promise({
            authUrl: `/api/ably-token?clientId=${encodeURIComponent(clientId)}&room=${encodeURIComponent(roomU)}`,
            closeOnUnload: false, // ページ遷移時の自動切断を無効化
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

            await ch.presence.enter({
                name: clientId,
                money: INITIAL_MONEY,
                holding: INITIAL_HOLDING,
            });

            // 対戦開始のログを流す
            addLog("🎮 対戦が開始されました！");

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

                startAutoUpdate(ch, initialData);
            }

            ch.subscribe("stock-init", (msg) => {
                console.log("📊 株価データ受信");
                setStockData(msg.data.data);
            });

            ch.subscribe("stock-update", (msg) => {
                console.log("📈 株価更新:", msg.data.changeAmount);
                setStockData(msg.data.stockData);

                // 株価の増減をログに追加
                const changeMessage = msg.data.changeAmount > 0
                    ? `株価が${Math.abs(msg.data.changeAmount)}円上昇しました`
                    : `株価が${Math.abs(msg.data.changeAmount)}円下降しました`;

                addLog(changeMessage); // 株価変動のログを追加
            });

            ch.subscribe("attack", async (msg) => {
                if (msg.data.targetId === clientId) {
                    console.log("⚔️ 攻撃を受けました:", msg.data.effectAmount);
                    
                    // Refから最新値を取得
                    const currentHolding = holdingRef.current;
                    const currentMoney = moneyRef.current;
                    
                    const newHolding = Math.max(0, currentHolding + msg.data.effectAmount);
                    
                    // State更新
                    setHolding(newHolding);
                    
                    // Presence更新を遅延実行（State更新後）
                    setTimeout(() => {
                        updatePresence(currentMoney, newHolding);
                    }, 50);

                    addLog(`⚔️ 攻撃を受けました！保有株が ${Math.abs(msg.data.effectAmount)} 株減少`);

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
            
            const cleanup = async () => {
                try {
                    if (chRef.current) {
                        chRef.current.unsubscribe();
                        await chRef.current.presence.leave();
                    }
                } catch (e) {
                    console.warn("クリーンアップ中のエラー:", e);
                }
                
                const doClose = () => {
                    try {
                        if (clientRef.current) {
                            clientRef.current.close();
                        }
                    } catch (e) {
                        console.warn("接続クローズ中のエラー:", e);
                    }
                };
                
                if (navigatingRef.current) {
                    setTimeout(doClose, 200);
                } else {
                    doClose();
                }
            };
            
            cleanup();
        };
    }, [roomU, clientId, router, updatePresence]);

    const startAutoUpdate = (ch, initialData) => {
        if (autoTimerRef.current) return;

        let currentData = [...initialData];

        autoTimerRef.current = setInterval(async () => {
            const lastPrice = currentData[currentData.length - 1].price;
            const changeAmount = Math.floor((Math.random() - 0.5) * 600);
            const newPrice = Math.round(Math.max(10000, Math.min(20000, lastPrice + changeAmount)));

            const lastDate = new Date(currentData[currentData.length - 1].date);
            lastDate.setDate(lastDate.getDate() + 10);

            const newPoint = {
                date: lastDate.toISOString(),
                price: newPrice,
                volume: Math.floor(Math.random() * 100000000) + 50000000
            };

            currentData[currentData.length - 1] = {
                ...currentData[currentData.length - 1],
                price: newPrice,
                volume: Math.floor(Math.random() * 100000000) + 50000000
            };

            if (currentData.length >= 180) {
                currentData = [...currentData.slice(1), newPoint];
            } else {
                currentData = [...currentData, newPoint];
            }

            setStockData([...currentData]);

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

        // 株価の増減をログに追加
        const changeMessage = changeAmount > 0
            ? `株価が${Math.abs(changeAmount)}円上昇しました`
            : `株価が${Math.abs(changeAmount)}円下降しました`;

        addLog(changeMessage); // 株価変動のログを追加

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

    const handleAttack = async (effectAmount) => {
        if (!chRef.current) return;

        const otherPlayers = Object.keys(allPlayers).filter(id => id !== clientId);
        
        if (otherPlayers.length >= 1 && !selectedTarget) {
            setError("❌ ターゲットを選択してください");
            setTimeout(() => setError(""), 3000);
            return;
        }

        const targetId = selectedTarget || otherPlayers[0];
        console.log("⚔️ 攻撃:", effectAmount, "ターゲット:", targetId);

        try {
            await chRef.current.publish("attack", {
                targetId,
                effectAmount,
                attackerId: clientId,
            });

            addLog(`✅ 攻撃成功！${allPlayers[targetId]?.name || targetId} の株を ${Math.abs(effectAmount)} 株減らしました`);
            setTimeout(() => setError(""), 3000);
        } catch (e) {
            console.error("❌ 攻撃送信失敗:", e);
            setError("攻撃の送信に失敗しました");
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

                {otherPlayers.length > 0 && (
                    <CardList 
                        onButtonClick={handleAttack}
                        selectedTarget={selectedTarget}
                        hasTargets={otherPlayers.length >= 1}
                    />
                )}
            </div>
            
            {/* 左サイドバー */}
            <SideBar
                side="left"
                open={isLeftSidebarOpen}
                onToggle={handleLeftSidebarToggle}
                width="300px"
                title="プレイヤー情報"
            >
                <div>プレイヤー情報やターゲット選択など</div>
            </SideBar>

            {/* 右サイドバー */}
            <SideBar
                side="right"
                open={isRightSidebarOpen}
                onToggle={handleRightSidebarToggle}
                width="300px"
                title="ログ / ユーザー一覧"
            >
                <Log log={logs} />
                <div style={{ fontWeight: 'bold', marginTop: '20px' }}>ユーザー一覧</div>
                <div>
                    {Object.values(allPlayers).map(player => (
                        <div key={player.name} style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>
                            {player.name} - 保有株: {player.holding}株
                        </div>
                    ))}
                </div>
            </SideBar>
        </div>
    );
};

export default Game;
