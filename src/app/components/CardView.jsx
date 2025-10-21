import React, { useState } from "react";

// シンプルなカード表示（ホバーで説明ツールチップ）
export default function CardView({ card, disabled, onClick }) {
  const [hover, setHover] = useState(false);

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 180,
        height: 96,
        padding: 8,
        borderRadius: 10,
        background: disabled ? "#161616" : "#1f1f1f",
        border: "1px solid #2a2a2a",
        color: "#fff",
        cursor: disabled ? "not-allowed" : "pointer",
        position: "relative",
      }}
    >
      <div style={{ fontSize: 11, opacity: 0.75 }}>{card.kind}</div>
      <div style={{ fontWeight: 700, marginTop: 2 }}>{card.title}</div>
      <div
        style={{
          fontSize: 12,
          opacity: 0.9,
          marginTop: 6,
          lineHeight: 1.3,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {card.desc}
      </div>

      {/* ツールチップ */}
      {hover && (
        <div
          style={{
            position: "absolute",
            zIndex: 10,
            top: "100%",
            left: 0,
            marginTop: 6,
            width: 260,
            background: "#0f0f0f",
            border: "1px solid #2a2a2a",
            borderRadius: 10,
            padding: 10,
            boxShadow: "0 6px 18px rgba(0,0,0,.35)",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{card.title}</div>
          <div style={{ fontSize: 12, opacity: 0.9, whiteSpace: "pre-wrap" }}>
            {card.desc}
          </div>
        </div>
      )}
    </div>
  );
}
