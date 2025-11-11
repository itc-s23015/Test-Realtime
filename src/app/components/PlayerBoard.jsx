"use client";

import React from "react";
import styles from "../styles/PlayerBoard.module.css";

const count = (arr) => (Array.isArray(arr) ? arr.length : 0);
const pct = (v) => Math.max(0, Math.min(100, Number.isFinite(v) ? v : 0));
const fmtYen = (v) => `¥${Math.round(Number(v) || 0).toLocaleString()}`;

 const PlayerBoard = ({ p = {}, price = 0 }) =>{
  const name = p?.name ?? "P";
  const cash = p?.cash ?? 0;
  const holdings = p?.holdings ?? 0;
  const atb = pct(p?.atb ?? 0);

  const handLen = count(p?.hand);
  const deckLen = count(p?.deck);
  const discardLen = count(p?.discard);

  const value = Math.round(cash + holdings * (price ?? 0));
  const guard = p?.guard ?? 0;
  const slowActive = Boolean(p?._slowUntil);
  const discountActive = Boolean(p?._discountUntil);

  return (
    <div className={styles.board}>
      <div className={styles.header}>
        <b className={styles.name}>{name}</b>
        <div className={styles.moneyInfo}>
          Cash: {fmtYen(cash)}　Holdings: {holdings}　Value: {fmtYen(value)}
        </div>
      </div>

      {/* ATB bar */}
      <div className={styles.atbBar}>
        <div
          className={styles.atbFill}
          style={{ width: `${atb}%` }}
        ></div>
      </div>

      <div className={styles.statusLine}>
        Guard: {guard} / Slow: {slowActive ? 1 : 0} / Discount:{" "}
        {discountActive ? 1 : 0}
      </div>

      <div className={styles.cardInfo}>
        <span>Hand: {handLen}</span>
        <span>Deck: {deckLen}</span>
        <span>Discard: {discardLen}</span>
      </div>
    </div>
  );
}
export default PlayerBoard;