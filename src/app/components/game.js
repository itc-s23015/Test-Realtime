"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import socket from "../socket";
import StockChart from "../components/StockChart";
import PlayerInfo from "../components/PlayerInfo";
import ControlButtons from "../components/ControlButtons";
import CardList from "./card";

const Game = () => {
    const [roomNumber, setRoomNumber] = useState(null);
    const [error, setError] = useState("");
    const [stockData, setStockData] = useState([]);
    const [money, setMoney] = useState(null);
    const [holding, setHolding] = useState(null);
    const [allPlayers, setAllPlayers] = useState({}); // 全プレイヤーの情報
    const [selectedTarget, setSelectedTarget] = useState(null); // 選択されたターゲット
    const router = useRouter();

    // Socket.io接続設定
    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        const room = query.get("room");

        if (!room) {
            setError("ルーム番号が指定されていません");
            router.push("/");
            return;
        }

        console.log("ゲーム画面: 部屋番号", room);
        setRoomNumber(room);

        if (!socket.connected) {
            console.log("Socket接続開始...");
            socket.connect();
        } else {
            console.log("Socket既に接続済み");
        }

        console.log("joinGameRoomを送信:", room);
        socket.emit("joinGameRoom", room);

        // 初期株価データと所持金を受信
        socket.on("initialStockData", (data) => {
            console.log("✅ 初期データを受信");
            console.log("受信したデータ:", data);
            console.log("株価データ:", data.stockData?.length, "件");
            console.log("所持金:", data.money);
            console.log("保有株数:", data.holding);
            
            if (data.stockData) {
                setStockData(data.stockData);
            }
            if (data.money !== undefined && data.money !== null) {
                setMoney(data.money);
                console.log("✅ 所持金を設定:", data.money);
            } else {
                console.error("❌ 所持金がundefinedまたはnull");
            }

            if (data.holding !== undefined && data.holding !== null) {
                setHolding(data.holding);
                console.log("✅ 保有株数を設定:", data.holding);
            } else {
                console.error("❌ 保有株数がundefinedまたはnull");
            }
        });

        // 株価データの更新を受信
        socket.on("stockDataUpdated", (data) => {
            const updateType = data.isAuto ? "🤖 自動変動" : "👤 手動変動";
            console.log(`✅ 株価データ更新 [${updateType}]`);
            if (data.changeAmount) {
                console.log(`変動額: ${data.changeAmount > 0 ? '+' : ''}${data.changeAmount}`);
            }
            setStockData([...data.stockData]);
        });

        // 保有株数更新を受信
        socket.on('holdingsUpdated', (data) => {
            console.log("✅ 保有株数更新を受信:", data);
            setHolding(data.holding);

            if (data.message) {
                setError(data.message);
                setTimeout(() => setError(""), 3000);
            }
        });

        // 全プレイヤーの情報更新
        socket.on('allPlayersUpdate', (data) => {
            console.log("✅ 全プレイヤー情報更新:", data);
            setAllPlayers(data.holdings);
        });

        // 攻撃成功
        socket.on('attackSuccess', (data) => {
            console.log("✅ 攻撃成功:", data);
            if (data.message) {
                setError(`✅ ${data.message}`);
                setTimeout(() => setError(""), 3000);
            }
        });

        // 攻撃失敗
        socket.on('attackFailed', (data) => {
            console.log("❌ 攻撃失敗:", data);
            if (data.message) {
                setError(`❌ ${data.message}`);
                setTimeout(() => setError(""), 3000);
            }
        });

        socket.on("opponentDisconnected", () => {
            setError("対戦相手が切断しました");
        });

        socket.on("connect_error", (err) => {
            console.error("❌ 接続エラー:", err);
            setError("サーバーへの接続に失敗しました");
        });

        return () => {
            console.log("クリーンアップ: イベントリスナー削除");
            socket.off("initialStockData");
            socket.off("stockDataUpdated");
            socket.off("holdingsUpdated");
            socket.off("allPlayersUpdate");
            socket.off("attackSuccess");
            socket.off("attackFailed");
            socket.off("opponentDisconnected");
            socket.off("connect_error");
        };
    }, [router]);

    // 株価変動ボタンクリック処理
    const handleButtonClick = (changeAmount) => {
        console.log("🔘 ボタンクリック:", changeAmount);
        
        if (socket.connected && roomNumber) {
            const payload = {
                roomNumber: roomNumber,
                changeAmount: changeAmount
            };
            console.log("📤 changeStockPrice送信:", payload);
            
            socket.emit("changeStockPrice", payload);
            console.log(`✅ リクエスト送信完了`);
        } else {
            console.error("❌ 送信失敗");
            setError("接続が確立されていません");
        }
    };

    // 攻撃ボタンの処理
    const handleAttack = (effectAmount) => {
        console.log("⚔️ 攻撃ボタン:", effectAmount, "ターゲット:", selectedTarget);
        
        // ターゲット選択必須（2人以上の場合）
        const otherPlayers = Object.keys(allPlayers).filter(id => id !== socket.id);
        if (otherPlayers.length >= 1 && !selectedTarget) {
            setError(`❌ ターゲットを選択してください`);
            setTimeout(() => setError(""), 3000);
            return;
        }
        
        if (socket.connected && roomNumber) {
            const payload = {
                roomNumber: roomNumber,
                effectAmount: effectAmount,
                targetId: selectedTarget // ターゲットIDを送信
            };
            console.log("📤 attackPlayer送信:", payload);
            socket.emit("attackPlayer", payload);
            console.log("✅ リクエスト送信完了");
        } else {
            console.error("❌ 送信失敗");
            setError("接続が確立されていません");
        }
    };

    // ターゲット選択
    const handleTargetSelect = (targetId) => {
        setSelectedTarget(targetId);
        console.log("🎯 ターゲット選択:", targetId);
    };

    // 他のプレイヤーのリスト取得
    const otherPlayers = Object.keys(allPlayers)
        .filter(id => id !== socket.id)
        .map(id => ({ id, holding: allPlayers[id] }));

    return (
        <div style={{ 
            width: '100%', 
            minHeight: '100vh', 
            backgroundColor: '#f9fafb', 
            padding: '32px' 
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <h1 style={{ 
                    textAlign: 'center', 
                    marginBottom: '24px', 
                    fontSize: '32px', 
                    fontWeight: 'bold',
                    color: '#111827'
                }}>
                    株価ゲーム 📈
                </h1>

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
                            🎯 ターゲット選択 (必須)
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
                                        👤 プレイヤー {index + 1}
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
                <ControlButtons onButtonClick={handleButtonClick} />

                {/* 攻撃ボタン */}
                <CardList 
                    onButtonClick={handleAttack}
                    selectedTarget={selectedTarget}
                    hasTargets={otherPlayers.length >= 1}
                />
            </div>
        </div>
    );
};

export default Game;