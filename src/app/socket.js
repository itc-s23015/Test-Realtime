import { io } from "socket.io-client";

// ソケットインスタンスを作成してエクスポート
const socket = io("http://localhost:4000", {
    autoConnect: false, // 初期では接続しない
});

export default socket;