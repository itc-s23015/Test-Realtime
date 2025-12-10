"use client";

import { useEffect, useState, type CSSProperties } from "react";
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
    setRoom((r) => r || generateRoomId());
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

  const goLobby = () => {
    const n = name.trim();
    const r = room.trim().toUpperCase();
    if (!n) return alert("プレイヤー名を入力してください");
    if (!r) return alert("ルームIDを入力してください");
    sessionStorage.setItem("playerName", n);
    router.push(`/lobby?room=${encodeURIComponent(r)}`);
  };

  return (
        <div className="homeBackground">{/* ← 背景をここに適用 */}

    <main style={pageWrap}>
      <div style={card}>
        <h1 style={{ fontSize: 28, marginBottom: 12, color: "#fff" }}>ルーム作成</h1>
        <p style={{ color: "rgba(255,255,255,0.75)", marginBottom: 24 }}>
          ルームIDを配って、相手にも同じIDで入ってもらってください。
        </p>

        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>
              プレイヤー名
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="あなたの名前"
              style={input}
            />
          </div>

          <div>
            <label style={{ display: "block", fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>
              ルームID
            </label>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                value={room}
                onChange={(e) => setRoom(e.target.value.toUpperCase())}
                placeholder="ABC123"
                style={{ ...input, flex: 1, minWidth: 220 }}
              />
              <button onClick={copy} style={btnGhost}>コピー</button>
              <button onClick={refresh} style={btnGhost}>再採番</button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
            <button onClick={() => history.back()} style={btnGhost}>戻る</button>
            <button onClick={goLobby} style={btnPrimary}>このルームのロビーへ</button>
          </div>
        </div>
      </div>
    </main>
    </div>
  );
}

/** ===== 背景 & カード ===== */
const pageWrap: CSSProperties = {
  maxWidth: 720,
  margin: "40px auto",
  padding: 16,
};

const card: CSSProperties = {
  padding: 20,
  borderRadius: 18,
  background: "rgba(0,0,0,0.35)",                 // ← 透過背景
  border: "1px solid rgba(255,255,255,0.18)",
  boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
  backdropFilter: "blur(10px)",                   // ← ガラス感
  WebkitBackdropFilter: "blur(10px)",
};

/** ===== 入力（透過） ===== */
const input: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.22)",
  marginTop: 8,
  background: "rgba(255,255,255,0.06)",           // ← 透過
  color: "#fff",
  outline: "none",
};

/** ===== ボタン（透過） ===== */
const btnBase: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 12,
  cursor: "pointer",
  backgroundColor: "transparent",                 // ← 透過
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
