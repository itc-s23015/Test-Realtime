"use client";

import Image from "next/image";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { CARD_DEFINITIONS, RARITY } from "./cardDefinitions";
import styles from "../styles/CardView.module.css";

const RARITY_COLORS = {
  [RARITY.NORMAL]: {
    color: "#111827",
    hoverColor: "#e5e5e5",
    bg: "#f5f5f5",
  },
  [RARITY.RARE]: {
    color: "#1e3a8a",
    hoverColor: "#bae6fd",
    bg: "#e0f2fe",
  },
  [RARITY.SUPERRARE]: {
    color: "#78350f",
    hoverColor: "#fde68a",
    bg: "#fef3c7",
  },
};

function normalizeDef(raw) {
  if (!raw) return null;
  const byId = CARD_DEFINITIONS[raw.id] || raw;
  const description = byId.description ?? byId.desc ?? "";
  let effectAmount = byId.effectAmount;
  if (effectAmount == null && byId.effect) {
    if (byId.effect.type === "REDUCE_HOLDINGS") effectAmount = byId.effect.amount ?? 0;
    if (byId.effect.type === "DRAW") effectAmount = byId.effect.count ?? 0;
  }
  const rarity = byId.rarity ?? RARITY.NORMAL;
  const colorSet = RARITY_COLORS[rarity] ?? RARITY_COLORS[RARITY.NORMAL];

  return {
    ...byId,
    description,
    effectAmount,
    color: byId.color ?? colorSet.color,
    hoverColor: byId.hoverColor ?? colorSet.hoverColor,
    emoji: byId.emoji ?? "🃏",
    imageSrc: byId.imageSrc ?? null,
    imageAlt: byId.imageAlt ?? byId.name ?? "カード画像",
  };
}

/**
 * カード表示コンポーネント（アニメーション対応）
 * @param {Object}  card      - { id: string }
 * @param {boolean} disabled  - 使用不可
 * @param {Function}onClick   - クリック時
 * @param {number}  index     - 手札内の位置
 * @param {boolean} isUsing   - 使用中アニメーション
 * @param {boolean} isDrawn   - ドローアニメーション
 */
const CardView = ({ 
  card, 
  disabled, 
  onClick, 
  index,
  isUsing = false,
  isDrawn = false,
}) => {
  const [hover, setHover] = useState(false);
  const [particles, setParticles] = useState([]);
  const cardRef = useRef(null);
  
  const cardDef = useMemo(() => normalizeDef(card), [card]);
  if (!cardDef) return null;

  // カード使用時のパーティクル生成
  useEffect(() => {
    if (isUsing && cardRef.current) {
      createParticles();
    }
  }, [isUsing]);

  const createParticles = () => {
    const rect = cardRef.current.getBoundingClientRect();
    const newParticles = [];
    
    // カードの種類に応じたパーティクル生成
    const particleCount = cardDef.needsTarget ? 8 : 12;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const distance = 50 + Math.random() * 50;
      
      newParticles.push({
        id: `${Date.now()}-${i}`,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance,
        color: cardDef.needsTarget ? '#ef4444' : '#22c55e',
        size: 4 + Math.random() * 4,
      });
    }
    
    setParticles(newParticles);
    
    // 1秒後にパーティクルをクリア
    setTimeout(() => setParticles([]), 1000);
  };

  const handleClick = !disabled && !isUsing ? () => onClick?.(index) : undefined;

  const cardClasses = [
    styles.card,
    disabled && styles.disabled,
    isUsing && styles.cardUsing,
    isDrawn && styles.cardDrawn,
  ].filter(Boolean).join(' ');

  return (
    <>
      <div
        ref={cardRef}
        className={cardClasses}
        onClick={handleClick}
        onMouseEnter={() => !isUsing && setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          background: disabled ? "#374151" : cardDef.color,
          borderColor: disabled ? "#4b5563" : cardDef.hoverColor,
          transform: hover && !disabled && !isUsing ? "scale(1.05)" : "scale(1)",
          boxShadow: hover && !disabled && !isUsing 
            ? "0 8px 24px rgba(0,0,0,0.3)" 
            : "0 2px 8px rgba(0,0,0,0.1)",
          cursor: disabled || isUsing ? "not-allowed" : "pointer",
        }}
      >
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

        <div className={`${styles.emoji} ${disabled ? styles.gray : ""}`}>
          {cardDef.emoji}
        </div>

        <div className={styles.name}>{cardDef.name}</div>
        <div className={styles.description}>{cardDef.description}</div>

        {cardDef.needsTarget && <div className={styles.target}>🎯</div>}
        {cardDef.cost > 0 && <div className={styles.cost}>⚡{cardDef.cost}</div>}

        {hover && !disabled && !isUsing && (
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

      {/* パーティクルエフェクト */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={`${styles.effectParticle} ${
            cardDef.needsTarget ? styles.attackParticle : styles.sparkleParticle
          }`}
          style={{
            position: 'fixed',
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size,
            borderRadius: '50%',
            background: particle.color,
            '--dx': `${particle.dx}px`,
            '--dy': `${particle.dy}px`,
          }}
        />
      ))}
    </>
  );
};

export default CardView;