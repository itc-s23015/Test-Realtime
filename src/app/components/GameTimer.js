"use client";

import React, { useEffect, useState, useRef } from "react";
import styles from "../styles/GameTimer.module.css";

const GameTimer = ({ duration = 300, onTimeUp, startAt }) =>{
  const [timeLeft, setTimeLeft] = useState(duration);
  // const startTimeRef = useRef(Date.now());
  const rafRef = useRef(null);
  const hasCalledTimeUp = useRef(false);

   useEffect(() => {
    setTimeLeft(duration);
    hasCalledTimeUp.current = false;
    // if (!startAt) {
    //   localStartRef.current = Date.now();
    // }
  }, [duration, startAt]);

   useEffect(() => {
    if (startAt == null) return;
    const update = () => {
      const baseMs = startAt;
      const elapsed = Math.max(0, Math.floor((Date.now() - baseMs) / 1000));
      const remaining = Math.max(duration - elapsed, 0);

      // 1秒ごとにのみstate更新 → 無駄な再レンダリング防止
      setTimeLeft((prev) => (Math.abs(prev - remaining) >= 1 ? remaining : prev));

      // 終了時コールバック
      if (remaining <= 0 && !hasCalledTimeUp.current) {
        hasCalledTimeUp.current = true;
        onTimeUp?.();
        cancelAnimationFrame(rafRef.current);
        return;
      }

      // 常にrequestAnimationFrameで滑らかに進行
      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);

    // タブ復帰時にも補正
    const handleVisible = () => {
      if (document.visibilityState === "visible") update();
    };
    document.addEventListener("visibilitychange", handleVisible);

    return () => {
      cancelAnimationFrame(rafRef.current);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, [duration, onTimeUp, startAt]);

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