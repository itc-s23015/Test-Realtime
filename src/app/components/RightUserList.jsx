"use client";

import React from "react";
import styles from "../styles/RightUserList.module.css";

export default function RightUserList({
  meId,
  players,
  selectedTarget,
  onSelect,
}) {
  // 🔥 自分(meId)を除外
  const list = Object.entries(players)
    .filter(([id]) => id !== meId)
    .map(([id, p]) => ({ id, ...p }))
    .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));

  if (list.length === 0) {
    return <div style={{ opacity: 0.6, fontSize: 12 }}>他のプレイヤーがいません</div>;
  }

  const handleClick = (id) => {
    onSelect(id === selectedTarget ? null : id);
  };

  return (
    <div className={styles.userList}>
      {list.map((p) => {
        const isSel = selectedTarget === p.id;
        const shortId = p.id.substring(0, 5); // ← ★ 先頭5文字

        return (
          <div
            key={p.id}
            className={`${styles.userCard} ${isSel ? styles.userCardSelected : ""}`}
            onClick={() => handleClick(p.id)}
          >
            <div className={styles.userRow}>
              <div className={styles.userName}>
                👤 {p.name}
                <span className={styles.userId}>（{shortId}）</span>
              </div>

              <div className={styles.userStats}>
                保有株: {p.holding ?? 0} 株
              </div>
            </div>

            <div className={styles.money}>
              所持金: ¥{Number(p.money ?? 0).toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}
