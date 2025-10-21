"use client";

import React from "react";

export type LobbyPlayer = {
  id: string;
  name: string;
  ready: boolean;
  host?: boolean;
};

type Props = {
  roomId: string;
  nickname?: string;              // 表示用（任意）
  players: LobbyPlayer[];         // 参加者
  isHost: boolean;                // 自分がホストか
  isFull?: boolean;               // 満員表示用（任意）
  capacity?: number;              // デフォルト4
  onToggleReady: () => void | Promise<void>;
  onStart: () => void | Promise<void>;
  onLeave: () => void | Promise<void>;
  onCopyInvite?: () => void | Promise<void>;  // 任意
};

export default function LobbyView({
  roomId,
  nickname,
  players,
  isHost,
  isFull = false,
  capacity = 4,
  onToggleReady,
  onStart,
  onLeave,
  onCopyInvite,
}: Props) {
  const readyCount = players.filter((p) => p.ready).length;
  const canStart =
    isHost && players.length >= 2 && players.every((p) => p.ready || p.host);

  // 空席をスロットとして表示（左詰め）
  const slots: (LobbyPlayer | undefined)[] = Array.from(
    { length: capacity },
    (_, i) => players[i]
  );

  return (
    <div style={wrap}>
      <header style={header}>
        <h2 style={{ margin: 0 }}>ロビー</h2>
        <div style={{ marginLeft: "auto", opacity: 0.85 }}>
          ルームID: <b>{roomId}</b>
        </div>
      </header>

      {isFull && (
        <div style={alertBox}>
          このルームは現在 <b>{capacity}/{capacity}</b> で満員です。
        </div>
      )}

      <section style={panel}>
        <div style={panelHeader}>
          <div style={{ fontWeight: 700 }}>参加者（最大 {capacity} 人）</div>
          <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.8 }}>
            準備OK: {readyCount}/{players.length}
          </div>
        </div>

        <div style={grid2}>
          {slots.map((p, i) => (
            <div key={i} style={memberCard}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 9999,
                  background: p ? (p.ready ? "#10b981" : "#666") : "#333",
                }}
              />
              <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis" }}>
                {p ? p.name : `空席 ${i + 1}`}
              </div>
              {p?.host && <span style={{ marginLeft: 6 }}>👑</span>}
              <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.8 }}>
                {p ? (p.ready ? "Ready" : "待機中") : "—"}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {onCopyInvite && (
            <button onClick={onCopyInvite} style={btn}>
              招待リンクをコピー
            </button>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button onClick={onToggleReady} style={btn}>
              準備OK / 解除
            </button>
            <button
              onClick={onStart}
              disabled={!canStart}
              style={{ ...btn, background: canStart ? "#3b82f6" : "#2a2f3b" }}
            >
              開始（ホスト）
            </button>
            <button onClick={onLeave} style={btnGhost}>
              退出
            </button>
          </div>
        </div>
      </section>

      {nickname && (
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
          あなた: <b>{nickname}</b> {isHost ? "(HOST)" : ""}
        </div>
      )}
    </div>
  );
}

/* ============ styles (inline) ============ */
const wrap: React.CSSProperties = {
  maxWidth: 900,
  margin: "32px auto",
  padding: 16,
};

const header: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 16,
};

const alertBox: React.CSSProperties = {
  background: "#ffffffff",
  border: "1px solid #5a2f2f",
  color: "#ffd2d2",
  borderRadius: 10,
  padding: 10,
  marginBottom: 12,
};

const panel: React.CSSProperties = {
  background: "#72c72dff",
  border: "1px solid #222",
  borderRadius: 12,
  padding: 12,
};

const panelHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 12,
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const memberCard: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "#c3a1d3ff",
  border: "1px solid #222",
  borderRadius: 10,
  padding: 10,
  minHeight: 56,
};

const btn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #b89ee0ff",
  background: "#1a1a1a",
  color: "#fff",
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  ...btn,
  background: "transparent",
};
