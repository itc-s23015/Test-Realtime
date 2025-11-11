"use client";

import React, { useEffect, useState, useRef } from "react";
import styles from "../styles/GameTimer.module.css";

const GameTimer = ({ duration = 300, onTimeUp }) =>{
  const [timeLeft, setTimeLeft] = useState(duration);
  const startTimeRef = useRef(null);
  const hasCalledTimeUp = useRef(false);

  useEffect(() => {
    // 初回のみ現在時刻を記録
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
    }

    const tick = () => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = Math.max(duration - elapsed, 0);
      setTimeLeft(remaining);

      if (remaining <= 0 && !hasCalledTimeUp.current) {
        hasCalledTimeUp.current = true;
        onTimeUp?.();
      }
    };

    const interval = setInterval(tick, 1000);

    // タブ復帰時にも補正
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") tick();
    });

    return () => clearInterval(interval);
  }, [duration, onTimeUp]);

  // 表示用フォーマット
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  // 残り時間に応じて色を変える
  const getColor = () => {
    if (timeLeft <= 30) return styles.red;
    if (timeLeft <= 60) return styles.orange;
    return styles.green;
  };

  const progress = (timeLeft / duration) * 100;

  return (
    <div className={`${styles.timerContainer} ${getColor()}`}>
      <div className={styles.icon}>⏱️</div>

      <div className={styles.timeWrapper}>
        <div className={styles.timeHeader}>
          <span className={styles.label}>残り時間</span>
          <span className={`${styles.timeValue} ${getColor()}`}>
            {mins}:{secs.toString().padStart(2, "0")}
          </span>
        </div>

        <div className={styles.progressBar}>
          <div
            className={`${styles.progressFill} ${getColor()}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default GameTimer;