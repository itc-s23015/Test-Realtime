"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";
// import Logo from "../app/components/Logo";
// import ThemeToggle from "./components/ThemeToggle";

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
    router.push(`/lobby?room=${encodeURIComponent(r)}`);
  };

  return (
  <div className="homeBackground">{/* ← 背景をここに適用 */}
    <main style={pageWrap}>
      <div style={card}>
        {/* 必要ならここにロゴ等 */}
        {/* <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:12}}>
          <Logo />
          <ThemeToggle />
        </div> */}

        <h1 style={title}>StockField</h1>
        <p style={subtitle}>プレイヤー名を入力して、ルームを作成 or 参加してください。</p>

        <div style={{ display: "grid", gap: 16, marginTop: 18 }}>
          <div>
            <label style={label}>プレイヤー名</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="あなたの名前"
              style={input}
            />
          </div>

          <div>
            <label style={label}>ルームID（参加する場合）</label>
            <input
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              placeholder="ABC123"
              style={input}
            />
          </div>

          {/* メインボタン */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button onClick={goCreate} style={btnPrimary}>ルーム作成へ</button>
            <button onClick={joinRoom} style={btnGhost}>ルームに参加</button>
          </div>

          {/* 下のメニュー */}
          <div style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button onClick={() => router.push("/how-to-play")} style={btnGhost}>
              遊び方 / How to Play
            </button>
            <button onClick={() => router.push("/card-list")} style={btnGhost}>
              カード図鑑 / Card List
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
  );
}

/** ===== CreateRoomPage と同じ配色 ===== */
const pageWrap: CSSProperties = {
  maxWidth: 720,
  margin: "40px auto",
  padding: 16,
};

const card: CSSProperties = {
  padding: 20,
  borderRadius: 18,
  background: "rgba(0,0,0,0.35)",
  border: "1px solid rgba(255,255,255,0.18)",
  boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
};

const title: CSSProperties = {
  fontSize: 30,
  marginBottom: 8,
  color: "#fff",
  fontWeight: 900,
  letterSpacing: 0.5,
};

const subtitle: CSSProperties = {
  color: "rgba(255,255,255,0.75)",
  marginBottom: 12,
};

const label: CSSProperties = {
  display: "block",
  fontWeight: 700,
  color: "rgba(255,255,255,0.9)",
};

const input: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.22)",
  marginTop: 8,
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  outline: "none",
};

const btnBase: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 12,
  cursor: "pointer",
  backgroundColor: "transparent",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.25)",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
};

const btnPrimary: CSSProperties = {
  ...btnBase,
  border: "1px solid rgba(255, 215, 0, 0.7)",
  color: "#FFD54A",
  fontWeight: 800,
};

const btnGhost: CSSProperties = {
  ...btnBase,
  color: "rgba(255,255,255,0.92)",
};
