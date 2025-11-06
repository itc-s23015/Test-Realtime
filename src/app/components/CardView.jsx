import React, { useState } from "react";
import { CARD_DEFINITIONS } from "./cardDefinitions";

/**
 * カード表示コンポーネント
 * 
 * @param {Object} card - カードデータ（CARD_DEFINITIONS の形式）
 * @param {boolean} disabled - 使用不可状態
 * @param {Function} onClick - クリック時のコールバック
 * @param {number} index - カードのインデックス（手札内の位置）
 */
export default function CardView({ card, disabled, onClick, index }) {
  const [hover, setHover] = useState(false);

  // カード定義から詳細情報を取得
  const cardDef = CARD_DEFINITIONS[card?.id] || card;
  
  if (!cardDef) {
    return null;
  }

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 180,
        height: 120,
        padding: 12,
        borderRadius: 12,
        background: disabled ? "#374151" : cardDef.color,
        border: `2px solid ${disabled ? "#4b5563" : cardDef.hoverColor}`,
        color: "#fff",
        cursor: disabled ? "not-allowed" : "pointer",
        position: "relative",
        transition: "all 0.2s ease",
        transform: hover && !disabled ? "scale(1.05)" : "scale(1)",
        boxShadow: hover && !disabled ? "0 8px 24px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.1)",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {/* カード絵文字 */}
      <div style={{ 
        fontSize: 40, 
        textAlign: "center", 
        marginBottom: 8,
        filter: disabled ? "grayscale(100%)" : "none",
      }}>
        {cardDef.emoji}
      </div>

      {/* カード名 */}
      <div style={{ 
        fontWeight: 700, 
        textAlign: "center",
        marginBottom: 4,
        fontSize: 14,
      }}>
        {cardDef.name}
      </div>

      {/* 簡易説明 */}
      <div style={{
        fontSize: 11,
        textAlign: "center",
        opacity: 0.9,
        lineHeight: 1.3,
      }}>
        {cardDef.description}
      </div>

      {/* ターゲット必要マーク */}
      {cardDef.needsTarget && (
        <div style={{
          position: "absolute",
          top: 8,
          right: 8,
          fontSize: 16,
        }}>
          🎯
        </div>
      )}

      {/* コスト表示（将来実装用） */}
      {cardDef.cost > 0 && (
        <div style={{
          position: "absolute",
          top: 8,
          left: 8,
          background: "rgba(0,0,0,0.5)",
          borderRadius: 12,
          padding: "2px 8px",
          fontSize: 12,
          fontWeight: 700,
        }}>
          ⚡{cardDef.cost}
        </div>
      )}

      {/* ホバー時の詳細ツールチップ */}
      {hover && !disabled && (
        <div
          style={{
            position: "absolute",
            zIndex: 100,
            top: "105%",
            left: "50%",
            transform: "translateX(-50%)",
            width: 260,
            background: "#0f0f0f",
            border: "2px solid #2a2a2a",
            borderRadius: 12,
            padding: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            pointerEvents: "none",
          }}
        >
          <div style={{ 
            fontWeight: 700, 
            marginBottom: 6,
            color: cardDef.color,
            fontSize: 16,
          }}>
            {cardDef.emoji} {cardDef.name}
          </div>
          <div style={{ 
            fontSize: 13, 
            opacity: 0.95, 
            whiteSpace: "pre-wrap",
            lineHeight: 1.5,
          }}>
            {cardDef.description}
          </div>
          
          {/* 追加情報 */}
          <div style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: "1px solid #2a2a2a",
            fontSize: 11,
            opacity: 0.8,
          }}>
            {cardDef.needsTarget && <div>🎯 ターゲット選択が必要</div>}
            {cardDef.cost > 0 && <div>⚡ コスト: {cardDef.cost}</div>}
            {cardDef.effectAmount && <div>💥 効果: {Math.abs(cardDef.effectAmount)}</div>}
          </div>
        </div>
      )}
    </div>
  );
}