// app/components/RightUserList.jsx
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

  const fmtYen = (n) =>
    typeof n === "number" ? `¥${n.toLocaleString("ja-JP")}` : "¥0";

  return (
    <div
      style={{
        display: "grid",
        gap: 10,
        gridAutoRows: "minmax(72px, auto)", // ⬅ 少し縦にゆったり
      }}
    >
      {others.map((p) => {
        const isSel = selectedTarget === p.id;
        return (
          <div
            key={p.id}
            onClick={() => onSelect(p.id)}
            style={{
              padding: 12,                     // ⬅ 以前よりやや広め
              borderRadius: 12,
              border: isSel ? "2px solid #3b82f6" : "1px solid #e5e7eb",
              background: isSel ? "#e5f0ff" : "#fff",
              cursor: "pointer",
              transition: "all .15s",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {/* 1行目：名前 */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>👤 {p.name}</div>
              <div
                style={{
                  marginLeft: "auto",
                  fontSize: 12,
                  opacity: 0.7,
                }}
              >
                ID: {p.id.slice(0, 6)}
              </div>
            </div>

            {/* 2行目：所持金＆保有株 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                fontSize: 13,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  background: isSel ? "#dfeaff" : "#f7f7f8",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: "8px 10px",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ opacity: 0.7 }}>所持金</span>
                <strong>{fmtYen(p.money)}</strong>
              </div>
              <div
                style={{
                  background: isSel ? "#dfeaff" : "#f7f7f8",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: "8px 10px",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ opacity: 0.7 }}>保有株</span>
                <strong>{p.holding ?? 0} 株</strong>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
