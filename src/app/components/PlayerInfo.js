"use client";

import styles from "../styles//PlayerInfo.module.css";

const PlayerInfo = ({ money = 0, holding = 0, roomNumber = "" }) => {
    return (
        <div className={styles.container}>
            <div className={styles.toSection}>
                <div>
                    <div className={styles.label}>ルーム番号</div>
                    <div className={styles.roomNumber}>{roomNumber}</div>
                </div>
                
                <div className={styles.moneyBox}>
                    <div className={styles.label}>所持金</div>
                    <div className={styles.money}>¥{(money || 0).toLocaleString()}</div>
                </div>

                <div className={styles.holdingBox}>
                    <div className={styles.label}>保有株数</div>
                    <div className={styles.holding}>{(holding || 0).toLocaleString()}株</div>
                </div>
            </div>
            
            <div className={styles.autSection}>
                <span className={styles.autoText}>自動変動中（2秒ごと）</span>
            </div>
        </div>
    );
}

export default PlayerInfo;