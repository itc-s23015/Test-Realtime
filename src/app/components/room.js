import React from "react";
import { useRouter } from "next/navigation";
// import styles from "../styles/room.module.css";

const Room = () => {
    const router = useRouter();

    const handleCreateClick = () => {
        router.push("/create");
    };

    const handleJoinClick = () => {
        router.push("/join");
    };

    return (
        <div>
            <h1>ルーム番号</h1>
            <div>
                <button onClick={handleCreateClick}>
                    作成
                </button>
                <span>or</span>
                <button onClick={handleJoinClick}>
                    参加
                </button>
            </div>
        </div>
    );
};

export default Room;