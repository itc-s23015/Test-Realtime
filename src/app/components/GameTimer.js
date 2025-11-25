"use client";

import React, { useEffect, useState, useRef } from "react";
import styles from "../styles/GameTimer.module.css";

const GameTimer = ({ duration = 300, onTimeUp, startAt }) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const hasCalledTimeUp = useRef(false);
  const rafRef = useRef(null);
  const lastUpdateRef = useRef(Date.now());

  useEffect(() => {
    setTimeLeft(duration);
    hasCalledTimeUp.current = false;
  }, [duration, startAt]);

  useEffect(() => {
    if (startAt == null) return;

    // サーバー時刻ベースで残り時間を計算
    const calcRemaining = () => {
      const now = Date.now();
      const elapsed = Math.max(0, Math.floor((now - startAt) / 1000));
      return Math.max(duration - elapsed, 0);
    };

    // 即座に同期（初回 & タブ復帰時）
    const syncNow = () => {
      const remaining = calcRemaining();
      setTimeLeft(remaining);
      lastUpdateRef.current = Date.now();

      // 終了チェック
      if (remaining <= 0 && !hasCalledTimeUp.current) {
        hasCalledTimeUp.current = true;
        onTimeUp?.();
      }
      return remaining;
    };

    // 初回同期
    syncNow();

    // requestAnimationFrame での滑らか更新
    const rafUpdate = () => {
      const now = Date.now();
      const remaining = calcRemaining();

      // 1秒以上ずれているか、900ms以上更新していない場合に同期
      if (Math.abs(timeLeft - remaining) >= 1 || now - lastUpdateRef.current >= 900) {
        setTimeLeft(remaining);
        lastUpdateRef.current = now;
      }

      // 終了チェック
      if (remaining <= 0 && !hasCalledTimeUp.current) {
        hasCalledTimeUp.current = true;
        onTimeUp?.();
        return;
      }

      rafRef.current = requestAnimationFrame(rafUpdate);
    };

    rafRef.current = requestAnimationFrame(rafUpdate);

    // バックアップ用のsetInterval（RAF停止時も動く）
    const intervalId = setInterval(() => {
      syncNow();
    }, 1000);

    // タブの可視性変更を監視して即座に同期
    const handleVisible = () => {
      if (document.visibilityState === "visible") {
        syncNow();
      }
    };
    document.addEventListener("visibilitychange", handleVisible);

    // フォーカス時も同期
    const handleFocus = () => {
      syncNow();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisible);
      window.removeEventListener("focus", handleFocus);
    };
  }, [duration, onTimeUp, startAt, timeLeft]);

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
};

export default GameTimer;