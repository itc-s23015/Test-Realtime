"use client";

import React, { useEffect, useState, useRef } from "react";
import styles from "../styles/GameTimer.module.css";

const GameTimer = ({ duration = 300, onTimeUp, startAt }) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const hasCalledTimeUp = useRef(false);
  const rafRef = useRef(null);
  const lastUpdateRef = useRef(Date.now());

  // startAt が変わったらリセット
  useEffect(() => {
    if (startAt != null) {
      const now = Date.now();
      const delay = now - startAt;
      console.log("⏰ タイマー初期化:", { 
        duration, 
        startAt, 
        startTime: new Date(startAt).toLocaleTimeString(),
        currentDelay: `${delay}ms`,
        isLate: delay > 0 
      });
    } else {
      console.log("⏸️ タイマー待機中 (startAt が未設定です)");
    }
    setTimeLeft(duration);
    hasCalledTimeUp.current = false;
    lastUpdateRef.current = Date.now();
  }, [duration, startAt]);

  useEffect(() => {
    // startAt が null の場合は動作しない
    if (startAt == null) {
      return;
    }

    // サーバー時刻ベースで残り時間を計算
    const calcRemaining = () => {
      const now = Date.now();
      const elapsed = Math.max(0, Math.floor((now - startAt) / 1000));
      return Math.max(duration - elapsed, 0);
    };

    // 即座に同期（初回 & タブ復帰時）
    const syncNow = () => {
      const remaining = calcRemaining();
      const prev = timeLeft;
      
      setTimeLeft(remaining);
      lastUpdateRef.current = Date.now();

      if (prev !== remaining) {
        console.log(`⏱️ タイマー同期: ${remaining}秒 (prev: ${prev})`);
      }

      // 終了チェック
      if (remaining <= 0 && !hasCalledTimeUp.current) {
        console.log("🏁 タイマー終了！");
        hasCalledTimeUp.current = true;
        onTimeUp?.();
        return true;
      }
      return false;
    };

    // 初回同期
    if (syncNow()) return;

    // requestAnimationFrame での滑らか更新
    const rafUpdate = () => {
      const now = Date.now();
      const remaining = calcRemaining();

      // 1秒以上ずれているか、500ms以上更新していない場合に同期
      if (Math.abs(timeLeft - remaining) >= 1 || now - lastUpdateRef.current >= 500) {
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
      if (!syncNow()) {
        // まだ続行中なら RAF を再起動
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(rafUpdate);
        }
      }
    }, 1000);

    // タブの可視性変更を監視して即座に同期
    const handleVisible = () => {
      if (document.visibilityState === "visible") {
        console.log("👁️ タブがアクティブになりました、同期中...");
        syncNow();
      }
    };

    const handleFocus = () => {
      console.log("🔍 ウィンドウがフォーカスされました、同期中...");
      syncNow();
    };

    document.addEventListener("visibilitychange", handleVisible);
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

  // startAt が未設定の場合は待機表示
  if (startAt == null) {
    return (
      <div className={`${styles.timerContainer} ${styles.green}`}>
        <div className={styles.icon}>⏱️</div>
        <div className={styles.timeWrapper}>
          <div className={styles.timeHeader}>
            <span className={styles.label}>待機中</span>
            <span className={`${styles.timeValue} ${styles.green}`}>
              --:--
            </span>
          </div>
          <div className={styles.progressBar}>
            <div className={`${styles.progressFill} ${styles.green}`} style={{ width: "0%" }} />
          </div>
        </div>
      </div>
    );
  }

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