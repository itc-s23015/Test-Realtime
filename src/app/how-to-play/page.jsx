"use client";
import React from "react";
import "../styles/SharedPage.css";

export default function HowToPlayPage() {
  return (
    <main className="pageContainer">
<div className="headerRow">
  <h1 className="pageTitle">遊び方 / How To Play</h1>

  <button className="backBtn" onClick={() => window.location.href = "/"}>
    ホームに戻る
  </button>
</div>
      <div className="box">
        <h2 className="sectionTitle">🏆 勝利条件</h2>
        <p className="text">最終的な総資産が最も高いプレイヤーが勝利です。</p>
      </div>
      <div className="box">
        <h2 className="sectionTitle">🎯 ゲームの目的</h2>
        <p className="text">４分間で最も総資産を増やしたプレイヤーが勝利します。</p>
      </div>

      <div className="box">
        <h2 className="sectionTitle">📈 基本ルール</h2>
        <ul className="text">
          <li>株価チャートはリアルタイムで変動します。</li>
          <li>カードを使用して相手を妨害したり自分を強化できます。</li>
          <li>行動ゲージを消費してカードが使えます。</li>
          <li>最大4人のリアルタイム対戦です。</li>
        </ul>
      </div>

      <div className="box">
        <h2 className="sectionTitle">⚡ 行動ゲージ</h2>
        <p className="text">時間で溜まるゲージ。カードの発動に必要です。</p>
      </div>

      <div className="box">
        <h2 className="sectionTitle">🃏 カードの使い方</h2>
        <ul className="text">
          <li>画面下部の手札からカードを選ぶ</li>
          <li>必要なら対象プレイヤーを選択</li>
          <li>行動ゲージ を消費して即時発動</li>
        </ul>
      </div>

      <div className="box">
        <h2 className="sectionTitle">💹 株の売買</h2>
        <p className="text">「買う」「売る」で株数を操作できます。</p>
      </div>

<div className="box">
  <h2 className="sectionTitle">🎲 ランダムイベント</h2>
  <p className="text">
    対戦中、<strong>1秒に 1/75 の確率</strong>でランダムイベントが発生します。
    すべてのプレイヤーに影響し、ゲームの流れが大きく変わることがあります。
  </p>

  <ul className="text" style={{ marginTop: 10 }}>

    <li>
      <strong>🃏 カード全削除（CLEAR_HAND）</strong><br/>
      全プレイヤーの<strong>手札がすべて消滅</strong>します。直後はカードが使えないため、
      誰が有利か一気に変わる強力イベントです。
    </li>

    <li style={{ marginTop: 12 }}>
      <strong>💰 所持金リセット（SET_MONEY）</strong><br/>
      全プレイヤーの所持金が<strong>一定値（50,000）に固定</strong>されます。  
      大量のお金を持つプレイヤーほど不利になります。
    </li>

    <li style={{ marginTop: 12 }}>
      <strong>📈 株の大幅上昇（PRICE_SPIKE）</strong><br/>
      市場全体の株価が<strong>+10% 〜 +20%</strong>の範囲で急上昇します。
      保有株の多いプレイヤーが大きく得します。
    </li>

    <li style={{ marginTop: 12 }}>
      <strong>📉 株の大幅下落（PRICE_CRASH）</strong><br/>
      市場全体の株価が<strong>-10% 〜 -20%</strong>の範囲で暴落します。
      大量の株を抱えていると大損害を受けます。
    </li>

    <li style={{ marginTop: 12 }}>
      <strong>🔨 強制売却（FORCE_SELL）</strong><br/>
      全プレイヤーの保有株が<strong>強制的にすべて売却</strong>されます。  
      株価の上下によって得する人・大ダメージを受ける人が発生します。
    </li>

  </ul>

  <p className="smallText" style={{ marginTop: 16 }}>
    ※これらのイベントはランダムで発生するため、状況が大きく変動します。
    プレイヤーは柔軟に対応する戦略が求められます。
  </p>
</div>
    </main>
  );
}
