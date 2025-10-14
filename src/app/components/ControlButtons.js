"use client";

import { useState } from 'react';

export default function ControlButtons({ onButtonClick }) {
    const [hoveredButton, setHoveredButton] = useState(null);

    const buttons = [
        { amount: 500, color: '#10b981', hoverColor: '#059669', emoji: '📈', label: '+500円' },
        { amount: 1000, color: '#3b82f6', hoverColor: '#2563eb', emoji: '🚀', label: '+1000円' },
        { amount: -500, color: '#f59e0b', hoverColor: '#d97706', emoji: '📉', label: '-500円' },
        { amount: -1000, color: '#ef4444', hoverColor: '#dc2626', emoji: '💥', label: '-1000円' },
    ];

    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            padding: '24px'
        }}>
            <h2 style={{ 
                marginBottom: '16px', 
                fontSize: '18px', 
                fontWeight: 'bold',
                color: '#111827'
            }}>
                株価を変動させる
            </h2>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '12px'
            }}>
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
                💡 株価は2秒ごとに自動変動します。ボタンで手動変動も可能です。
            </p>
        </div>
    );
}