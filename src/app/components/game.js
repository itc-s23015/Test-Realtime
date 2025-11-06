"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Ably from "ably";
import StockChart from "./StockChart";
import PlayerInfo from "./PlayerInfo";
import ControlButtons from "./ControlButtons";
import GameTimer from "./GameTimer";
import { CARD_TYPES, CARD_DEFINITIONS, executeCardEffect } from "./cardDefinitions";
import Hand from "./Hand";

// ====== 定数 ======
const INITIAL_MONEY = 100000;
const INITIAL_HOLDING = 10;
const AUTO_UPDATE_INTERVAL = 2000;     // 価格自動配信間隔（2秒）
const GAME_DURATION = 300;             // 秒

// 初期手札（お好みで調整OK）
function getInitialHand() {
  return [
    { id: CARD_TYPES.REDUCE_HOLDINGS_SMALL },
    { id: CARD_TYPES.REDUCE_HOLDINGS_MEDIUM },
    { id: CARD_TYPES.REDUCE_HOLDINGS_LARGE },
  ];
}

// ダミー株価データ
function generateStockData(seed = Date.now()) {
  const data = [];
  let price = 15000;
  const startDate = new Date("2024-01-01");
  let random = seed;
  const rnd = () => {
    random = (random * 9301 + 49297) % 233280;
    return random / 233280;
  };
  for (let i = 0; i < 180; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    price += (rnd() - 0.48) * 500;
    price = Math.max(10000, Math.min(20000, price));
    data.push({
      date: date.toISOString(),
      price: Math.round(price),
      volume: Math.floor(rnd() * 100000000) + 50_000_000,
    });
  }
  return data;
}

// ====== UI 部品 ======
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
        padding: 16,
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
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

function Log({ log = [] }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #2a2a2a",
        borderRadius: 12,
        padding: 10,
        height: 300,
        color: "#000000",
        overflow: "auto",
      }}
    >
      {log.length === 0 ? (
        <div style={{ opacity: 0.6, fontSize: 12 }}>ログはまだありません</div>
      ) : (
        log.map((l, i) => (
          <div key={i} style={{ fontSize: 12, lineHeight: 1.4 }}>
            {l}
          </div>
        ))
      )}
    </div>
  );
}

// ====== メイン ======
export default function Game() {
  const router = useRouter();

  // 状態
  const [roomNumber, setRoomNumber] = useState(null);
  const [error, setError] = useState("");
  const [stockData, setStockData] = useState([]);
  const [money, setMoney] = useState(INITIAL_MONEY);
  const [holding, setHolding] = useState(INITIAL_HOLDING);
  const [allPlayers, setAllPlayers] = useState({});
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [status, setStatus] = useState("connecting");
  const [hand, setHand] = useState(getInitialHand());
  const [logs, setLogs] = useState([]);

  // サイドバー
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  // 参照
  const clientRef = useRef(null);
  const chRef = useRef(null);
  const autoTimerRef = useRef(null);
  const navigatingRef = useRef(false);
  const initializedRef = useRef(false);
  const holdingRef = useRef(holding);
  const moneyRef = useRef(money);

  useEffect(() => { holdingRef.current = holding; }, [holding]);
  useEffect(() => { moneyRef.current = money; }, [money]);

  const clientId = useMemo(() => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem("playerName") || `player-${crypto.randomUUID().slice(0, 6)}`;
  }, []);

  const roomU = useMemo(() => (roomNumber ? roomNumber.toUpperCase() : ""), [roomNumber]);

  // ユーティリティ
  const addLog = (message) => setLogs((prev) => [...prev, message]);
  const handleLeftSidebarToggle = () => setIsLeftSidebarOpen((v) => !v);
  const handleRightSidebarToggle = () => setIsRightSidebarOpen((v) => !v);

  // Presence 更新
  const updatePresence = useCallback(
    async (newMoney, newHolding) => {
      if (!chRef.current) return;
      try {
        await chRef.current.presence.update({
          name: clientId,
          money: newMoney,
          holding: newHolding,
        });
        // console.log("✅ Presence更新:", { newMoney, newHolding });
      } catch (e) {
        console.error("❌ Presence更新失敗:", e);
      }
    },
    [clientId]
  );

  // URLからroom取得
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

  // Ably 接続
  useEffect(() => {
    if (!roomU || !clientId || initializedRef.current) return;
    initializedRef.current = true;

    const client = new Ably.Realtime.Promise({
      authUrl: `/api/ably-token?clientId=${encodeURIComponent(clientId)}&room=${encodeURIComponent(roomU)}`,
      closeOnUnload: false,
    });
    clientRef.current = client;

    client.connection.on(({ current }) => {
      setStatus(current);
      if (current === "failed" || current === "suspended") {
        setError("⚠️ 接続が切断されました。再読み込みしてください。");
      }
    });

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

      addLog("🎮 対戦が開始されました！");

      await refreshPlayers();
      ch.presence.subscribe(["enter", "leave", "update"], refreshPlayers);

      // 簡易ホスト決定（clientId の辞書順最小）
      const members = await ch.presence.get();
      const ids = members.map((m) => m.clientId).sort();
      const isHost = ids[0] === clientId;

      if (isHost) {
        const seed = Date.now();
        const initialData = generateStockData(seed);
        setStockData(initialData);
        await ch.publish("stock-init", { seed, data: initialData, by: clientId });
        startAutoUpdate(ch, initialData);
      }

      // 受信イベント
      ch.subscribe("stock-init", (msg) => {
        setStockData(msg.data.data);
      });

      ch.subscribe("stock-update", (msg) => {
        setStockData(msg.data.stockData);
        const change = msg.data.changeAmount;
        addLog(change > 0 ? `📈 株価が ${Math.abs(change)} 円上昇` : `📉 株価が ${Math.abs(change)} 円下降`);
      });

      // カード使用イベント
      ch.subscribe("card-used", (msg) => {
        const { cardId, playerId, targetId } = msg.data || {};
        if (!cardId || !playerId) return;

        // 自分がターゲットなら効果を適用
        if (targetId === clientId) {
          const snapshot = {
            ...allPlayers,
            [clientId]: {
              ...(allPlayers[clientId] ?? { name: clientId, money: moneyRef.current, holding: holdingRef.current }),
            },
          };
          const result = executeCardEffect(cardId, { players: snapshot }, playerId, targetId);
          if (result?.success && result?.needsSync) {
            const newHolding = result.gameState.players[clientId].holding ?? holdingRef.current;
            setHolding(newHolding);
            setTimeout(() => updatePresence(moneyRef.current, newHolding), 50);
            setError(`⚔️ ${CARD_DEFINITIONS[cardId]?.name || "カード"} を受けました！`);
            setTimeout(() => setError(""), 3000);
          }
        }

        addLog(`🃏 ${playerId} が ${CARD_DEFINITIONS[cardId]?.name || cardId} を使用`);
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

    // クリーンアップ
    return () => {
      if (autoTimerRef.current) {
        clearInterval(autoTimerRef.current);
        autoTimerRef.current = null;
      }
      const cleanup = async () => {
        try {
          if (chRef.current) {
            chRef.current.unsubscribe();
            try {
              await Promise.race([
                chRef.current.presence.leave(),
                new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 1000)),
              ]);
            } catch {}
          }
        } catch {}
        try {
          clientRef.current?.close();
        } catch {}
      };
      if (navigatingRef.current) setTimeout(cleanup, 300);
      else cleanup();
    };
  }, [roomU, clientId, updatePresence]);

  // 自動価格配信（ホストのみ）
  const startAutoUpdate = (ch, initialData) => {
    if (autoTimerRef.current) return;
    let currentData = [...initialData];

    autoTimerRef.current = setInterval(async () => {
      const last = currentData[currentData.length - 1];
      const lastPrice = last.price;
      const changeAmount = Math.round((Math.random() - 0.5) * 600);
      const newPrice = Math.max(10000, Math.min(20000, lastPrice + changeAmount));

      const lastDate = new Date(last.date);
      lastDate.setSeconds(lastDate.getSeconds() + 2);

      const newPoint = {
        date: lastDate.toISOString(),
        price: Math.round(newPrice),
        volume: Math.floor(Math.random() * 100000000) + 50_000_000,
      };

      // 末尾に追加（180件を上限）
      if (currentData.length >= 180) {
        currentData = [...currentData.slice(1), newPoint];
      } else {
        currentData = [...currentData, newPoint];
      }

      setStockData(currentData);
      try {
        await ch.publish("stock-update", { stockData: currentData, changeAmount, isAuto: true });
      } catch (e) {
        console.error("❌ 自動変動送信失敗:", e);
      }
    }, AUTO_UPDATE_INTERVAL);
  };

  // 手動価格ボタン
  const handleButtonClick = async (changeAmount) => {
    if (!chRef.current || stockData.length === 0) return;

    const lastPrice = stockData[stockData.length - 1].price;
    const newPrice = Math.max(10000, Math.min(20000, lastPrice + changeAmount));
    const lastDate = new Date(stockData[stockData.length - 1].date);
    lastDate.setSeconds(lastDate.getSeconds() + 2);
    const newPoint = {
      date: lastDate.toISOString(),
      price: Math.round(newPrice),
      volume: Math.floor(Math.random() * 100000000) + 50_000_000,
    };

    const newData =
      stockData.length >= 180 ? [...stockData.slice(1), newPoint] : [...stockData, newPoint];

    setStockData(newData);
    addLog(changeAmount > 0 ? `🟦 手動：+${Math.abs(changeAmount)}` : `🟦 手動：-${Math.abs(changeAmount)}`);

    try {
      await chRef.current.publish("stock-update", { stockData: newData, changeAmount, isAuto: false });
    } catch (e) {
      console.error("❌ 手動変動送信失敗:", e);
      setError("株価変動の送信に失敗しました");
    }
  };

  // カード使用
  const handlePlayCard = async (cardIndex) => {
    if (!chRef.current || cardIndex < 0 || cardIndex >= hand.length) return;
    const card = hand[cardIndex];
    const cardDef = CARD_DEFINITIONS[card.id];

    const others = Object.keys(allPlayers).filter((id) => id !== clientId);
    if (cardDef?.needsTarget && others.length >= 1 && !selectedTarget) {
      setError("❌ ターゲットを選択してください");
      setTimeout(() => setError(""), 3000);
      return;
    }

    const targetId = selectedTarget || others[0] || null;

    try {
      await chRef.current.publish("card-used", {
        cardId: card.id,
        playerId: clientId,
        targetId,
        timestamp: Date.now(),
      });
      setHand((prev) => prev.filter((_, i) => i !== cardIndex));
      setError(`✅ ${cardDef?.name || "カード"} を使用しました！`);
      setTimeout(() => setError(""), 3000);
    } catch (e) {
      console.error("❌ カード使用送信失敗:", e);
      setError("カード使用の送信に失敗しました");
    }
  };

  const handleTargetSelect = (targetId) => setSelectedTarget(targetId);

  const otherPlayers = Object.keys(allPlayers)
    .filter((id) => id !== clientId)
    .map((id) => ({ id, name: allPlayers[id].name, holding: allPlayers[id].holding }));

  const statusBadge =
    status === "connected"
      ? { text: "接続中", color: "#10b981" }
      : status === "connecting"
      ? { text: "接続中...", color: "#f59e0b" }
      : { text: "切断", color: "#ef4444" };

  return (
    <div style={{ width: "100%", minHeight: "100vh", backgroundColor: "#f9fafb", padding: 32 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* ヘッダー */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: "bold", color: "#111827" }}>株価ゲーム 📈</h1>
          <span
            style={{
              background: statusBadge.color,
              color: "#fff",
              padding: "6px 12px",
              borderRadius: 12,
              fontSize: 12,
              fontWeight: "bold",
            }}
          >
            {statusBadge.text}
          </span>
          <div style={{ marginLeft: "auto" }}>
            <GameTimer totalSeconds={GAME_DURATION} />
          </div>
        </div>

        {/* エラーバー */}
        {error && (
          <div
            style={{
              color: error.startsWith("✅") ? "#16a34a" : "#dc2626",
              marginBottom: 20,
              padding: 16,
              backgroundColor: error.startsWith("✅") ? "#dcfce7" : "#fee2e2",
              borderRadius: 12,
              textAlign: "center",
              fontWeight: "bold",
              border: `2px solid ${error.startsWith("✅") ? "#16a34a" : "#dc2626"}`,
            }}
          >
            {error.startsWith("✅") ? "" : "⚠️ "}
            {error}
          </div>
        )}

        {/* プレイヤー情報 */}
        {roomNumber && money !== null && holding !== null && (
          <PlayerInfo money={money} holding={holding} roomNumber={roomNumber} />
        )}

        {/* ターゲット選択（任意） */}
        {otherPlayers.length > 0 && (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 12,
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              marginTop: 24,
              padding: 24,
            }}
          >
            <h2 style={{ marginBottom: 16, fontSize: 18, fontWeight: "bold", color: "#111827" }}>
              🎯 ターゲット選択 {otherPlayers.length >= 2 && "(必須)"}
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 12,
              }}
            >
              {otherPlayers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleTargetSelect(p.id)}
                  style={{
                    padding: 16,
                    borderRadius: 8,
                    border: selectedTarget === p.id ? "3px solid #3b82f6" : "2px solid #e5e7eb",
                    backgroundColor: selectedTarget === p.id ? "#dbeafe" : "white",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    textAlign: "left",
                  }}
                >
                  <div style={{ fontWeight: "bold", marginBottom: 8 }}>👤 {p.name}</div>
                  <div style={{ color: "#6b7280", fontSize: 14 }}>ID: {p.id.substring(0, 8)}…</div>
                  <div style={{ marginTop: 8, fontSize: 16, fontWeight: "bold" }}>📊 保有株: {p.holding} 株</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* チャート */}
        {stockData.length > 0 && <StockChart stockData={stockData} />}

        {/* 価格ボタン */}
        {stockData.length > 0 && <ControlButtons onButtonClick={handleButtonClick} />}

        {/* 手札 */}
        <Hand hand={hand} onPlay={handlePlayCard} maxHand={8} />
      </div>

      {/* 左：メモ欄など自由枠 */}
      <SideBar
        side="left"
        open={isLeftSidebarOpen}
        onToggle={handleLeftSidebarToggle}
        width={300}
        title="メモ / ヘルプ"
      >
        <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.7 }}>
          ・ゲームのヒント/ルールを書けます。<br />
          ・必要に応じて好きな内容に差し替えてください。
        </div>
      </SideBar>

      {/* 右：ログ＆ユーザー一覧 */}
      <SideBar
        side="right"
        open={isRightSidebarOpen}
        onToggle={handleRightSidebarToggle}
        width={300}
        title="ログ / ユーザー一覧"
      >
        <Log log={logs} />
        <div style={{ fontWeight: "bold", marginTop: 20 }}>ユーザー一覧</div>
        <div>
          {Object.entries(allPlayers).map(([id, p]) => (
            <div key={id} style={{ padding: 8, borderBottom: "1px solid #e5e7eb" }}>
              {p.name} — 保有株: {p.holding} 株
            </div>
          ))}
        </div>
      </SideBar>
    </div>
  );
}
