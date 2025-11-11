"use client";

import Image from "next/image";
import React, { useState } from "react";
import { CARD_DEFINITIONS } from "./cardDefinitions";
import styles from "../styles/CardView.module.css";

/**
 * カード表示コンポーネント
 * @param {Object} card - カードデータ（CARD_DEFINITIONS の形式）
 * @param {boolean} disabled - 使用不可状態
 * @param {Function} onClick - クリック時のコールバック
 * @param {number} index - カードのインデックス（手札内の位置）
 */
const CardView = ({ card, disabled, onClick, index }) => {
  const [hover, setHover] = useState(false);

  const cardDef = CARD_DEFINITIONS[card?.id] || card;
  if (!cardDef) return null;

  return (
    <div
      className={`${styles.card} ${disabled ? styles.disabled : ""}`}
      onClick={!disabled ? onClick : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: disabled ? "#374151" : cardDef.color,
        borderColor: disabled ? "#4b5563" : cardDef.hoverColor,
        transform: hover && !disabled ? "scale(1.05)" : "scale(1)",
        boxShadow:
          hover && !disabled
            ? "0 8px 24px rgba(0,0,0,0.3)"
            : "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      {/* カード画像 */}
      {cardDef.imageSrc && (
        <div className={styles.imageWrapper}>
          <Image
            src={cardDef.imageSrc}
            alt={cardDef.imageAlt || "カード画像"}
            width={180}
            height={120}
            className={styles.image}
          />
        </div>
      )}

      {/* 絵文字 */}
      <div className={`${styles.emoji} ${disabled ? styles.gray : ""}`}>
        {cardDef.emoji}
      </div>

      {/* カード名 */}
      <div className={styles.name}>{cardDef.name}</div>

      {/* 説明 */}
      <div className={styles.description}>{cardDef.description}</div>

      {/* 🎯 ターゲットアイコン */}
      {cardDef.needsTarget && <div className={styles.target}>🎯</div>}

      {/* ⚡ コスト */}
      {cardDef.cost > 0 && <div className={styles.cost}>⚡{cardDef.cost}</div>}

      {/* ツールチップ */}
      {hover && !disabled && (
        <div className={styles.tooltip}>
          <div className={styles.tooltipTitle} style={{ color: cardDef.color }}>
            {cardDef.emoji} {cardDef.name}
          </div>
          <div className={styles.tooltipDesc}>{cardDef.description}</div>
          <div className={styles.tooltipFooter}>
            {cardDef.needsTarget && <div>🎯 ターゲット選択が必要</div>}
            {cardDef.cost > 0 && <div>⚡ コスト: {cardDef.cost}</div>}
            {cardDef.effectAmount && (
              <div>💥 効果: {Math.abs(cardDef.effectAmount)}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
export default CardView;