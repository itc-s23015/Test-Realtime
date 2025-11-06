import React, { useState } from "react";
import { CARD_DEFINITIONS, RARITY_META } from "./cardDefinitions";

// カード表示コンポーネント（画像対応）
export default function CardView({ card, disabled, onClick }) {
  const [hover, setHover] = useState(false);
  const [imageError, setImageError] = useState(false);

  // カード定義から詳細を取得
  const cardDef = CARD_DEFINITIONS[card.id];
  if (!cardDef) return null;

  const rarityInfo = RARITY_META[cardDef.rarity] || RARITY_META.NORMAL;

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 180,
        height: 240,
        borderRadius: 12,
        background: disabled ? "#2a2a2a" : "#1f1f1f",
        border: `2px solid ${disabled ? "#3a3a3a" : rarityInfo.backgroudColor}`,
        color: "#fff",
        cursor: disabled ? "not-allowed" : "pointer",
        position: "relative",
        overflow: "hidden",
        transition: "transform 0.2s, box-shadow 0.2s",
        transform: hover && !disabled ? "translateY(-4px) scale(1.02)" : "scale(1)",
        boxShadow: hover && !disabled 
          ? `0 8px 24px ${rarityInfo.backgroudColor}40` 
          : "0 2px 8px rgba(0,0,0,0.3)",
      }}
    >
      {/* レアリティバッジ */}
      <div
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          background: rarityInfo.backgroudColor,
          color: "#fff",
          padding: "4px 8px",
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 700,
          zIndex: 2,
          boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
        }}
      >
        {rarityInfo.label}
      </div>

      {/* カード画像 */}
      <div
        style={{
          width: "100%",
          height: 140,
          background: `linear-gradient(135deg, ${rarityInfo.backgroudColor}20, ${rarityInfo.backgroudColor}05)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderBottom: `1px solid ${rarityInfo.backgroudColor}40`,
          position: "relative",
        }}
      >
        {cardDef.imageSrc && !imageError ? (
          <img
            src={cardDef.imageSrc}
            alt={cardDef.imageAlt || cardDef.name}
            onError={() => setImageError(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          // 画像がない場合は絵文字を表示
          <div style={{ fontSize: 56, opacity: disabled ? 0.3 : 0.8 }}>
            {cardDef.emoji}
          </div>
        )}
      </div>

      {/* カード情報 */}
      <div style={{ padding: "10px 12px" }}>
        {/* カード名 */}
        <div
          style={{
            fontWeight: 700,
            fontSize: 14,
            marginBottom: 6,
            lineHeight: 1.2,
            height: 32,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {cardDef.name}
        </div>

        {/* 効果説明 */}
        <div
          style={{
            fontSize: 11,
            opacity: 0.85,
            lineHeight: 1.3,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {cardDef.description}
        </div>
      </div>

      {/* ホバー時の詳細ツールチップ */}
      {hover && !disabled && (
        <div
          style={{
            position: "absolute",
            zIndex: 100,
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginTop: 8,
            width: 280,
            background: "#0f0f0f",
            border: `2px solid ${rarityInfo.backgroudColor}`,
            borderRadius: 12,
            padding: 14,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 24 }}>{cardDef.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
                {cardDef.name}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: rarityInfo.backgroudColor,
                  fontWeight: 600,
                }}
              >
                {rarityInfo.label} - {cardDef.rarity}
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: 12,
              opacity: 0.9,
              lineHeight: 1.4,
              marginBottom: 8,
              whiteSpace: "pre-wrap",
            }}
          >
            {cardDef.description}
          </div>

          {cardDef.effectAmount && (
            <div
              style={{
                fontSize: 11,
                padding: "6px 10px",
                background: "#1a1a1a",
                borderRadius: 6,
                border: "1px solid #333",
              }}
            >
              効果量: <strong>{cardDef.effectAmount > 0 ? "+" : ""}{cardDef.effectAmount}</strong>
            </div>
          )}
        </div>
      )}

      {/* 無効時のオーバーレイ */}
      {disabled && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            color: "#999",
          }}
        >
          使用不可
        </div>
      )}
    </div>
  );
}