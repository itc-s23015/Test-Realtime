"use client";

import { useState } from "react";

export default function CardList({ onButtonClick }) {
  const [hoveredButton, setHoveredButton] = useState(null);

  const buttons = [
    { amount: -1, color: '#ef4444', hoverColor: '#aa5555ff', emoji: '💥', label: '-1株' },
    { amount: -2, color: '#073decff', hoverColor: '#3b3c85ff', emoji: '💣', label: '-2株' },

  ];

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow:'0 4px 6px rgba(0,0,0,0,1)' ,marginTop: '24px', padding: '24px' }}>
      <h2 style={{ 
        marginBottom: '16px', 
        fontSize: '18px', 
        fontWeight: 'bold',
        color: '#111827'
      }}>
        🃏 攻撃カード - 相手の株を減らす
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px'
      }}>
        <div>相手の株価を減らす</div>
      {buttons.map((btn, index) => (
        <button
          key={index}
          onClick={() => onButtonClick(btn.amount)}
          onMouseEnter={() => setHoveredButton(index)}
          onMouseLeave={() => setHoveredButton(null)}
           style={{
              padding: '16px 24px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              backgroundColor: hoveredButton === index ? btn.hoverColor : btn.color,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              transition: 'all 0.2s',
              transform: hoveredButton === index ? 'scale(1.05)' : 'scale(1)',
              boxShadow: hoveredButton === index ? '0 4px 12px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            <div>{btn.label} {btn.emoji}</div>
          </button>
        ))}
      </div>
      <p style={{
        marginTop: '16px',
        textAlign: 'center',
        color: '#6b7280',
        fontSize: '14px'
      }}>
        ⚔️ カードを使って相手の保有株を減らしましょう！
      </p>
    </div>
  );
}