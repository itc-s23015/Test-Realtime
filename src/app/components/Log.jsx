// Log.jsx
import React, { useEffect, useRef } from "react";
import styles from "../styles/Log.module.css";

// ID → 安定した色の生成
function colorFromId(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % 360;
  }
  return `hsl(${hash}, 65%, 55%)`;
}

// 文字列ログの中の「ID部分」に色を付ける
function colorizeMessage(msg) {
  if (typeof msg !== "string") return msg;

  // 例: 3af21… / 98fd1… / abc12 / 9f3bd
  const idPattern = /([0-9a-fA-F]{3,6})…?/g;

  return msg.replace(idPattern, (match) => {
    const plain = match.replace("…", ""); // 色生成用
    const color = colorFromId(plain);
    return `<span style="color:${color}; font-weight:600">${match}</span>`;
  });
}

export default function Log({ log = [] }) {
  const boxRef = useRef(null);

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [log]);

  return (
    <div ref={boxRef} className={styles.log}>
      {log.map((msg, i) => (
        <div key={i} className={styles.row}>
          <span className={styles.dot} aria-hidden />
          <div
            className={styles.msg}
            dangerouslySetInnerHTML={{ __html: colorizeMessage(msg) }}
          />
        </div>
      ))}
    </div>
  );
}
