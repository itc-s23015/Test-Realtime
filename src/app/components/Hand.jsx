import React from "react";
import styles from "../styles/Hand.module.css";
import CardView from "./CardView.jsx";

/**
 * 手札表示コンポーネント
 * 
 * @param {Array} hand - 手札のカード配列
 * @param {Function} onPlay - カードを使用する時のコールバック
 * @param {number} maxHand - 手札の最大枚数
 * @param {number} meAtb - 現在のATB値（将来実装用）
 */
const Hand = ({
  hand = [],
  meAtb = 0,
  onPlay,
  maxHand = 8,
}) => {
  // ATBが100未満の場合は使用不可（将来実装）
  const disabledByATB = (c) => {
    // JUNKカード以外はATB100が必要（将来の実装用）
    // return c?.kind !== "JUNK" && meAtb < 100;
    return false; // 現在は常に使用可能
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.title}>🃏カード</div>
        <div className={styles.meta}>
          <span className={hand.length >= maxHand ? styles.warn : ""}>
            {hand.length}/{maxHand}
          </span>
        </div>
      </div>

      <div className={styles.grid}>
        {hand.length === 0 ? (
          <div style={{ 
            gridColumn: "1 / -1", 
            textAlign: "center", 
            padding: 32,
            opacity: 0.6,
            fontSize: 14,
          }}>
            手札がありません
          </div>
        ) : (
          hand.map((card, i) => (
            <CardView
              key={i}
              index={i}
              card={card}
              disabled={disabledByATB(card)}
              onClick={() => onPlay?.(i)}
            />
          ))
        )}
      </div>
    </div>
  );
}
export default Hand;