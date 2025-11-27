"use client";

import Image from "next/image";
import React, { useState, useMemo } from "react";
import { CARD_DEFINITIONS, RARITY } from "./cardDefinitions";
import styles from "../styles/CardView.module.css";

/** レアリティ→色のデフォルト（CardListPage と完全統一） */
const RARITY_COLORS = {
  [RARITY.NORMAL]: {
    color: "#111827",         // 濃い文字
    hoverColor: "#e5e5e5",    // 少し濃いグレー
    bg: "#f5f5f5",            // NORMAL背景
  },
  [RARITY.RARE]: {
    color: "#1e3a8a",         // 青系テキスト
    hoverColor: "#bae6fd",    // hover時やや濃い青
    bg: "#e0f2fe",            // RARE背景
  },
  [RARITY.SUPERRARE]: {
    color: "#78350f",         // 金系テキスト
    hoverColor: "#fde68a",    // hover時やや濃い金
    bg: "#fef3c7",            // SR背景
  },
};


/** 定義の足りないUI項目を補完して正規化 */
function normalizeDef(raw) {
  if (!raw) return null;
  const byId = CARD_DEFINITIONS[raw.id] || raw;

  // desc/description の吸収
  const description = byId.description ?? byId.desc ?? "";

  // 効果量の表示用（例：REDUCE_HOLDINGS / DRAW など）
  let effectAmount = byId.effectAmount;
  if (effectAmount == null && byId.effect) {
    if (byId.effect.type === "REDUCE_HOLDINGS") effectAmount = byId.effect.amount ?? 0;
    if (byId.effect.type === "DRAW")             effectAmount = byId.effect.count ?? 0;
  }

  // レアリティに応じた配色のデフォルト
  const rarity = byId.rarity ?? RARITY.NORMAL;
  const colorSet = RARITY_COLORS[rarity] ?? RARITY_COLORS[RARITY.NORMAL];

  return {
    ...byId,
    description,
    effectAmount,
    color: byId.color ?? colorSet.color,
    hoverColor: byId.hoverColor ?? colorSet.hoverColor,
    emoji: byId.emoji ?? "🃏",
    // 画像は指定が無ければ null（public に置いたら /image/... の絶対パスでOK）
    imageSrc: byId.imageSrc ?? null,
    imageAlt: byId.imageAlt ?? byId.name ?? "カード画像",
  };
}

/**
 * カード表示コンポーネント
 * @param {Object}  card      - { id: string } など（CARD_DEFINITIONSのキーでもOK）
 * @param {boolean} disabled  - 使用不可
 * @param {Function}onClick   - クリック時（indexを渡す）
 * @param {number}  index     - 手札内の位置
 */
const CardView = ({ card, disabled, onClick, index }) => {
  const [hover, setHover] = useState(false);
  const cardDef = useMemo(() => normalizeDef(card), [card]);
  if (!cardDef) return null;

  const handleClick = !disabled ? () => onClick?.(index) : undefined;

  return (
    <div
      className={`${styles.card} ${disabled ? styles.disabled : ""}`}
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: disabled ? "#374151" : cardDef.color,
        borderColor: disabled ? "#4b5563" : cardDef.hoverColor,
        transform: hover && !disabled ? "scale(1.05)" : "scale(1)",
        boxShadow: hover && !disabled ? "0 8px 24px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.1)",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {/* 画像（/public に置いた場合は /image/... の絶対パスでOK） */}
      {cardDef.imageSrc && (
        <div className={styles.imageWrapper}>
          <Image
            src={cardDef.imageSrc}
            alt={cardDef.imageAlt}
            width={180}
            height={120}
            className={styles.image}
            priority={false}
          />
        </div>
      )}

      {/* 絵文字 */}
      <div className={`${styles.emoji} ${disabled ? styles.gray : ""}`}>{cardDef.emoji}</div>

      {/* カード名 */}
      <div className={styles.name}>{cardDef.name}</div>

      {/* 説明 */}
      <div className={styles.description}>{cardDef.description}</div>

      {/* 🎯 ターゲット必須 */}
      {cardDef.needsTarget && <div className={styles.target}>🎯</div>}

      {/* ⚡ コスト（ATBなど） */}
      {cardDef.cost > 0 && <div className={styles.cost}>⚡{cardDef.cost}</div>}

      {/* ツールチップ */}
      {hover && !disabled && (
        <div className={styles.tooltip}>
          <div className={styles.tooltipTitle} style={{ color: cardDef.hoverColor }}>
            {cardDef.emoji} {cardDef.name}
          </div>
          <div className={styles.tooltipDesc}>{cardDef.description}</div>
          <div className={styles.tooltipFooter}>
            {cardDef.needsTarget && <div>🎯 ターゲット選択が必要</div>}
            {cardDef.cost > 0 && <div>⚡ コスト: {cardDef.cost}</div>}
            {typeof cardDef.effectAmount === "number" && (
              <div>💥 効果: {Math.abs(cardDef.effectAmount)}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CardView;
