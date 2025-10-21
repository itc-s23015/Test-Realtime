'use client';

import React from 'react';

/**
 * chart / players / log / cards / wallet をスロットとして受け取り、
 * 指定レイアウトで配置します。
 */
export default function GameLayout({ chart, players, log, cards, wallet }) {
  return (
    <div className="gameGrid">
      <section className="area-chart">{chart}</section>

      <aside className="area-side">
        <div className="players">{players}</div>
        <div className="logPane">{log}</div>
      </aside>

      <section className="area-cards">
        <div className="cardsScroll">{cards}</div>
      </section>

      <section className="area-wallet">{wallet}</section>
    </div>
  );
}
