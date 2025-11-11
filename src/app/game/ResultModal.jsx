"use client";

import React, { useEffect } from "react";

export default function ResultModal({
  open,
  results = [],
  onClose,
  onRetry,
  onBack,
  autoBackMs = 20000, // 5秒後に自動でロビーへ
}) {
  useEffect(() => {
    if (!open || !autoBackMs) return;
    const id = setTimeout(() => onBack?.(), autoBackMs);
    return () => clearTimeout(id);
  }, [open, autoBackMs, onBack]);

  if (!open) return null;

  const sorted = [...results].sort((a, b) => b.score - a.score);
  const top = sorted[0] || {};
  const topScore = top.score ?? 0;
  const winners = sorted
    .filter((r) => r.score === topScore)
    .map((r) => r.name || r.playerId);

  return (
    <div style={overlay}>
      <div style={modal}>
        <h2 style={{ marginTop: 0 }}>試合結果</h2>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>
          勝者: {winners.join(", ")}（¥{topScore.toLocaleString()}）
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>順位</th>
              <th style={th}>名前</th>
              <th style={th}>所持金</th>
              <th style={th}>持ち株</th>
              <th style={th}>最終売価</th>
              <th style={th}>スコア</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={r.playerId || i}>
                <td style={td}>{i + 1}</td>
                <td style={td}>{r.name || r.playerId}</td>
                <td style={td}>¥{(r.money ?? 0).toLocaleString()}</td>
                <td style={td}>{r.holding ?? 0} 株</td>
                <td style={td}>¥{(r.price ?? 0).toLocaleString()}</td>
                <td style={{ ...td, fontWeight: 700 }}>
                  ¥{(r.score ?? 0).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={onBack} style={btn}>ロビーへ戻る</button>
          <button onClick={onRetry} style={btn}>同じルームで再戦</button>
        </div>

        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
          ※ {Math.round(autoBackMs / 1000)}秒後に自動でロビーへ戻ります
        </div>
      </div>
    </div>
  );
}

const overlay = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
  display: "grid", placeItems: "center", zIndex: 1000
};
const modal = {
  width: "min(720px, 92vw)", background: "#fff",
  borderRadius: 12, padding: 16, boxShadow: "0 10px 30px rgba(0,0,0,.25)"
};
const th = { textAlign: "left", borderBottom: "1px solid #eee", padding: "8px 6px" };
const td = { borderBottom: "1px solid #f3f3f3", padding: "8px 6px" };
const btn = { padding: "8px 12px", borderRadius: 8, border: "1px solid #111", background: "#111", color: "#fff", cursor: "pointer" };
const btnGhost = { padding: "8px 12px", borderRadius: 8, border: "1px solid #ccc", background: "#fff", cursor: "pointer" };
