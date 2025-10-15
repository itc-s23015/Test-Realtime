"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function generateRoomId(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function CreateRoomPage() {
  const router = useRouter();
  const [room, setRoom] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    // 初回のみ自動採番 & 既存の名前ロード
    setRoom((r) => (r || generateRoomId()));
    try {
      const prev = sessionStorage.getItem("playerName");
      if (prev) setName(prev);
    } catch {}
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(room);
      alert("ルームIDをコピーしました");
    } catch {
      alert("コピーに失敗しました");
    }
  };

  const refresh = () => setRoom(generateRoomId());

  const start = () => {
    if (!name.trim()) {
      alert("プレイヤー名を入力してください");
      return;

    }
    if (!room.trim()) {
      alert("ルームIDを入力してください");
      return;
    }
    sessionStorage.setItem("playerName", name.trim());
    router.push(`/game?room=${room.trim()}`);
  };

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>ルーム作成</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>
        ルームIDを配って、相手にも同じIDで入ってもらってください。
      </p>

      <div style={{ display: "grid", gap: 16 }}>
        <div>
          <label style={{ display: "block", fontWeight: 600 }}>プレイヤー名</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="あなたの名前"
            style={input}
          />
        </div>

        <div>
          <label style={{ display: "block", fontWeight: 600 }}>ルームID</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={room}
              onChange={(e) => setRoom(e.target.value.toUpperCase())}
              placeholder="ABC123"
              style={{ ...input, flex: 1 }}
            />
            <button onClick={copy} style={btnGhost}>コピー</button>
            <button onClick={refresh} style={btnGhost}>再採番</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button onClick={() => history.back()} style={btnGhost}>戻る</button>
          <button onClick={start} style={btnPrimary}>このルームで開始</button>
        </div>
      </div>
    </main>
  );
}

const input: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #ddd",
  marginTop: 6,
};

const btnPrimary: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid #111",
  background: "#111",
  color: "#fff",
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
};