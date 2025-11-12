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
  const [label, setLabel] = useState("");   // "3" / "2" / "1" / "START"
  const finishedRef = useRef(false);

  useEffect(() => {
    if (!startAt) return;
    let raf = 0;

    const loop = () => {
      const msLeft = startAt - Date.now();
      const sLeft = Math.ceil(msLeft / 1000); // 3,2,1,0...

      if (sLeft > 0) {
        setLabel(String(Math.min(seconds, sLeft)));
        raf = requestAnimationFrame(loop);
      } else {
        // 0 以下になったら "START" を短く表示してから終了
        setLabel("START");
        if (!finishedRef.current) {
          finishedRef.current = true;
          setTimeout(() => {
            onFinish?.();
          }, 700);
        }
      }
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
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
