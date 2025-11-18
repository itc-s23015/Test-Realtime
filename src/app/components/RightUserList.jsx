"use client";

import React from "react";

export default function RightUserList({
  meId,
  players,                // { [id]: {name, money, holding} }
  selectedTarget,
  onSelect,               // (id|null) => void
}) {
  const list = Object.entries(players)
    .map(([id, p]) => ({ id, ...p }))
    .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));

  if (list.length === 0) {
    return <div style={{ opacity: 0.6, fontSize: 12 }}>プレイヤーがいません</div>;
  }

  const handleClick = (id) => {
    // もう一度クリックで解除（任意）
    onSelect(id === selectedTarget ? null : id);
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {list.map((p) => {
        const isMe  = p.id === meId;
        const isSel = selectedTarget === p.id;
        return (
          <div
            key={p.id}
            onClick={() => handleClick(p.id)}
            style={{
              padding: "14px 12px",              // 少し上下を広く
              borderRadius: 12,
              border: isSel ? "2px solid #3b82f6" : "1px solid #e5e7eb",
              background: isSel ? "#e8f1ff" : "#fff",
              cursor: "pointer",
              transition: "all .15s",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <div style={{ fontWeight: 700 }}>
                👤 {p.name || p.id}{isMe ? "（自分）" : ""}
              </div>
              <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.75 }}>
                保有株: {p.holding ?? 0} 株
              </div>
            </div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
              所持金: ¥{Number(p.money ?? 0).toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}
