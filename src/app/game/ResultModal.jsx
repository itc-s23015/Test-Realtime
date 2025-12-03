"use client";

import React from "react";
import styles from "../styles/ResultModal.module.css";

export default function ResultModal({
  open,
  results = [],
  onHome,
  onLobby
}) {
  if (!open) return null;

  // スコア順ソート
  const sorted = [...results].sort((a, b) => b.score - a.score);
  const topScore = sorted[0]?.score ?? 0;
  const winners = sorted.filter((r) => r.score === topScore);

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>

        <h2 className={styles.title}>試合結果</h2>

        <div className={styles.winnerBox}>
          🎉 勝者：
          <span className={styles.winnerName}>
            {winners.map((w) => w.name).join(", ")}
          </span>
          （¥{topScore.toLocaleString()}）
        </div>

        {/* 結果テーブル */}
        <table className={styles.table}>
          <thead>
            <tr>
              <th>順位</th>
              <th>名前</th>
              <th>所持金</th>
              <th>保有株</th>
              <th>株価</th>
              <th>スコア</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={r.playerId || i}>
                <td>{i + 1}</td>
                <td>{r.name}</td>
                <td>¥{r.money.toLocaleString()}</td>
                <td>{r.holding} 株</td>
                <td>¥{r.price.toLocaleString()}</td>
                <td className={styles.score}>¥{r.score.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 2つのボタン */}
        <div className={styles.buttonRow}>
          <button className={styles.homeBtn} onClick={onHome}>
            ホームに戻る
          </button>

          <button className={styles.lobbyBtn} onClick={onLobby}>
            ロビーに戻る
          </button>
        </div>

      </div>
    </div>
  );
}
