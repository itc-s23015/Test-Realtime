"use client";

import { useEffect, useState } from "react";

const GameTimer = ({ 
  duration = 300, // デフォルト5分（秒）
  onTimeUp 
}) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUp?.();
      return;
    }

    // 残り30秒で警告表示
    if (timeLeft <= 30 && !isWarning) {
      setIsWarning(true);
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onTimeUp, isWarning]);

  // 時:分:秒 フォーマット
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  // 進捗率（パーセンテージ）
  const progress = (timeLeft / duration) * 100;

  // 色を時間に応じて変更
  const getColor = () => {
    if (timeLeft <= 30) return "#ef4444"; // 赤
    if (timeLeft <= 60) return "#f59e0b"; // オレンジ
    return "#10b981"; // 緑
  };

  return (
    <div style={{
      background: "#fff",
      borderRadius: "16px",
      padding: "20px 28px",
      boxShadow: isWarning 
        ? "0 6px 20px rgba(239, 68, 68, 0.3)" 
        : "0 4px 12px rgba(0,0,0,0.1)",
      display: "flex",
      alignItems: "center",
      gap: "20px",
      border: isWarning ? "3px solid #ef4444" : "1px solid #e5e7eb",
      animation: isWarning ? "pulse 1.5s ease-in-out infinite" : "none",
      transition: "all 0.3s ease"
    }}>
      {/* タイマーアイコン */}
      <div style={{
        fontSize: "32px",
        animation: timeLeft <= 10 ? "shake 0.5s ease-in-out infinite" : "none"
      }}>
        ⏱️
      </div>

      {/* タイマー本体 */}
      <div style={{ flex: 1 }}>
        <div style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: "8px"
        }}>
          <span style={{
            fontSize: "14px",
            fontWeight: "600",
            color: "#6b7280"
          }}>
            残り時間
          </span>
          <span style={{
            fontSize: "32px",
            fontWeight: "bold",
            color: getColor(),
            fontFamily: "monospace",
            letterSpacing: "2px"
          }}>
            {formatTime(timeLeft)}
          </span>
        </div>

        {/* プログレスバー */}
        <div style={{
          width: "100%",
          height: "8px",
          background: "#e5e7eb",
          borderRadius: "999px",
          overflow: "hidden"
        }}>
          <div style={{
            width: `${progress}%`,
            height: "100%",
            background: getColor(),
            transition: "width 1s linear, background-color 0.3s",
            borderRadius: "999px"
          }} />
        </div>
      </div>

      {/* 警告メッセージ */}
      {isWarning && (
        <div style={{
          position: "absolute",
          top: "-12px",
          right: "20px",
          background: "#ef4444",
          color: "#fff",
          padding: "4px 12px",
          borderRadius: "12px",
          fontSize: "12px",
          fontWeight: "bold",
          boxShadow: "0 2px 8px rgba(239, 68, 68, 0.4)"
        }}>
          ⚠️ あと{timeLeft}秒！
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
export default GameTimer;