"use client";

import React, { useState } from 'react';
import styles from '../styles/TradingPanel.module.css';

const TradingPanel = ({ currentPrice, money, holding, onTrade }) => {
    const [tradeAmount, setTradeAmount] = useState(1);
    const [tradeType, setTradeType] = useState('buy'); // 'buy' or 'sell'

    const maxBuy = Math.min(10, Math.floor(money / currentPrice));
    const maxSell = Math.min(10, holding);

    const totalCost = tradeAmount * currentPrice;
    const canAfford = money >= totalCost;
    const canSell = holding >= tradeAmount;

    const handleTrade = () => {
        if (tradeType === 'buy' && canAfford && tradeAmount > 0) {
            onTrade('buy', tradeAmount);
        } else if (tradeType === 'sell' && canSell && tradeAmount > 0) {
            onTrade('sell', tradeAmount);
        }
    };

    const handleAmountChange = (e) => {
        const value = parseInt(e.target.value) || 1;
        const max = tradeType === 'buy' ? maxBuy : maxSell;
        setTradeAmount(Math.max(1, Math.min(max, value)));
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>株取引 💰</h3>
                <div className={styles.currentPrice}>
                    現在価格: ¥{currentPrice.toLocaleString()}
                </div>
            </div>

            <div className={styles.tradeTypeSelector}>
                <button
                    className={`${styles.typeButton} ${tradeType === 'buy' ? styles.typeButtonActive : ''}`}
                    onClick={() => {
                        setTradeType('buy');
                        setTradeAmount(Math.min(tradeAmount, maxBuy));
                    }}
                >
                    📈 買う
                </button>
                <button
                    className={`${styles.typeButton} ${tradeType === 'sell' ? styles.typeButtonActive : ''}`}
                    onClick={() => {
                        setTradeType('sell');
                        setTradeAmount(Math.min(tradeAmount, maxSell));
                    }}
                >
                    📉 売る
                </button>
            </div>

            <div className={styles.amountSection}>
                <label className={styles.label}>
                    {tradeType === 'buy' ? '購入数量' : '売却数量'}
                </label>
                <div className={styles.amountControls}>
                    <button
                        className={styles.controlButton}
                        onClick={() => setTradeAmount(Math.max(1, tradeAmount - 1))}
                        disabled={tradeAmount <= 1}
                    >
                        −
                    </button>
                    <input
                        type="number"
                        min="1"
                        max={tradeType === 'buy' ? maxBuy : maxSell}
                        value={tradeAmount}
                        onChange={handleAmountChange}
                        className={styles.amountInput}
                    />
                    <button
                        className={styles.controlButton}
                        onClick={() => setTradeAmount(Math.min(tradeType === 'buy' ? maxBuy : maxSell, tradeAmount + 1))}
                        disabled={tradeAmount >= (tradeType === 'buy' ? maxBuy : maxSell)}
                    >
                        ＋
                    </button>
                </div>
                <div className={styles.quickSelect}>
                    {[1, 3, 5, 10].map(num => (
                        <button
                            key={num}
                            className={styles.quickButton}
                            onClick={() => setTradeAmount(Math.min(num, tradeType === 'buy' ? maxBuy : maxSell))}
                            disabled={num > (tradeType === 'buy' ? maxBuy : maxSell)}
                        >
                            {num}株
                        </button>
                    ))}
                </div>
            </div>

            <div className={styles.summary}>
                <div className={styles.summaryRow}>
                    <span>合計金額:</span>
                    <span className={styles.summaryValue}>
                        ¥{totalCost.toLocaleString()}
                    </span>
                </div>
                {tradeType === 'buy' && (
                    <div className={styles.summaryRow}>
                        <span>取引後の残金:</span>
                        <span className={`${styles.summaryValue} ${!canAfford ? styles.insufficient : ''}`}>
                            ¥{(money - totalCost).toLocaleString()}
                        </span>
                    </div>
                )}
                {tradeType === 'sell' && (
                    <div className={styles.summaryRow}>
                        <span>取引後の所持金:</span>
                        <span className={styles.summaryValue}>
                            ¥{(money + totalCost).toLocaleString()}
                        </span>
                    </div>
                )}
            </div>

            <button
                className={`${styles.tradeButton} ${tradeType === 'buy' ? styles.buyButton : styles.sellButton}`}
                onClick={handleTrade}
                disabled={
                    (tradeType === 'buy' && (!canAfford || maxBuy === 0)) ||
                    (tradeType === 'sell' && (!canSell || maxSell === 0))
                }
            >
                {tradeType === 'buy' 
                    ? (maxBuy === 0 ? '資金不足' : `${tradeAmount}株 購入`)
                    : (maxSell === 0 ? '売却可能な株なし' : `${tradeAmount}株 売却`)
                }
            </button>

            <div className={styles.limits}>
                {tradeType === 'buy' && (
                    <div className={styles.limitText}>
                        最大購入可能: {maxBuy}株
                    </div>
                )}
                {tradeType === 'sell' && (
                    <div className={styles.limitText}>
                        最大売却可能: {maxSell}株
                    </div>
                )}
            </div>
        </div>
    );
};

export default TradingPanel;