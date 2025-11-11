import React from "react";
import styles from "../styles/TargetSelector.module.css";

const TargetSelector = ({
  otherPlayers,
  selectedTarget,
  onTargetSelect,
}) => {
  if (otherPlayers.length === 0) return null;

  return (
    <div className={styles.targetSection}>
      <h2 className={styles.targetTitle}>
        🎯 ターゲット選択 {otherPlayers.length >= 2 && "(必須)"}
      </h2>
      <div className={styles.targetGrid}>
        {otherPlayers.map((p) => (
          <button
            key={p.id}
            onClick={() => onTargetSelect(p.id)}
            className={`${styles.targetButton} ${
              selectedTarget === p.id ? styles.targetButtonSelected : ""
            }`}
          >
            <div className={styles.targetPlayerName}>👤 {p.name}</div>
            <div className={styles.targetPlayerId}>
              ID: {p.id.substring(0, 8)}…
            </div>
            <div className={styles.targetPlayerHolding}>
              📊 保有株: {p.holding} 株
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
export default TargetSelector;