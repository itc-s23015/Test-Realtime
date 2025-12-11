// src/app/components/TradingPanel.js
"use client";
import React, { useState } from "react";
import styles from "../styles/TradingPanel.module.css";

export default function TradingPanel({ currentPrice, money, holding, onTrade }) {
  const [amount, setAmount] = useState(1);

  // 購入可能な最大株数を計算
  const maxBuyAmount = Math.floor(money / currentPrice);
  
  // 売却可能な最大株数（保有株数）
  const maxSellAmount = holding;

  const handleBuy = () => {
    if (amount > 0 && amount <= maxBuyAmount) {
      onTrade("buy", amount);
    }
  };

  const handleSell = () => {
    if (amount > 0 && amount <= maxSellAmount) {
      onTrade("sell", amount);
    }
  };

  const handleMaxBuy = () => {
    if (maxBuyAmount > 0) {
      setAmount(maxBuyAmount);
      onTrade("buy", maxBuyAmount);
    }
  };

  const handleMaxSell = () => {
    if (maxSellAmount > 0) {
      setAmount(maxSellAmount);
      onTrade("sell", maxSellAmount);
    }
  };

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>📊 取引パネル</h3>
      
      <div className={styles.priceInfo}>
        <span className={styles.label}>現在価格:</span>
        <span className={styles.price}>¥{currentPrice.toLocaleString()}</span>
      </div>

      <div className={styles.amountControl}>
        <label className={styles.label}>取引数量:</label>
        <input
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 1))}
          className={styles.input}
        />
      </div>

      <div className={styles.quickButtons}>
        <button onClick={() => setAmount(1)} className={styles.quickBtn}>
          1
        </button>
        <button onClick={() => setAmount(5)} className={styles.quickBtn}>
          5
        </button>
        <button onClick={() => setAmount(10)} className={styles.quickBtn}>
          10
        </button>
      </div>

      <div className={styles.actions}>
        <button
          onClick={handleBuy}
          disabled={amount > maxBuyAmount || currentPrice <= 0}
          className={`${styles.actionBtn} ${styles.buyBtn}`}
        >
          🛒 購入
        </button>
        <button
          onClick={handleMaxBuy}
          disabled={maxBuyAmount <= 0 || currentPrice <= 0}
          className={`${styles.actionBtn} ${styles.maxBuyBtn}`}
          title={`最大 ${maxBuyAmount} 株購入`}
        >
          💰 MAX購入
        </button>
      </div>

      <div className={styles.actions}>
        <button
          onClick={handleSell}
          disabled={amount > maxSellAmount || holding <= 0}
          className={`${styles.actionBtn} ${styles.sellBtn}`}
        >
          💰 売却
        </button>
        <button
          onClick={handleMaxSell}
          disabled={maxSellAmount <= 0}
          className={`${styles.actionBtn} ${styles.maxSellBtn}`}
          title={`全保有株 ${maxSellAmount} 株売却`}
        >
          📤 MAX売却
        </button>
      </div>

      <div className={styles.info}>
        <div className={styles.infoRow}>
          <span>購入可能:</span>
          <span className={styles.infoValue}>{maxBuyAmount} 株</span>
        </div>
        <div className={styles.infoRow}>
          <span>売却可能:</span>
          <span className={styles.infoValue}>{maxSellAmount} 株</span>
        </div>
        <div className={styles.infoRow}>
          <span>取引額:</span>
          <span className={styles.infoValue}>
            ¥{(currentPrice * amount).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}