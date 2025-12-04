import React, { useState, useEffect } from "react";
import styles from "../styles/Hand.module.css";
import CardView from "./CardView.jsx";

/**
 * 手札表示コンポーネント（アニメーション対応）
 * 
 * @param {Array} hand - 手札のカード配列
 * @param {Function} onPlay - カードを使用する時のコールバック
 * @param {number} maxHand - 手札の最大枚数
 * @param {number} meAtb - 現在のATB値
 * @param {number} usingCardIndex - 使用中のカードインデックス
 */
const Hand = ({
  hand = [],
  meAtb = 0,
  onPlay,
  maxHand = 7,
  usingCardIndex = -1,
}) => {
  // 新しくドローされたカードを追跡
  const [newlyDrawnCards, setNewlyDrawnCards] = useState(new Set());
  const [prevHandLength, setPrevHandLength] = useState(hand.length);

  useEffect(() => {
    // 手札が増えた場合、新しいカードにドローアニメーションを適用
    if (hand.length > prevHandLength) {
      const newCards = new Set();
      // 最後に追加されたカードのインデックス
      for (let i = prevHandLength; i < hand.length; i++) {
        newCards.add(i);
      }
      setNewlyDrawnCards(newCards);
      
      // 0.5秒後にアニメーションをクリア
      setTimeout(() => {
        setNewlyDrawnCards(new Set());
      }, 500);
    }
    setPrevHandLength(hand.length);
  }, [hand.length, prevHandLength]);

  const disabledByATB = (c) => {
    // 将来的な実装用
    return false;
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
              key={`${card.id}-${i}`}
              index={i}
              card={card}
              disabled={disabledByATB(card)}
              onClick={() => onPlay?.(i)}
              isUsing={i === usingCardIndex}
              isDrawn={newlyDrawnCards.has(i)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default Hand;