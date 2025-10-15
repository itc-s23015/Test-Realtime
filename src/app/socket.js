// src/socket.js
import { io } from "socket.io-client";

// 開発: http://localhost:4000
// 本番: 例) https://your-socket-host.onrender.com
const URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

const socket = io(URL, {
  autoConnect: false,
  transports: ["websocket"], // プロキシ越え安定
});

// デバッグ用（接続状態が追える）
socket.on("connect", () => console.log("[socket] connected:", socket.id));
socket.on("disconnect", (r) => console.log("[socket] disconnected:", r));
socket.on("connect_error", (e) => console.log("[socket] connect_error:", e?.message));

export default socket;
