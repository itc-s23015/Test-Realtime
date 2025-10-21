import React from "react";

export default function Log({ log = [] }) {
  return (
    <div
      style={{
        background: "#151515",
        border: "1px solid #2a2a2a",
        borderRadius: 12,
        padding: 10,
        height: 220,
        color: "#ddd",
        overflow: "auto",
      }}
    >
      {log.length === 0 ? (
        <div style={{ opacity: 0.6, fontSize: 12 }}>ログはまだありません</div>
      ) : (
        log
          .slice()
          .reverse()
          .map((l, i) => (
            <div key={i} style={{ fontSize: 12, lineHeight: 1.4 }}>
              {l}
            </div>
          ))
      )}
    </div>
  );
}
