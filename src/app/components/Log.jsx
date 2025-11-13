import React from "react";
import styles from "../styles/Log.module.css";

export default function Log({ log = [] }) {
  if (!log || log.length === 0) {
    return <div className={styles.logEmpty}>ログはまだありません</div>;
  }

  return (
    <div className={styles.log}>
      {log.map((msg, i) => (
        <div key={i} className={styles.row}>
          <span className={styles.dot} aria-hidden />
          <div className={styles.msg}>{msg}</div>
        </div>
      ))}
    </div>
  );
}
