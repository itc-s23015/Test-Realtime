"use client";
import React from "react";
import "../styles/SharedPage.css";
import { CARD_DEFINITIONS, RARITY } from "../components/cardDefinitions";

export default function CardListPage() {
  function getRarityClass(rarity) {
    switch (rarity) {
      case RARITY.NORMAL:
        return "rarityN";
      case RARITY.RARE:
        return "rarityR";
      case RARITY.SUPERRARE:
        return "raritySR";
      default:
        return "rarityN";
    }
  }

  return (
    <div className="homeBackground">
      <main className="pageContainer">
        <div className="headerRow">
          <h1 className="pageTitle">カード図鑑 / Card List</h1>
          <button className="backBtn" onClick={() => history.back()}>
            ← 戻る
          </button>
        </div>

        <div className="cardGrid">
          {Object.values(CARD_DEFINITIONS).map((card) => (
            <div key={card.id} className={`cardBox ${getRarityClass(card.rarity)}`}>
              <h3 className="cardName">
                {card.emoji} {card.name}
              </h3>

              <p className="cardInfo">
                レア度：{"★".repeat(
                  card.rarity === RARITY.NORMAL ? 1 : card.rarity === RARITY.RARE ? 2 : 3
                )}
              </p>
              <p className="cardInfo">行動ゲージ消費：{card.atbCost}</p>
              <p className="cardInfo">クールダウン：{card.cooldownMs / 1000} 秒</p>

              <p className="cardText">{card.description}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
