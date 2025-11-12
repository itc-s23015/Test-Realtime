"use client";

import React from "react";

export default function RightUserList({
  meId,
  players,                // { [id]: {name, money, holding} }
  selectedTarget,
  onSelect,               // (id) => void
}) {
  const others = Object.entries(players)
    .filter(([id]) => id !== meId)
    .map(([id, p]) => ({ id, ...p }));

  if (others.length === 0) {
    return <div style={{ opacity: 0.6, fontSize: 12 }}>他のプレイヤーがいません</div>;
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {others.map((p) => {
        const isSel = selectedTarget === p.id;
        return (
          <div
            key={p.id}
            onClick={() => onSelect(p.id)}
            style={{
              padding: 10,
              borderRadius: 10,
              border: isSel ? "2px solid #3b82f6" : "1px solid #e5e7eb",
              background: isSel ? "#e5f0ff" : "#fff",
              cursor: "pointer",
              transition: "all .15s",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <div style={{ fontWeight: 700 }}>👤 {p.name}</div>
              <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.7 }}>
                保有株: {p.holding} 株
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
