"use client";

import React, { useEffect, useMemo, useState } from "react";
import styles from "../styles/LeftHelpPanel.module.css";
import { CARD_DEFINITIONS, RARITY } from "./cardDefinitions";

export default function LeftHelpPanel({  roomId, messages, sendChat  }) {
  const [tab, setTab] = useState("rules"); // 'rules' | 'cards' | 'memo'
  const [search, setSearch] = useState("");
  const [memo, setMemo] = useState("");
  const [chatInput, setChatInput] = useState("");
  const memoKey = useMemo(() => `memo:${roomId || "default"}`, [roomId]);

  // ルーム別メモの永続化
  useEffect(() => {
    try {
      const v = localStorage.getItem(memoKey);
      if (v != null) setMemo(v);
    } catch {}
  }, [memoKey]);
  const saveMemo = () => { try { localStorage.setItem(memoKey, memo); } catch {} };
  const clearMemo = () => { setMemo(""); try { localStorage.removeItem(memoKey); } catch {} };

  // 招待リンク（ロビー）
  const inviteUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    url.pathname = "/lobby";
    url.search = `?room=${encodeURIComponent(roomId || "")}`;
    return url.toString();
  }, [roomId]);
  const copyInvite = async () => {
    try { await navigator.clipboard.writeText(inviteUrl); alert("招待リンクをコピーしました"); }
    catch { alert("コピーに失敗しました"); }
  };

  // カード図鑑（検索対応）
  const allCards = useMemo(() => Object.values(CARD_DEFINITIONS || {}), []);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allCards;
    return allCards.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const desc = (c.description || c.desc || "").toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [allCards, search]);

  return (
    <div className={styles.wrap}>
      {/* タブ */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === "rules" ? styles.active : ""}`} onClick={() => setTab("rules")}>
          ルール
        </button>
        <button className={`${styles.tab} ${tab === "cards" ? styles.active : ""}`} onClick={() => setTab("cards")}>
          カード図鑑
        </button>
        <button className={`${styles.tab} ${tab === "memo" ? styles.active : ""}`} onClick={() => setTab("memo")}>
          チャット
        </button>
      </div>

      {/* ルール */}
      {tab === "rules" && (
        <div className={styles.section}>
          <div className={styles.block}>
            <div className={styles.heading}>クイックヘルプ</div>
            <ul className={styles.list}>
              <li>株価は10秒ごとに自動更新</li>
              <li>ターゲットを選んでから攻撃カードを使用</li>
              <li>ゲージが不足するとカードは使用不可（必要ゲージはカードごと）</li>
              <li>終了時、所持金 +（保有株 × 終値）がスコア</li>
            </ul>
          </div>

          <div className={styles.block}>
            <div className={styles.heading}>操作のコツ</div>
            <ul className={styles.list}>
              <li>所持株が多い相手に削減カードが有効</li>
              <li>ゲージを温存して、価格急変時に一気に行動するのも手</li>
            </ul>
          </div>
        </div>
      )}

      {/* カード図鑑 */}
      {tab === "cards" && (
        <div className={styles.section}>
          <input
            className={styles.input}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="カード名・説明で検索"
          />
          <div className={styles.cardList}>
            {filtered.map((c) => (
              <div key={c.id} className={styles.cardItem}>
                <div className={styles.cardTitle}>
                  {/* レアリティバッジ（← 関数ではなくクラス名をマッピング） */}
                  <span className={`${styles.badge} ${rarityClass(c.rarity)}`}>{rarityLabel(c.rarity)}</span>
                  {/* 絵文字 */}
                  {c.emoji && <span className={styles.emoji}>{c.emoji}</span>}
                  <span className={styles.cardName}>{c.name}</span>
                </div>

                <div className={styles.cardDesc}>{c.description || c.desc || ""}</div>

                <div className={styles.meta}>
                  {c.needsTarget && <span className={styles.tag}>🎯 ターゲット必要</span>}
                  {typeof c.atbCost === "number" && c.atbCost > 0 && (
                    <span className={styles.tag}>⚡ ATB {c.atbCost}</span>
                  )}
                  {typeof c.cooldownMs === "number" && c.cooldownMs > 0 && (
                    <span className={styles.tag}>⏱ {Math.round(c.cooldownMs / 1000)}s</span>
                  )}
                  {"affectsChart" in c && c.affectsChart && (
                    <span className={styles.tag}>📊 チャート変動</span>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && <div className={styles.empty}>該当するカードがありません</div>}
          </div>
        </div>
      )}

      {/* メモ */}
{tab === "memo" && (
  <div className={styles.section}>

    {/* ====== チャット表示 ====== */}
    <div className={styles.chatBox}>
      {messages.map((m, i) => (
        <div key={i} className={styles.chatRow}>
          <span className={styles.chatName} style={{ color: colorFromId(m.id) }}>
            {m.name}
          </span>
          <span className={styles.chatText}>{m.text}</span>
        </div>
      ))}
    </div>

<div className={styles.chatInputRow}>
  <input
    type="text"
    className={styles.chatInput}
    placeholder="メッセージを入力..."
    value={chatInput}
    onChange={(e) => setChatInput(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === "Enter") {
        e.preventDefault(); // ← 重要！！
        sendChat(chatInput);
        setChatInput("");
      }
    }}
  />

  <button
    className={styles.chatSendBtn}
    onClick={() => {
      sendChat(chatInput);
      setChatInput("");
    }}
  >
    送信
  </button>
</div>

  </div>
)}

    </div>
  );
}

/* ========== ヘルパ ========== */
function rarityLabel(r) {
  switch (r) {
    case RARITY?.NORMAL: return "N";
    case RARITY?.RARE: return "R";
    case RARITY?.SUPERRARE: return "SR";
    default: return "N";
  }
}
function rarityClass(r) {
  const code = rarityLabel(r); // "N" | "R" | "SR"
  // CSS Modules の動的参照（無ければ N を既定に）
  // badgeRarityN / badgeRarityR / badgeRaritySR を CSS 側で定義
  return styles[`badgeRarity${code}`] || styles.badgeRarityN;
}

/* ===== ID → カラー生成 ===== */
function colorFromId(id) {
  if (!id) return "#999";
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % 360;
  }
  return `hsl(${hash}, 65%, 55%)`;
}
