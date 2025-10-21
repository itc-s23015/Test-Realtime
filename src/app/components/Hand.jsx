import React from "react";
import styles from "./Hand.module.css";
import CardView from "./CardView.jsx";

export default function Hand({
  hand = [],
  meAtb = 0,
  onPlay,
  maxHand = 8,
  nextDrawMs,
  // 追加: DnD 状態を親と共有（任意）
  draggingIndex = null,
  setDraggingIndex = () => {},
}) {
  const disabledByATB = (c) => c?.kind !== "JUNK" && meAtb < 100;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.title}>Your Hand</div>
        <div className={styles.meta}>
          <span className={hand.length >= maxHand ? styles.warn : ""}>
            {hand.length}/{maxHand}
          </span>
          {typeof nextDrawMs === "number" && (
            <span className={styles.draw}>
              次ドロー: {Math.max(0, Math.ceil(nextDrawMs / 1000))}s
            </span>
          )}
        </div>
      </div>

      <div className={styles.grid}>
        {hand.map((c, i) => (
          <CardView
            key={i}
            index={i}
            card={c}
            disabled={disabledByATB(c)}
            onClick={() => onPlay?.(i)}
            isDragging={draggingIndex === i}
            onDragStart={(idx) => setDraggingIndex(idx)}
            onDragEnd={() => setDraggingIndex(null)}
          />
        ))}
      </div>
    </div>
  );
}
