"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../styles/StartCountdown.module.css";

/**
 * 開幕カウントダウン用のフルスクリーンオーバーレイ
 * @param {number} startAt サーバ(ホスト)が決めた開始時刻のUNIX ms
 * @param {number} seconds カウント秒数(既定:3)
 * @param {function} onFinish 表示終了時に一度だけ呼ばれる
 */
export default function StartCountdown({ startAt, seconds = 3, onFinish }) {
  const [label, setLabel] = useState("");
  const finishedRef = useRef(false);
  const rafRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!startAt) return;

    // サーバー時刻ベースでカウント計算
    const calcLabel = () => {
      const now = Date.now();
      const msLeft = startAt - now;
      const sLeft = Math.ceil(msLeft / 1000);

      if (sLeft > 0) {
        return String(Math.min(seconds, sLeft));
      } else {
        return "START";
      }
    };

    // 即座に同期 & 終了処理
    const syncNow = () => {
      const newLabel = calcLabel();
      setLabel(newLabel);

      if (newLabel === "START" && !finishedRef.current) {
        finishedRef.current = true;
        setTimeout(() => {
          onFinish?.();
        }, 700);
        return true;
      }
      return false;
    };

    // 初回は即座に同期（ラグなし）
    if (syncNow()) return;

    let lastLabel = calcLabel();

    // requestAnimationFrame での高頻度チェック
    const loop = () => {
      const newLabel = calcLabel();

      // ラベルが変わった時だけstate更新
      if (newLabel !== lastLabel) {
        lastLabel = newLabel;
        if (syncNow()) return;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    // バックアップ用setInterval（RAF停止時も動く）
    intervalRef.current = setInterval(() => {
      if (syncNow()) {
        clearInterval(intervalRef.current);
        cancelAnimationFrame(rafRef.current);
      }
    }, 100);

    // タブの可視性変更を監視（最優先で同期）
    const handleVisible = () => {
      if (document.visibilityState === "visible") {
        syncNow();
        // RAF再起動
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(loop);
      }
    };

    const handleFocus = () => {
      syncNow();
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(loop);
    };

    document.addEventListener("visibilitychange", handleVisible);
    window.addEventListener("focus", handleFocus);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisible);
      window.removeEventListener("focus", handleFocus);
    };
  }, [startAt, seconds, onFinish]);

  if (!startAt) return null;

  return (
    <div className={styles.overlay}>
      <div className={label === "START" ? styles.start : styles.number}>
        {label}
      </div>
    </div>
  );
}