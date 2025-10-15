"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function generateRoomId(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 見分けづらい文字は除外
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");

  // 既存の名前があれば表示
  useEffect(() => {
    try {
      const prev = sessionStorage.getItem("playerName");
      if (prev) setName(prev);
    } catch {}
  }, []);

  const goCreate = () => {
    if (!name.trim()) {
      alert("プレイヤー名を入力してください");
      return;
    }
    sessionStorage.setItem("playerName", name.trim());
    router.push("/create");
  };

  const quickStart = () => {
    if (!name.trim()) {
      alert("プレイヤー名を入力してください");
      return;
    }
    sessionStorage.setItem("playerName", name.trim());
    const room = generateRoomId();
    router.push(`/game?room=${room}`);
  };

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Stock Field — ホーム</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>

        プレイヤー名を入力して、ルームを作成またはクイックスタートしてください。
      </p>

      <label style={{ display: "block", fontWeight: 600 }}>プレイヤー名</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="あなたの名前"
        style={{
          width: "100%",
          padding: "12px 14px",
          borderRadius: 10,
          border: "1px solid #ddd",
          marginTop: 6,
          marginBottom: 16,
        }}
      />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button onClick={goCreate} style={btnPrimary}>ルーム作成へ</button>
        <button onClick={quickStart} style={btnGhost}>クイックスタート</button>
      </div>
    </main>
  );
}

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