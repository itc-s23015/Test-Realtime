"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "../styles/CardList.module.css";

export default function CardList({ onButtonClick, selectedTarget, hasTargets }) {
  const [hovered, setHovered] = useState(null);
  const [cooldowns, setCooldowns] = useState({}); // { index: msRemaining }

  // 10枚カード（威力が高いほどCD長め）
  const cards = useMemo(
    () => [
      // Light（短CD）
      { id: "l1", amount: -1, label: "-1株", emoji: "💥", cd: 6000,  color: "#f87171", hover: "#ef4444", sub: "軽い一撃" },
      { id: "l2", amount: -2, label: "-2株", emoji: "💥", cd: 8000,  color: "#fb7185", hover: "#f43f5e", sub: "小ダメージ" },

      // Medium
      { id: "m1", amount: -3, label: "-3株", emoji: "🔥", cd: 10000, color: "#f97316", hover: "#ea580c", sub: "継続的に削る" },
      { id: "m2", amount: -4, label: "-4株", emoji: "🔥", cd: 12000, color: "#f59e0b", hover: "#d97706", sub: "中ダメージ" },
      { id: "m3", amount: -5, label: "-5株", emoji: "💣", cd: 14000, color: "#eab308", hover: "#ca8a04", sub: "痛打" },

      // Heavy
      { id: "h1", amount: -6, label: "-6株", emoji: "⚡", cd: 16000, color: "#a78bfa", hover: "#8b5cf6", sub: "強打" },
      { id: "h2", amount: -8, label: "-8株", emoji: "⚡", cd: 20000, color: "#60a5fa", hover: "#3b82f6", sub: "重撃" },
      { id: "h3", amount: -10, label: "-10株", emoji: "⚔️", cd: 24000, color: "#38bdf8", hover: "#0ea5e9", sub: "強烈な一撃" },

      // Ultimate（長CD）
      { id: "u1", amount: -12, label: "-12株", emoji: "💥", cd: 28000, color: "#f472b6", hover: "#ec4899", sub: "フィニッシュ候補" },
      { id: "u2", amount: -15, label: "-15株", emoji: "💥", cd: 32000, color: "#fb7185", hover: "#e11d48", sub: "必殺" },
    ],
    []
  );

  // CDタイマー（250ms刻み）
  useEffect(() => {
    if (!Object.keys(cooldowns).length) return;
    const t = setInterval(() => {
      setCooldowns(prev => {
        const next = {};
        let has = false;
        for (const k in prev) {
          const v = Math.max(0, prev[k] - 250);
          if (v > 0) { next[k] = v; has = true; }
        }
        return has ? next : {};
      });
    }, 250);
    return () => clearInterval(t);
  }, [cooldowns]);

  const canUseTarget = !hasTargets || Boolean(selectedTarget);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>🃏 攻撃カード</h2>

      {hasTargets && !selectedTarget && (
        <div className={`${styles.alert} ${styles.alertWarning}`}>⚠️ 先にターゲットを選択してください</div>
      )}
      {selectedTarget && (
        <div className={`${styles.alert} ${styles.alertInfo}`}>🎯 ターゲット: {selectedTarget.slice(0, 8)}…</div>
      )}

      <div className={styles.grid}>
        {cards.map((c, idx) => {
          const cd = cooldowns[idx] ?? 0;
          const onCd = cd > 0;
          const disabled = !canUseTarget || onCd;
          const cdSec = Math.ceil(cd / 1000);

          return (
            <button
              key={c.id}
              onClick={() => {
                if (disabled) return;
                onButtonClick(c.amount);                     // そのまま parent の handleAttack へ
                setCooldowns(s => ({ ...s, [idx]: c.cd })); // ローカルCD開始
              }}
              onMouseEnter={() => !disabled && setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
              disabled={disabled}
              title={onCd ? `クールダウン中… ${cdSec}s` : ""}
              style={{
                padding: "14px 16px",
                fontSize: 15,
                fontWeight: 800,
                cursor: disabled ? "not-allowed" : "pointer",
                backgroundColor: disabled ? "#9ca3af" : (hovered === idx ? c.hover : c.color),
                color: "#fff",
                border: "none",
                borderRadius: 10,
                transition: "transform .15s ease, box-shadow .15s ease",
                transform: hovered === idx && !disabled ? "translateY(-1px)" : "none",
                boxShadow: hovered === idx && !disabled ? "0 8px 20px rgba(0,0,0,.15)" : "none",
                position: "relative",
                overflow: "hidden",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>{c.label}</span>
                <span>{c.emoji}</span>
              </div>
              <div className={styles.buttonSub}>{c.sub}</div>

              {/* クールダウン進捗バー */}
              {onCd && (
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 4, background: "rgba(0,0,0,.25)" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${((c.cd - cd) / c.cd) * 100}%`,
                      background: "rgba(255,255,255,.85)",
                    }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <p className={styles.footer}>ターゲットを選んでから実行できます。威力が高いほどクールダウンが長くなります。</p>
    </div>
  );
}
