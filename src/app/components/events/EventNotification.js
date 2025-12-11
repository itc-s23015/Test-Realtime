// src/app/components/EventNotification.js
"use client";
import React, { useEffect, useState } from 'react';

/**
 * 画面中央に派手なイベント通知を表示するコンポーネント
 */
export default function EventNotification({ message, icon, type = 'default', duration = 3000, onClose }) {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // フェードイン開始
    setTimeout(() => setIsAnimating(true), 10);

    // 指定時間後にフェードアウト
    const timer = setTimeout(() => {
      setIsAnimating(false);
      setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, 500); // フェードアウトアニメーション完了を待つ
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  // イベントタイプに応じたスタイル
  const getTypeStyles = () => {
    switch (type) {
      case 'spike':
        return {
          bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          shadow: '0 20px 60px rgba(102, 126, 234, 0.6)',
          iconColor: '#ffd700',
        };
      case 'crash':
        return {
          bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          shadow: '0 20px 60px rgba(245, 87, 108, 0.6)',
          iconColor: '#ff6b6b',
        };
      case 'clear':
        return {
          bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          shadow: '0 20px 60px rgba(79, 172, 254, 0.6)',
          iconColor: '#00d4ff',
        };
      case 'sell':
        return {
          bg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
          shadow: '0 20px 60px rgba(250, 112, 154, 0.6)',
          iconColor: '#ffd700',
        };
      case 'buy':
        return {
          bg: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
          shadow: '0 20px 60px rgba(48, 207, 208, 0.6)',
          iconColor: '#30cfd0',
        };
      case 'money':
        return {
          bg: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
          shadow: '0 20px 60px rgba(168, 237, 234, 0.6)',
          iconColor: '#ffd700',
        };
      default:
        return {
          bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          shadow: '0 20px 60px rgba(102, 126, 234, 0.6)',
          iconColor: '#fff',
        };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        pointerEvents: 'none',
        opacity: isAnimating ? 1 : 0,
        transition: 'opacity 0.5s ease-in-out',
      }}
    >
      {/* 背景オーバーレイ */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
        }}
      />

      {/* メッセージカード */}
      <div
        style={{
          position: 'relative',
          background: typeStyles.bg,
          padding: '3rem 4rem',
          borderRadius: '24px',
          boxShadow: typeStyles.shadow,
          transform: isAnimating ? 'scale(1) rotate(0deg)' : 'scale(0.8) rotate(-5deg)',
          transition: 'all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          maxWidth: '80%',
          textAlign: 'center',
        }}
      >
        {/* パーティクル効果 */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '200%',
            height: '200%',
            background: `radial-gradient(circle, ${typeStyles.iconColor}33 0%, transparent 70%)`,
            animation: 'pulse 2s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />

        {/* アイコン */}
        {icon && (
          <div
            style={{
              fontSize: '5rem',
              marginBottom: '1.5rem',
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
              animation: 'bounce 1s ease-in-out infinite',
            }}
          >
            {icon}
          </div>
        )}

        {/* メッセージテキスト */}
        <div
          style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            color: '#ffffff',
            textShadow: '0 4px 12px rgba(0,0,0,0.5)',
            letterSpacing: '0.05em',
            lineHeight: 1.4,
            whiteSpace: 'pre-line',
          }}
        >
          {message}
        </div>

        {/* 装飾ライン */}
        <div
          style={{
            marginTop: '1.5rem',
            height: '4px',
            background: 'rgba(255, 255, 255, 0.5)',
            borderRadius: '2px',
            width: '60%',
            margin: '1.5rem auto 0',
            animation: 'shimmer 2s ease-in-out infinite',
          }}
        />
      </div>

      {/* アニメーション定義 */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.6;
            transform: translate(-50%, -50%) scale(1.1);
          }
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes shimmer {
          0%, 100% {
            opacity: 0.5;
            transform: translateX(-10px);
          }
          50% {
            opacity: 1;
            transform: translateX(10px);
          }
        }
      `}</style>
    </div>
  );
}