"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Ably from "ably";
import StockChart from "./StockChart";
import PlayerInfo from "./PlayerInfo";
import ControlButtons from "./ControlButtons";
import CardList from "./card";

// --------- 定数 ----------
const INITIAL_MONEY = 100000;
const INITIAL_HOLDING = 10;
const AUTO_UPDATE_INTERVAL = 10000; // 価格自動変動
const ATB_MAX = 100;

// チャート用ダミーデータ生成（既存から）
function generateStockData(seed = Date.now()) {
  const data = [];
  let price = 15000;
  const startDate = new Date("2024-01-01");
  let random = seed;
  const seededRandom = () => {
    random = (random * 9301 + 49297) % 233280;
    return random / 233280;
  };
  for (let i = 0; i < 180; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    price += (seededRandom() - 0.48) * 500;
    price = Math.max(10000, Math.min(20000, price));
    data.push({
      date: date.toISOString().split("T")[0],
      price: Math.round(price),
      volume: Math.floor(seededRandom() * 100000000) + 50000000,
    });
  }
  return data;
}

export default function Game() {
  const router = useRouter();

  // ------------- ステート（既存の動作＋UI用を拡張） -------------
  const [roomNumber, setRoomNumber] = useState(null);
  const [error, setError] = useState("");
  const [stockData, setStockData] = useState([]);
  const [money, setMoney] = useState(INITIAL_MONEY);
  const [holding, setHolding] = useState(INITIAL_HOLDING);
  const [allPlayers, setAllPlayers] = useState({});
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [status, setStatus] = useState("connecting");

  // ログ（右サイドバー）
  const [log, setLog] = useState([]);

  // ATBゲージ（満タンで行動可能に）
  const [atb, setAtb] = useState(ATB_MAX);
  const atbTimerRef = useRef(null);

  // サイドバー開閉
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(true);

  // Refs / Ably
  const clientRef = useRef(null);
  const chRef = useRef(null);
  const autoTimerRef = useRef(null);
  const navigatingRef = useRef(false);
  const initializedRef = useRef(false);

  // 最新値保持（攻撃時の更新ブレ回避）
  const holdingRef = useRef(holding);
  const moneyRef = useRef(money);
  useEffect(() => { holdingRef.current = holding; }, [holding]);
  useEffect(() => { moneyRef.current = money; }, [money]);

  const clientId = useMemo(() => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem("playerName") || `player-${crypto.randomUUID().slice(0, 6)}`;
  }, []);

  const roomU = useMemo(() => (roomNumber ? roomNumber.toUpperCase() : ""), [roomNumber]);

  // Presence更新（安定化）
  const updatePresence = useCallback(async (newMoney, newHolding) => {
    if (!chRef.current) return;
    try {
      await chRef.current.presence.update({
        name: clientId,
        money: newMoney,
        holding: newHolding,
      });
    } catch (e) {
      console.error("❌ Presence更新失敗:", e);
    }
  }, [clientId]);

  // URL から room を取得
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const r = q.get("room");
    if (!r) {
      setError("ルーム番号が指定されていません");
      router.push("/");
      return;
    }
    setRoomNumber(r.toUpperCase());
  }, [router]);

  // ATBゲージ（常時チャージ）
  useEffect(() => {
    clearInterval(atbTimerRef.current);
    atbTimerRef.current = setInterval(() => {
      setAtb((v) => Math.min(ATB_MAX, v + 2));
    }, 100);
    return () => clearInterval(atbTimerRef.current);
  }, []);

  // Ably 接続（既存）
  useEffect(() => {
    if (!roomU || !clientId || initializedRef.current) return;
    initializedRef.current = true;

    const client = new Ably.Realtime.Promise({
      authUrl: `/api/ably-token?clientId=${encodeURIComponent(clientId)}&room=${encodeURIComponent(roomU)}`,
      closeOnUnload: false,
    });
    clientRef.current = client;

    client.connection.on(({ current }) => setStatus(current));

    client.connection.once("connected", async () => {
      const channelName = `rooms:${roomU}`;
      const ch = client.channels.get(channelName);
      chRef.current = ch;

      await ch.attach();
      await ch.presence.enter({
        name: clientId,
        money: INITIAL_MONEY,
        holding: INITIAL_HOLDING,
      });

      await refreshPlayers();
      ch.presence.subscribe(["enter", "leave", "update"], refreshPlayers);

      // ホスト決め & 初期データ送信
      const members = await ch.presence.get();
      const ids = members.map((m) => m.clientId).sort();
      const isHost = ids[0] === clientId;

      if (isHost) {
        const seed = Date.now();
        const initialData = generateStockData(seed);
        setStockData(initialData);
        pushLog("👑 あなたがホストになりました（価格配信担当）");
        await ch.publish("stock-init", { seed, data: initialData, by: clientId });
        startAutoUpdate(ch, initialData);
      }

      // イベント購読
      ch.subscribe("stock-init", (msg) => {
        setStockData(msg.data.data);
        pushLog("📊 株価データを受信しました");
      });

      ch.subscribe("stock-update", (msg) => {
        setStockData(msg.data.stockData);
        const sign = msg.data.changeAmount >= 0 ? "＋" : "−";
        pushLog(`📈 価格更新 ${sign}${Math.abs(msg.data.changeAmount)}`);
      });

      ch.subscribe("attack", (msg) => {
        const { targetId, effectAmount, attackerId } = msg.data || {};
        if (!targetId) return;
        // ログ
        pushLog(`⚔️ ${attackerId} → ${targetId}: ${Math.abs(effectAmount)} 減少`);

        if (targetId === clientId) {
          // 自分が被弾
          const newHolding = Math.max(0, holdingRef.current + effectAmount);
          setHolding(newHolding);
          setTimeout(() => updatePresence(moneyRef.current, newHolding), 50);
          setError(`⚔️ 攻撃を受けました！保有株 −${Math.abs(effectAmount)}`);
          setTimeout(() => setError(""), 2500);
        }
      });

      async function refreshPlayers() {
        const mem = await ch.presence.get();
        const players = {};
        mem.forEach((m) => {
          players[m.clientId] = {
            name: m.data?.name || m.clientId,
            money: m.data?.money ?? INITIAL_MONEY,
            holding: m.data?.holding ?? INITIAL_HOLDING,
          };
        });
        setAllPlayers(players);
      }
    });

    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
      const cleanup = async () => {
        try {
          if (chRef.current) {
            chRef.current.unsubscribe();
            await chRef.current.presence.leave();
          }
        } catch {}
        const doClose = () => { try { clientRef.current?.close(); } catch {} };
        if (navigatingRef.current) setTimeout(doClose, 200);
        else doClose();
      };
      cleanup();
    };
  }, [roomU, clientId, router, updatePresence]);

  // 自動価格変動（ホストのみ）
  const startAutoUpdate = (ch, initialData) => {
    if (autoTimerRef.current) return;
    let currentData = [...initialData];
    autoTimerRef.current = setInterval(async () => {
      const lastPrice = currentData[currentData.length - 1].price;
      const changeAmount = Math.floor((Math.random() - 0.5) * 600);
      const newPrice = Math.round(Math.max(10000, Math.min(20000, lastPrice + changeAmount)));
      currentData[currentData.length - 1] = {
        ...currentData[currentData.length - 1],
        price: newPrice,
        volume: Math.floor(Math.random() * 100000000) + 50000000,
      };
      if (currentData.length >= 180) {
        currentData.shift();
        const lastDate = new Date(currentData[currentData.length - 1].date);
        lastDate.setDate(lastDate.getDate() + 1);
        currentData.push({
          date: lastDate.toISOString().split("T")[0],
          price: newPrice,
          volume: Math.floor(Math.random() * 100000000) + 50000000,
        });
      }
      setStockData([...currentData]);
      try {
        await ch.publish("stock-update", { stockData: currentData, changeAmount, isAuto: true });
      } catch (e) {
        console.error("❌ 自動変動送信失敗:", e);
      }
    }, AUTO_UPDATE_INTERVAL);
  };

  // 価格ボタン（中央の青バーの下に置く既存）
  const handleButtonClick = async (changeAmount) => {
    if (!chRef.current || stockData.length === 0) return;
    // ATBが溜まっていなければ不可
    if (atb < ATB_MAX) return warn("ATBが不足しています");

    const lastPrice = stockData[stockData.length - 1].price;
    const newPrice = Math.round(Math.max(10000, Math.min(20000, lastPrice + changeAmount)));

    const newData = [...stockData];
    newData[newData.length - 1] = {
      ...newData[newData.length - 1],
      price: newPrice,
      volume: Math.floor(Math.random() * 100000000) + 50000000,
    };

    if (newData.length >= 180) {
      newData.shift();
      const lastDate = new Date(newData[newData.length - 1].date);
      lastDate.setDate(lastDate.getDate() + 1);
      newData.push({
        date: lastDate.toISOString().split("T")[0],
        price: newPrice,
        volume: Math.floor(Math.random() * 100000000) + 50000000,
      });
    }

    setAtb(0);
    setStockData(newData);
    pushLog(`🟦 手動変動: ${changeAmount >= 0 ? "＋" : "−"}${Math.abs(changeAmount)}`);

    try {
      await chRef.current.publish("stock-update", { stockData: newData, changeAmount, isAuto: false });
    } catch (e) {
      console.error("❌ 手動変動送信失敗:", e);
      warn("株価変動の送信に失敗しました");
    }
  };

  // 攻撃（カード発動）
  const handleAttack = async (effectAmount) => {
    if (!chRef.current) return;
    // 必ずターゲット選択が必要（人数に関係なく）
    if (!selectedTarget) return warn("ターゲットを選択してください");

    if (atb < ATB_MAX) return warn("ATBが不足しています");
    setAtb(0);

    try {
      await chRef.current.publish("attack", {
        targetId: selectedTarget,
        effectAmount,
        attackerId: clientId,
      });
      pushLog(`🃏 攻撃発動 → ${selectedTarget}: −${Math.abs(effectAmount)}`);
      ok(`${allPlayers[selectedTarget]?.name || selectedTarget} の株を ${Math.abs(effectAmount)} 減らしました`);
    } catch (e) {
      console.error("❌ 攻撃送信失敗:", e);
      warn("攻撃の送信に失敗しました");
    }
  };

  // ターゲット選択
  const handleTargetSelect = (targetId) => setSelectedTarget(targetId);

  // 他プレイヤー一覧
  const otherPlayers = Object.keys(allPlayers)
    .filter((id) => id !== clientId)
    .map((id) => ({ id, name: allPlayers[id].name, holding: allPlayers[id].holding }));

  // バッジ
  const statusBadge =
    status === "connected" ? { text: "接続中", color: "#10b981" } :
    status === "connecting" ? { text: "接続中...", color: "#f59e0b" } :
    { text: "切断", color: "#ef4444" };

  // ログ／メッセージ
  const pushLog = (line) => setLog((l) => [timestamp() + " " + line, ...l].slice(0, 200));
  const warn = (msg) => { setError("⚠️ " + msg); setTimeout(() => setError(""), 2500); };
  const ok   = (msg) => { setError("✅ " + msg); setTimeout(() => setError(""), 2500); };

  // --------- レイアウト（ワイヤーフレーム準拠） ----------
  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#f5f7fb" }}>
      {/* 左サイドバー（今はメモ欄） */}
      <SideBar
        side="left"
        open={leftOpen}
        onToggle={() => setLeftOpen((v) => !v)}
        width={260}
        title="メモ / ヘルプ"
      >
        <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.7 }}>
          ・ゲームのヒントを書けます。<br/>
          ・ショートカットキーやルール説明など。<br/>
          ・必要に応じて好きな内容に差し替えてください。
        </div>
      </SideBar>

      {/* 右サイドバー：ログ＆他プレイヤー */}
      <SideBar
        side="right"
        open={rightOpen}
        onToggle={() => setRightOpen((v) => !v)}
        width={300}
        title="ログ"
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div style={cardBox}>
            {log.length === 0 ? (
              <div style={{ opacity: 0.6, fontSize: 12 }}>まだログはありません</div>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
                {log.map((t, i) => (
                  <li key={i} style={{ fontSize: 12, color: "#111827" }}>{t}</li>
                ))}
              </ul>
            )}
          </div>

          <div style={{ fontWeight: 700, color: "#111827" }}>他プレイヤー</div>
          {otherPlayers.length === 0 ? (
            <div style={cardBox}>参加者を待っています…</div>
          ) : (
            otherPlayers.map((p) => (
              <button
                key={p.id}
                onClick={() => handleTargetSelect(p.id)}
                style={{
                  ...cardBox,
                  textAlign: "left",
                  border: selectedTarget === p.id ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                  background: selectedTarget === p.id ? "#e8f1ff" : "#fff",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 700 }}>👤 {p.name}</div>
                <div style={{ marginTop: 6, color: "#6b7280", fontSize: 12 }}>ID: {p.id.slice(0, 8)}…</div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>📊 保有株: {p.holding} 株</div>
              </button>
            ))
          )}
        </div>
      </SideBar>

      {/* ヘッダー */}
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "20px 24px 8px", display: "flex", gap: 12, alignItems: "center" }}>
        <h1 style={{ margin: 0, fontSize: 24, color: "#111827" }}>株価ゲーム 📈</h1>
        <span style={{
          background: statusBadge.color,
          color: "#fff",
          padding: "6px 12px",
          borderRadius: 12,
          fontSize: 12,
          fontWeight: 700
        }}>
          {statusBadge.text}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={() => setLeftOpen((v) => !v)}  style={chip}>⟵ 左パネル</button>
          <button onClick={() => setRightOpen((v) => !v)} style={chip}>右パネル ⟶</button>
        </div>
      </div>

      {error && (
        <div style={{
          maxWidth: 1240, margin: "0 auto", padding: "0 24px 8px",
          color: error.startsWith("✅") ? "#16a34a" : "#dc2626",
        }}>
          {error}
        </div>
      )}

      {/* 中央メイン：チャート／ATB／カード＆ユーザーパネル */}
      <main style={{ maxWidth: 1240, margin: "0 auto", padding: "0 24px 32px" }}>
        {/* 上段：チャート */}
        {stockData.length > 0 && (
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, boxShadow: "0 4px 10px rgba(0,0,0,0.04)" }}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: "#111827" }}>株価チャート</div>
            <StockChart stockData={stockData} />
          </div>
        )}

        {/* ATBゲージ */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>ATBゲージ</div>
          <div style={{ height: 12, background: "#e5e7eb", borderRadius: 9999, overflow: "hidden" }}>
            <div style={{
              width: `${(atb / ATB_MAX) * 100}%`,
              height: "100%",
              background: atb >= ATB_MAX ? "#10b981" : "#60a5fa",
              transition: "width .1s linear",
            }} />
          </div>
        </div>

        {/* 中段：カード／ユーザーパネル */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16, marginTop: 16 }}>
          {/* カード（相手未選択だとCardList内ボタンを押しても攻撃不可：handleAttackでブロック） */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, boxShadow: "0 4px 10px rgba(0,0,0,0.04)" }}>
            <div style={{ fontWeight: 700, marginBottom: 12, color: "#111827" }}>カード</div>
            <CardList
              onButtonClick={handleAttack}
              selectedTarget={selectedTarget}
              hasTargets={otherPlayers.length >= 1}
            />
          </div>

          {/* 右のユーザーパネル（所持金・現在値・数量・BUY/SELL・保有株） */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, boxShadow: "0 4px 10px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ fontWeight: 700, color: "#111827" }}>ユーザー情報</div>
              <PlayerInfo money={money} holding={holding} roomNumber={roomNumber || ""} />

              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ color: "#6b7280", fontSize: 12 }}>現在の 1 株の値段</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>
                  ¥{stockData.length ? stockData[stockData.length - 1].price.toLocaleString() : "—"}
                </div>
              </div>

              {/* 数量 + BUY/SELL */}
              <TradeBox
                canAct={atb >= ATB_MAX}
                onActed={() => setAtb(0)}
                stockData={stockData}
                money={money}
                holding={holding}
                setMoney={setMoney}
                setHolding={setHolding}
              />
            </div>
          </div>
        </div>

        {/* 下段：価格変動ボタン（既存コンポーネント） */}
        {stockData.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <ControlButtons onButtonClick={handleButtonClick} />
          </div>
        )}
      </main>
    </div>
  );
}

/* ---------- 小さな部品 ---------- */

// トレードUI（ローカル計算のみ。同期が必要ならAblyイベント化してください）
function TradeBox({ canAct, onActed, stockData, money, holding, setMoney, setHolding }) {
  const [qty, setQty] = useState(100);
  const price = stockData.length ? stockData[stockData.length - 1].price : 0;

  const buy = () => {
    if (!canAct) return;
    const cost = qty * price;
    if (money < cost) return;
    setMoney(money - cost);
    setHolding(holding + qty);
    onActed();
  };

  const sell = () => {
    if (!canAct) return;
    if (holding < qty) return;
    const income = qty * price;
    setMoney(money + income);
    setHolding(Math.max(0, holding - qty));
    onActed();
  };

  return (
    <div style={{
      background: "#f9fafb",
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      padding: 12
    }}>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 10, alignItems: "center" }}>
          <div style={{ color: "#111827", fontWeight: 700 }}>数量</div>
          <input
            type="number"
            min={1}
            step={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#fff",
            }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button
            onClick={buy}
            disabled={!canAct || money < qty * price}
            style={btnGreen}
          >
            Buy
          </button>
          <button
            onClick={sell}
            disabled={!canAct || holding < qty}
            style={btnRed}
          >
            SELL
          </button>
        </div>

        <div style={{
          marginTop: 6,
          fontSize: 12,
          color: canAct ? "#16a34a" : "#6b7280",
          fontWeight: 700
        }}>
          {canAct ? "行動可能" : "ATBが溜まるまで待機中…"}
        </div>
      </div>
    </div>
  );
}

// サイドバー（左右共通）
function SideBar({ side, open, onToggle, width, title, children }) {
  const isLeft = side === "left";
  return (
    <aside
      style={{
        position: "fixed",
        top: 0,
        bottom: 0,
        [isLeft ? "left" : "right"]: 0,
        width,
        transform: `translateX(${open ? "0%" : isLeft ? "-95%" : "95%"})`,
        transition: "transform .25s ease",
        background: "#ffffff",
        borderLeft: isLeft ? "none" : "1px solid #e5e7eb",
        borderRight: isLeft ? "1px solid #e5e7eb" : "none",
        boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        padding: "16px 16px 16px",
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* トグルタブ */}
      <button
        onClick={onToggle}
        aria-label="toggle sidebar"
        style={{
          position: "absolute",
          top: 80,
          [isLeft ? "right" : "left"]: -28,
          width: 28,
          height: 56,
          borderRadius: isLeft ? "0 8px 8px 0" : "8px 0 0 8px",
          border: "1px solid #e5e7eb",
          background: "#fff",
          boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
          cursor: "pointer",
        }}
      >
        {isLeft ? (open ? "◀" : "▶") : (open ? "▶" : "◀")}
      </button>

      <div style={{ fontWeight: 800, color: "#111827" }}>{title}</div>
      <div style={{ overflow: "auto" }}>{children}</div>
    </aside>
  );
}

/* ---------- スタイル小物 ---------- */
const chip = {
  padding: "6px 10px",
  borderRadius: 9999,
  background: "#111827",
  color: "#fff",
  border: "1px solid #111827",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
};

const cardBox = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 12,
  boxShadow: "0 4px 10px rgba(0,0,0,0.04)",
};

const btnGreen = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #16a34a",
  background: "#16a34a",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const btnRed = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #ef4444",
  background: "#ef4444",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

function timestamp() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}
