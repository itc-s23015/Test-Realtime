// app/components/Log.jsx
"use client";

import React, { useEffect, useMemo, useRef } from "react";
import styles from "../styles/Log.module.css";

const LEVELS = {
  info:   { label: "INFO" },
  ok:     { label: "OK" },
  warn:   { label: "WARN" },
  error:  { label: "ERROR" },
  action: { label: "ACT" },
};

// 文字列 or {text, level, ts} の両方を受け付ける
const normalize = (x) => {
  if (typeof x === "string") return { text: x, level: "info", ts: Date.now() };
  return {
    text:  x.text ?? "",
    level: x.level && LEVELS[x.level] ? x.level : "info",
    ts:    typeof x.ts === "number" ? x.ts : Date.now(),
  };
};

const fmtTime = (ts) => {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString("ja-JP", { hour12: false });
  } catch { return "--:--:--"; }
};

export default function Log({ log = [] }) {
  const items = useMemo(() => log.map(normalize), [log]);
  const listRef = useRef(null);

  // 新規ログで一番下へオートスクロール
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [items.length]);

  // 全コピー
  const copyAll = async () => {
    const text = items
      .map((i) => `[${fmtTime(i.ts)}] ${i.level.toUpperCase()} ${i.text}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>ログ</span>
        <div className={styles.tools}>
          <button className={styles.toolBtn} onClick={copyAll} title="全コピー">
            ⧉
          </button>
        </div>
      </div>

      <div className={styles.list} ref={listRef} role="log" aria-live="polite">
        {items.length === 0 ? (
          <div className={styles.empty}>ログはまだありません</div>
        ) : (
          items.map((i, idx) => (
            <div
              key={idx}
              className={`${styles.row} ${styles[i.level]} ${idx % 2 ? styles.zebra : ""}`}
            >
              <span className={styles.time}>{fmtTime(i.ts)}</span>
              <span className={`${styles.badge} ${styles[`badge_${i.level}`]}`}>
                {LEVELS[i.level].label}
              </span>
              <span className={styles.msg}>{i.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
