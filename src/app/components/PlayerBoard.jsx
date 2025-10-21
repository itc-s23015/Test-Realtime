import React from "react";

const count = (arr) => (Array.isArray(arr) ? arr.length : 0);
const pct = (v) => Math.max(0, Math.min(100, Number.isFinite(v) ? v : 0));

const fmtPrice = (v) => `¥${(Number(v) || 0).toFixed(2)}`;
const fmtYen = (v) => `¥${Math.round(Number(v) || 0).toLocaleString()}`;

export default function PlayerBoard({ p = {}, price = 0 }) {
  const name = p?.name ?? "P";
  const cash = p?.cash ?? 0;
  const holdings = p?.holdings ?? 0;
  const atb = pct(p?.atb ?? 0);

  const handLen = count(p?.hand);
  const deckLen = count(p?.deck);
  const discardLen = count(p?.discard);

  const value = Math.round(cash + holdings * (price ?? 0));
  const guard = p?.guard ?? 0;
  const slowActive = Boolean(p?._slowUntil);
  const discountActive = Boolean(p?._discountUntil);

  return (
    <div
      style={{
        background: "#1a1a1a",
        border: "1px solid #2a2a2a",
        borderRadius: 12,
        padding: 12,
        color: "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <b>{name}</b>
        <div style={{ fontSize: 12, opacity: 0.9 }}>
          Cash: {fmtYen(cash)}　Holdings: {holdings}　Value: {fmtYen(value)}
        </div>
      </div>

      {/* ATB bar */}
      <div
        style={{
          background: "#0b0b0b",
          border: "1px solid #333",
          borderRadius: 8,
          height: 10,
          overflow: "hidden",
          marginBottom: 6,
        }}
      >
        <div
          style={{
            width: `${atb}%`,
            height: "100%",
            background: "#00e676",
            transition: "width 80ms linear",
          }}
        />
      </div>

      <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
        Guard: {guard} / Slow: {slowActive ? 1 : 0} / Discount:{" "}
        {discountActive ? 1 : 0}
      </div>

      <div style={{ display: "flex", gap: 12, fontSize: 12, opacity: 0.9 }}>
        <span>Hand: {handLen}</span>
        <span>Deck: {deckLen}</span>
        <span>Discard: {discardLen}</span>
      </div>
    </div>
  );
}
