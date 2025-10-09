"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import socket from "../socket"; // グローバルソケットをインポート
// import styles from "../styles/wait.module.css";

const WaitUI = () => {
    const [foundOpponent, setFoundOpponent] = useState(false);
    const [roomNumber, setRoomNumber] = useState(null);
    const [error, setError] = useState(""); // エラーメッセージ
    const router = useRouter();

    useEffect(() => {
        // URLクエリからルーム番号を取得
        const query = new URLSearchParams(window.location.search);
        const room = query.get("room");

        if (room) {
            setRoomNumber(room);
            if (!socket.connected) {
                socket.connect(); // ソケット接続を確立
            }

            // 待機状態を伝える
            socket.emit("ready", room);

            // 対戦相手が見つかったときの処理
            socket.on("opponentFound", () => {
                setFoundOpponent(true);

                setTimeout(() => {
                    router.push(`/game?room=${room}`);
                }, 2000)
            });

            // ソケット接続エラー
            socket.on("connect_error", () => {
                setError("サーバーへの接続に失敗しました。");
            });

            // クリーンアップ
            return () => {
                socket.off("ready");
                socket.off("opponentFound");
                socket.off("connect_error");
            };
        }}, [router]);

    return (
        <div>
            {error ? (
                <div>{error}</div>
            ) : foundOpponent ? (
                <div>対戦相手が見つかりました！</div>
            ) : (
                <div>
                    待機中...
                    {roomNumber && (
                        <div>ルーム番号: {roomNumber}</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default WaitUI;