"use client";

import React, { useState } from "react";
import styles from "../styles/TradingPanel.module.css";

const TradingPanel = ({ currentPrice, money, holding, onTrade }) => {
  const [tradeAmount, setTradeAmount] = useState(1);

  // 固定の10上限をなくして、お金 / 保有株数だけで決まるように
  const maxBuy = currentPrice > 0 ? Math.floor(money / currentPrice) : 0;
  const maxSell = holding;

  // 入力可能な最大値（買い/売りのどちらか大きい方）
  const maxAmount = Math.max(maxBuy, maxSell, 1);

  const safeAmount = Math.max(1, Math.min(tradeAmount, maxAmount));
  const buyAmount = Math.min(safeAmount, maxBuy);
  const sellAmount = Math.min(safeAmount, maxSell);

  const buyTotal = buyAmount * currentPrice;
  const sellTotal = sellAmount * currentPrice;

  const canBuy = buyAmount > 0 && money >= buyTotal;
  const canSell = sellAmount > 0;

  const handleAmountChange = (e) => {
    const value = parseInt(e.target.value, 100) || 1;
    setTradeAmount(Math.max(1, Math.min(maxAmount, value)));
  };

  const handleBuy = () => {
    if (!canBuy) return;
    onTrade("buy", buyAmount);
  };

  const handleSell = () => {
    if (!canSell) return;
    onTrade("sell", sellAmount);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>株取引 💰</h3>
        <div className={styles.currentPrice}>
          現在価格: ¥{currentPrice.toLocaleString()}
        </div>
      </div>

      {/* 数量入力 */}
      <div className={styles.amountSection}>
        <label className={styles.label}>取引数量</label>
        <div className={styles.amountControls}>
          <button
            className={styles.controlButton}
            onClick={() => setTradeAmount((prev) => Math.max(1, prev - 1))}
            disabled={safeAmount <= 1}
          >
            −
          </button>
          <input
            type="number"
            min="1"
            max={maxAmount}
            value={safeAmount}
            onChange={handleAmountChange}
            className={styles.amountInput}
          />
          <button
            className={styles.controlButton}
            onClick={() =>
              setTradeAmount((prev) => Math.min(maxAmount, prev + 1))
            }
            disabled={safeAmount >= maxAmount}
          >
            ＋
          </button>
        </div>
        <div className={styles.quickSelect}>
          {[1, 3, 5, 10].map((num) => (
            <button
              key={num}
              className={styles.quickButton}
              onClick={() => setTradeAmount(Math.min(num, maxAmount))}
              disabled={num > maxAmount}
            >
              {num}株
            </button>
          ))}
        </div>
      </div>

      {/* 売買ボタン */}
      <div className={styles.tradeButtonsRow}>
        <button
          className={`${styles.tradeButton} ${styles.buyButton}`}
          onClick={handleBuy}
          disabled={!canBuy}
        >
          {maxBuy === 0 ? "資金不足" : `${buyAmount}株 買う`}
        </button>

        <button
          className={`${styles.tradeButton} ${styles.sellButton}`}
          onClick={handleSell}
          disabled={!canSell}
        >
          {maxSell === 0 ? "売却可能な株なし" : `${sellAmount}株 売る`}
        </button>
      </div>

      {/* 常に表示 */}
      <div className={styles.limits}>
        <div className={styles.limitText}>最大購入可能: {maxBuy}株</div>
        <div className={styles.limitText}>最大売却可能: {maxSell}株</div>
      </div>
    </div>
  );
};

export default TradingPanel;