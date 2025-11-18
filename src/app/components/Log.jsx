// Log.jsx
import React, { useEffect, useRef } from "react";
import styles from "../styles/Log.module.css";

export default function Log({ log = [] }) {
  const boxRef = useRef(null);
  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  if (!log.length) return <div className={styles.logEmpty}>ログはまだありません</div>;
  return (
    <div ref={boxRef} className={styles.log}>
      {log.map((msg, i) => (
        <div key={i} className={styles.row}>
          <span className={styles.dot} aria-hidden />
          <div className={styles.msg}>{msg}</div>
        </div>
      ))}
    </div>
  );
}
