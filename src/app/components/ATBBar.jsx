"use client";

import React from "react";

/** シンプルなATBゲージ表示 */
export default function ATBBar({ value = 0, max = 100, label = "ATB", height = 10 }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div style={{ background: "#111827", border: "1px solid #30363d", borderRadius: 8, padding: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, color: "#9ca3af", width: 36 }}>{label}</span>
        <div style={{ position: "relative", flex: 1, height }}>
          <div style={{ position: "absolute", inset: 0, background: "#1f2937", borderRadius: 6 }} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              width: `${pct}%`,
              background: "linear-gradient(90deg,#22c55e,#a3e635)",
              borderRadius: 6,
            }}
          />
        </div>
        <span style={{ fontSize: 12, color: "#e5e7eb", width: 52, textAlign: "right" }}>
          {Math.floor(value)}/{max}
        </span>
      </div>
    </div>
  );
}
