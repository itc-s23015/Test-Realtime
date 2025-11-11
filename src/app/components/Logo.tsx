"use client";

type Props = {
  variant?: "full" | "mark"; // full: アイコン+文字, mark: アイコンのみ
  size?: number;              // 高さ(px)
  dark?: boolean;             // ダーク背景用配色
};

export default function Logo({ variant = "full", size = 28, dark = false }: Props) {
  const textColor = dark ? "#ffffff" : "#111827"; // gray-900
  const strokeColor = dark ? "#e5e7eb" : "#111827"; // line/chart色
  const cardFill = dark ? "#0f172a" : "#ffffff"; // cardベース
  const cardStroke = dark ? "#334155" : "#e5e7eb"; // card枠

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10, lineHeight: 1 }}>
      {/* ============ MARK ============ */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        aria-label="Stock Field logo"
        role="img"
      >
        {/* カード（角丸） */}
        <rect x="6" y="6" rx="10" ry="10" width="52" height="52"
              fill={cardFill} stroke={cardStroke} strokeWidth="2" />
        {/* 右肩上がりのチャートライン */}
        <path d="M14 42 L26 34 L36 38 L50 24" fill="none" stroke={strokeColor} strokeWidth="3" strokeLinecap="round"/>
        {/* ピークに小さな星（スパーク） */}
        <path d="M50 20 l2 4 l4 2 l-4 2 l-2 4 l-2-4 l-4-2 l4-2z"
              fill={dark ? "#22c55e" : "#10b981"} opacity="0.9" />
        {/* 緑の陽線キャンドル */}
        <line x1="22" y1="22" x2="22" y2="46" stroke="#10b981" strokeWidth="2"/>
        <rect x="18" y="28" width="8" height="12" rx="2" fill="#10b981"/>
        {/* 赤の陰線キャンドル */}
        <line x1="40" y1="18" x2="40" y2="40" stroke="#ef4444" strokeWidth="2"/>
        <rect x="36" y="24" width="8" height="10" rx="2" fill="#ef4444"/>
      </svg>

      {/* ============ WORDMARK ============ */}
      {variant === "full" && (
        <div style={{ display: "inline-flex", alignItems: "baseline", gap: 8 }}>
          <span style={{
            fontWeight: 800,
            fontSize: Math.round(size * 0.9),
            color: textColor,
            letterSpacing: 0.2
          }}>
            Stock
          </span>
          <span style={{
            fontWeight: 700,
            fontSize: Math.round(size * 0.9),
            color: dark ? "#9ca3af" : "#374151" // gray-500/700
          }}>
            Field
          </span>
        </div>
      )}
    </div>
  );
}
