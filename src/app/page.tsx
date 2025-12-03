"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "../app/components/Logo";
import ThemeToggle from "./components/ThemeToggle";


export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");

  useEffect(() => {
    try {
      const prev = sessionStorage.getItem("playerName");
      if (prev) setName(prev);
    } catch {}
  }, []);

  const goCreate = () => {
    const n = name.trim();
    if (!n) return alert("プレイヤー名を入力してください");
    sessionStorage.setItem("playerName", n);
    router.push("/create");
  };

  const joinRoom = () => {
    const n = name.trim();
    const r = roomId.trim().toUpperCase();
    if (!n) return alert("プレイヤー名を入力してください");
    if (!r) return alert("ルームIDを入力してください");
    sessionStorage.setItem("playerName", n);
    router.push(`/lobby?room=${encodeURIComponent(r)}`); // ← ロビーへ
  };

  return (
    
    <main className="pageContainer"style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>

  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
    <ThemeToggle />
  </div>
          <header style={{ display: "flex", alignItems: "center", gap: 12, padding: 12 }}>
      <Logo variant="full" size={28} />
      {/* ダーク背景なら <Logo variant="full" size={28} dark /> */}
    </header>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Stock Field — ホーム</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>
        プレイヤー名を入力して、ルームを作成するか既存のルームに参加してください。
      </p>

      <label style={{ display: "block", fontWeight: 600 }}>プレイヤー名</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="あなたの名前"
        style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #ddd", marginTop: 6, marginBottom: 16 }}
         />

      <label style={{ display: "block", fontWeight: 600 }}>ルームID</label>
      <input
        value={roomId}
        onChange={(e) => setRoomId(e.target.value.toUpperCase())}
        placeholder="ABC123"
        style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #ddd", marginTop: 6, marginBottom: 16, letterSpacing: 1, textTransform: "uppercase" }}
      />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button onClick={goCreate} style={btnPrimary}>ルーム作成へ</button>
        <button onClick={joinRoom} style={btnGhost}>ルームに参加</button>
      </div>
      <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
  <button onClick={() => router.push("/how-to-play")} style={btnGhost}>
    遊び方 / How to Play
  </button>
  <button onClick={() => router.push("/card-list")} style={btnGhost}>
    カード図鑑 / Card List
  </button>
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