"use client";

import { useState } from "react";

export default function CardList({ onButtonClick, selectedTarget, hasTargets }) {
  const [hoveredButton, setHoveredButton] = useState(null);

  const buttons = [
    { amount: -1, color: '#ef4444', hoverColor: '#dc2626', emoji: '💥', label: '-1株' },
    { amount: -2, color: '#073decff', hoverColor: '#1e40af', emoji: '💣', label: '-2株' },
  ];

  return (
    <div style={{ 
      backgroundColor: 'white', 
      borderRadius: '12px', 
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      marginTop: '24px', 
      padding: '24px' 
    }}>
      <h2 style={{ 
        marginBottom: '16px', 
        fontSize: '18px', 
        fontWeight: 'bold',
        color: '#111827'
      }}>
        ⚔️ 攻撃ボタン - 相手の株を減らす
      </h2>
      
      {hasTargets && !selectedTarget && (
        <div style={{
          marginBottom: '16px',
          padding: '12px',
          backgroundColor: '#fef3c7',
          borderRadius: '8px',
          textAlign: 'center',
          border: '2px solid #f59e0b'
        }}>
          <span style={{ fontWeight: 'bold', color: '#92400e' }}>
            ⚠️ 先にターゲットを選択してください
          </span>
        </div>
      )}

      {selectedTarget && (
        <div style={{
          marginBottom: '16px',
          padding: '12px',
          backgroundColor: '#dbeafe',
          borderRadius: '8px',
          textAlign: 'center',
          border: '2px solid #3b82f6'
        }}>
          <span style={{ fontWeight: 'bold', color: '#1e40af' }}>
            🎯 ターゲット選択中: {selectedTarget.substring(0, 8)}...
          </span>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px'
      }}>
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
              <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.9 }}>
                相手の株を減らす
              </div>
            </button>
          );
        })}
      </div>
      
      <p style={{
        marginTop: '16px',
        textAlign: 'center',
        color: '#6b7280',
        fontSize: '14px'
      }}>
        ⚔️ ボタンを押して相手の保有株を減らしましょう！
      </p>
    </div>
  );
}