"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import socket from "../socket"; // グローバルソケットインスタンスをインポート
// import styles from "../styles/joinRoom.module.css";

const JoinRoom = () => {
    const [roomNumber, setRoomNumber] = useState("");
    const [error, setError] = useState(""); // エラーメッセージの状態
    const router = useRouter();

    useEffect(() => {
        if (!socket.connected) {
            socket.connect(); // ソケット接続を確立
        }

        // ソケット接続エラーを監視
        socket.on("connect_error", () => {
            setError("サーバーへの接続に失敗しました。");
        });

        // クリーンアップ
        return () => {
            socket.off("connect_error");
        };
    }, []);

    const handleJoinClick = () => {
        if (/^\d{3}$/.test(roomNumber)) {
            if (socket.connected) {
                // 部屋に参加
                socket.emit("joinRoom", roomNumber, (response) => {
                    if (response.success) {
                        router.push(`/wait?room=${roomNumber}`); // `page.js` に遷移
                    } else {
                        setError(response.message || "ルーム参加に失敗しました。");
                    }
                });
            } else {
                setError("ソケット接続が確立されていません。");
            }
        } else {
            setError("ルーム番号は3桁の数字で入力してください。");
        }
    };

    return (
        <div>
            <h1>ルーム番号を入力して下さい！</h1>
            <div>
                <input
                    type="text"
                    placeholder="777.."
                    className={""}
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                />
                <button onClick={handleJoinClick}>
                    参加
                </button>
            </div>
            {error && <div>{error}</div>} {/* エラーメッセージの表示 */}
        </div>
    );
};

export default JoinRoom;