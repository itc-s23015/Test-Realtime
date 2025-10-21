"use client";

import { useState } from "react";
import styles from "../styles/Card.module.css";

export default function CardList({ onButtonClick, selectedTarget, hasTargets }) {
  const [hoveredButton, setHoveredButton] = useState(null);

  const buttons = [
    { amount: -1, color: '#ef4444', hoverColor: '#dc2626', emoji: '💥', label: '-1株' },
    { amount: -2, color: '#073decff', hoverColor: '#1e40af', emoji: '💣', label: '-2株' },
  ];

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.title}>⚔️ 攻撃ボタン - 相手の株を減らす</h2>
      
      {hasTargets && !selectedTarget && (
        <div className={`{styles.notice} ${styles.warning}`}>
          <span className={styles.noticeText}>⚠️ 先にターゲットを選択してください</span>
        </div>
      )}

      {selectedTarget && (
        <div className={`{styles.notice} ${styles.info}`}>
          <span className={styles.noticeText}>
            🎯 ターゲット選択中: {selectedTarget.substring(0, 8)}...
          </span>
        </div>
      )}

      <div className={styles.grid}>
        {buttons.map((btn, index) => {
          const canUse = !hasTargets || selectedTarget;
          return (
            <button
              key={index}
              onClick={() => canUse && onButtonClick(btn.amount)}
              onMouseEnter={() => canUse && setHoveredButton(index)}
              onMouseLeave={() => setHoveredButton(null)}
              disabled={!canUse}
              style={{
                padding: '16px 24px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: canUse ? 'pointer' : 'not-allowed',
                backgroundColor: !canUse ? '#9ca3af' : (hoveredButton === index ? btn.hoverColor : btn.color),
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                transition: 'all 0.2s',
                transform: hoveredButton === index && canUse ? 'scale(1.05)' : 'scale(1)',
                boxShadow: hoveredButton === index && canUse ? '0 4px 12px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
                opacity: canUse ? 1 : 0.6
              }}
            >
              <div>{btn.label} {btn.emoji}</div>
              <div className={styles.sublabel}> 相手の株を減らす</div>
            </button>
          );
        })}
      </div>
      
      <p className={styles.helper}>⚔️ ボタンを押して相手の保有株を減らしましょう！</p>
    </div>
  );
}