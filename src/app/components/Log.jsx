import React from "react";
import styles from "../styles/Log.module.css";

const Log = ({ log = [] }) => {
  return (
    <div className={styles.log}>
      {log.length === 0 ? (
        <div className={styles.logEmpty}>ログはまだありません</div>
      ) : (
        log.map((l, i) => (
          <div key={i} className={styles.logItem}>
            {l}
          </div>
        ))
      )}
    </div>
  );
}

export default Log;