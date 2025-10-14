"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import socket from "../socket";
import StockChart from "../components/StockChart";
import PlayerInfo from "../components/PlayerInfo";
import ControlButtons from "../components/ControlButtons";
import CardList from "../components/card";

const Game = () => {
    const [roomNumber, setRoomNumber] = useState(null);
    const [error, setError] = useState("");
    const [stockData, setStockData] = useState([]);
    const [money, setMoney] = useState(null);
    const [holding, setHolding] = useState(null);
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
            console.log("所持金の型:", typeof data.money);
            console.log("保有株数の型:", typeof data.holding);
            
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
            socket.off("opponentDisconnected");
            socket.off("connect_error");
        };

        // 保有株数更新を受信
        socket.on('hodlingsUpdated', (data) => {
            console.log("✅ 保有株数更新を受信:", data);
            setHolding(data.holding);

            if (data.message) {
                setError(data.message);
                setTimeout(() => setError(""), 3000);
            }
        });

        // カード使用通知を受信
        socket.on('cardUsed', (data) => {
        });

        return () => {
            socket.off('hodlingsUpdated');
            socket.off('cardUsed'); 
        }

    }, [router]);

    // ボタンクリック処理(test)
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

    // カードの効果(test)
    const handleCardEffect = (effectAmount) => {
        console.log("🃏 カード効果発動:", effectAmount);
        // ここにカード効果の処理を追加
        if (socket.connected && roomNumber) {
            const payload = {
                roomNumber: roomNumber,
                effectAmount: effectAmount
            };
            console.log("📤 useCard送信:", payload)
            socket.emit("useCard", payload);
            console.log("✅ リクエスト送信完了");
        } else {
            console.error("❌ 送信失敗");
            setError("接続が確立されていません");
        }
    };

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
                        color: '#dc2626',
                        marginBottom: '20px',
                        padding: '16px',
                        backgroundColor: '#fee2e2',
                        borderRadius: '12px',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        border: '2px solid #dc2626'
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                {/* プレイヤー情報 */}
                {roomNumber && money !== null && holding !== null &&(
                    <PlayerInfo money={money} holding={holding} roomNumber={roomNumber} />
                )}

                {/* 株価チャート */}
                {stockData.length > 0 && (
                    <StockChart stockData={stockData} />
                )}

                {/* コントロールボタン */}
                <ControlButtons onButtonClick={handleButtonClick} />

                {/* カードコンポーネント */}
                <CardList onButtonClick={handleCardEffect} />
            </div>
        </div>
    );
};

export default Game;