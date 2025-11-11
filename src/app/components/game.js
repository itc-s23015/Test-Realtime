"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Ably from "ably";
import StockChart from "./StockChart";
import PlayerInfo from "./PlayerInfo";
import ControlButtons from "./ControlButtons";
import CardList from "./card";

// 初期値
const INITIAL_MONEY = 100000;
const INITIAL_HOLDING = 10;
const AUTO_UPDATE_INTERVAL = 10000;

// ダミー株価生成
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

// サイドバー
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
        padding: "16px",
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <button
        onClick={onToggle}
        style={{
          position: "absolute",
          top: 80,
          [isLeft ? "right" : "left"]: -28,
          width: 28,
          height: 56,
          borderRadius: "0 8px 8px 0",
          background: "#fff",
          boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
          cursor: "pointer",
        }}
      >
        {isLeft ? (open ? "◀" : "▶") : open ? "▶" : "◀"}
      </button>
      <div style={{ fontWeight: 800, color: "#111827" }}>{title}</div>
      <div style={{ overflow: "auto" }}>{children}</div>
    </aside>
  );
}

// ログ
function Log({ log = [] }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 10,
        height: 300,
        color: "#000",
        overflow: "auto",
      }}
    >
      {log.length === 0 ? (
        <div style={{ opacity: 0.6, fontSize: 12 }}>ログはまだありません</div>
      ) : (
        log
          .slice()
          .reverse()
          .map((l, i) => (
            <div key={i} style={{ fontSize: 12, lineHeight: 1.4 }}>
              {l}
            </div>
          ))
      )}
    </div>
  );
}

// 右サイドバーのユーザー一覧（未選択=薄い黒枠、選択中=濃い黒枠）
function UserList({ players, selfId, selectedId, onSelect }) {
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontWeight: 800, color: "#111827", marginBottom: 6 }}>ユーザー一覧</div>
      <div style={{ borderTop: "1px solid #e5e7eb" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
        {players.length === 0 ? (
          <div style={{ fontSize: 12, color: "#6b7280" }}>参加者なし</div>
        ) : (
          players.map((p) => {
            const isSelf = p.id === selfId;
            const isSelected = p.id === selectedId;

            const baseBox = {
              textAlign: "left",
              padding: "10px 12px",
              borderRadius: 10,
              background: "#fff",
              cursor: isSelf ? "not-allowed" : "pointer",
              opacity: isSelf ? 0.6 : 1,
              // 未選択でも常に薄い黒枠
              border: "1px solid rgba(0, 0, 0, 1)",
              // 選択時は濃い黒枠を外側に追加（より目立つ）
              boxShadow: isSelected ? "0 0 0 2px rgba(0, 0, 0, 1)" : "none",
              transition: "box-shadow .15s ease",
            };

            return (
              <button
                key={p.id}
                onClick={() => !isSelf && onSelect(p.id)}
                disabled={isSelf}
                title={isSelf ? "自分は選択できません" : "ターゲットに設定"}
                aria-pressed={isSelected}
                style={baseBox}
              >
                <div style={{ fontWeight: 700, color: "#111827" }}>
                  {p.name} {isSelf ? "(自分)" : ""}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>ID: {p.id.slice(0, 8)}…</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>📊 保有株: {p.holding} 株</div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

const Game = () => {
  const router = useRouter();

  const [roomNumber, setRoomNumber] = useState(null);
  const [error, setError] = useState("");
  const [stockData, setStockData] = useState([]);
  const [money, setMoney] = useState(INITIAL_MONEY);
  const [holding, setHolding] = useState(INITIAL_HOLDING);
  const [allPlayers, setAllPlayers] = useState({});
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [status, setStatus] = useState("connecting");

  // ログ
  const [logs, setLogs] = useState([]);
  const addLog = (m) => setLogs((prev) => [...prev, m]);

  // サイドバー
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const handleLeftSidebarToggle = () => setIsLeftSidebarOpen((v) => !v);
  const handleRightSidebarToggle = () => setIsRightSidebarOpen((v) => !v);

  // Refs
  const clientRef = useRef(null);
  const chRef = useRef(null);
  const autoTimerRef = useRef(null);
  const navigatingRef = useRef(false);
  const initializedRef = useRef(false);

  const holdingRef = useRef(holding);
  const moneyRef = useRef(money);
  useEffect(() => {
    holdingRef.current = holding;
  }, [holding]);
  useEffect(() => {
    moneyRef.current = money;
  }, [money]);

  const clientId = useMemo(() => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem("playerName") || `player-${crypto.randomUUID().slice(0, 6)}`;
  }, []);

  const roomU = useMemo(() => {
    if (!roomNumber) return "";
    return roomNumber.toUpperCase();
  }, [roomNumber]);

  const updatePresence = useCallback(
    async (newMoney, newHolding) => {
      if (!chRef.current) return;
      try {
        await chRef.current.presence.update({
          name: clientId,
          money: newMoney,
          holding: newHolding,
        });
        console.log("✅ Presence更新:", { money: newMoney, holding: newHolding });
      } catch (e) {
        console.error("❌ Presence更新失敗:", e);
      }
    },
    [clientId]
  );

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const room = query.get("room");
    if (!room) {
      setError("ルーム番号が指定されていません");
      router.push("/");
      return;
    }
    setRoomNumber(room.toUpperCase());
  }, [router]);

  useEffect(() => {
    if (!roomU || !clientId || initializedRef.current) return;

    initializedRef.current = true;
    console.log("🎮 ゲーム画面初期化:", roomU);

    const client = new Ably.Realtime.Promise({
      authUrl: `/api/ably-token?clientId=${encodeURIComponent(clientId)}&room=${encodeURIComponent(roomU)}`,
      closeOnUnload: false,
    });
    clientRef.current = client;

    client.connection.on(({ current }) => {
      setStatus(current);
      console.log("📡 接続状態:", current);
    });

    client.connection.once("connected", async () => {
      const channelName = `rooms:${roomU}`;
      const ch = client.channels.get(channelName);
      chRef.current = ch;

      await ch.attach();
      console.log("✅ チャンネル接続:", channelName);

      await ch.presence.enter({
        name: clientId,
        money: INITIAL_MONEY,
        holding: INITIAL_HOLDING,
      });

      // 対戦開始ログ
      addLog("🎮 対戦が開始されました！");

      await refreshPlayers();
      ch.presence.subscribe(["enter", "leave", "update"], refreshPlayers);

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

      ch.subscribe("stock-init", (msg) => setStockData(msg.data.data));

      ch.subscribe("stock-update", (msg) => {
        setStockData(msg.data.stockData);
        const changeMessage =
          msg.data.changeAmount > 0
            ? `株価が${Math.abs(msg.data.changeAmount)}円上昇しました`
            : `株価が${Math.abs(msg.data.changeAmount)}円下降しました`;
        addLog(changeMessage);
      });

      ch.subscribe("attack", async (msg) => {
        if (msg.data.targetId === clientId) {
          const currentHolding = holdingRef.current;
          const currentMoney = moneyRef.current;
          const newHolding = Math.max(0, currentHolding + msg.data.effectAmount);
          setHolding(newHolding);
          setTimeout(() => updatePresence(currentMoney, newHolding), 50);
          addLog(`⚔️ 攻撃を受けました！保有株が ${Math.abs(msg.data.effectAmount)} 株減少`);
          setTimeout(() => setError(""), 3000);
        }
      });

      async function refreshPlayers() {
        const mem = await ch.presence.get();
        const players = {};
        mem.forEach((m) => {
          players[m.clientId] = {
            name: m.data?.name || m.clientId,
            money: m.data?.money || INITIAL_MONEY,
            holding: m.data?.holding || INITIAL_HOLDING,
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
        } catch (e) {
          console.warn("クリーンアップ中のエラー:", e);
        }
        const doClose = () => {
          try {
            if (clientRef.current) clientRef.current.close();
          } catch (e) {
            console.warn("接続クローズ中のエラー:", e);
          }
        };
        if (navigatingRef.current) setTimeout(doClose, 200);
        else doClose();
      };
      cleanup();
    };
  }, [roomU, clientId, router, updatePresence]);

  const startAutoUpdate = (ch, initialData) => {
    if (autoTimerRef.current) return;
    let currentData = [...initialData];

    autoTimerRef.current = setInterval(async () => {
      const lastPrice = currentData[currentData.length - 1].price;
      const changeAmount = Math.floor((Math.random() - 0.5) * 600);
      const newPrice = Math.round(Math.max(10000, Math.min(20000, lastPrice + changeAmount)));

      const lastDate = new Date(currentData[currentData.length - 1].date);
      lastDate.setDate(lastDate.getDate() + 10);

      const newPoint = {
        date: lastDate.toISOString(),
        price: newPrice,
        volume: Math.floor(Math.random() * 100000000) + 50000000,
      };

      currentData[currentData.length - 1] = {
        ...currentData[currentData.length - 1],
        price: newPrice,
        volume: Math.floor(Math.random() * 100000000) + 50000000,
      };

      if (currentData.length >= 180) currentData = [...currentData.slice(1), newPoint];
      else currentData = [...currentData, newPoint];

      setStockData([...currentData]);

      try {
        await ch.publish("stock-update", { stockData: currentData, changeAmount, isAuto: true });
      } catch (e) {
        console.error("❌ 自動変動送信失敗:", e);
      }
    }, AUTO_UPDATE_INTERVAL);
  };

  const handleButtonClick = async (changeAmount) => {
    if (!chRef.current || stockData.length === 0) return;

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

    setStockData(newData);

    const changeMessage =
      changeAmount > 0
        ? `株価が${Math.abs(changeAmount)}円上昇しました`
        : `株価が${Math.abs(changeAmount)}円下降しました`;
    addLog(changeMessage);

    try {
      await chRef.current.publish("stock-update", { stockData: newData, changeAmount, isAuto: false });
    } catch (e) {
      console.error("❌ 手動変動送信失敗:", e);
      setError("株価変動の送信に失敗しました");
    }
  };

  // 攻撃（ターゲット必須）
  const handleAttack = async (effectAmount) => {
    if (!chRef.current) return;

    const otherIds = Object.keys(allPlayers).filter((id) => id !== clientId);
    if (otherIds.length >= 1 && !selectedTarget) {
      setError("❌ ターゲットを選択してください");
      setTimeout(() => setError(""), 3000);
      return;
    }
    const targetId = selectedTarget || otherIds[0];

    try {
      await chRef.current.publish("attack", {
        targetId,
        effectAmount,
        attackerId: clientId,
      });
      const n = allPlayers[targetId]?.name || targetId;
      addLog(`✅ 攻撃成功！${n} の株を ${Math.abs(effectAmount)} 株減らしました`);
      setTimeout(() => setError(""), 3000);
    } catch (e) {
      console.error("❌ 攻撃送信失敗:", e);
      setError("攻撃の送信に失敗しました");
    }
  };

  // ここがクリック選択の入口（右サイドバーでクリック）
  const handleTargetSelect = (targetId) => {
    setSelectedTarget(targetId);
    const n = allPlayers[targetId]?.name || targetId;
    addLog(`🎯 ターゲットを ${n} に設定しました`);
  };

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
    <div style={{ width: "100%", minHeight: "100vh", backgroundColor: "#f9fafb", padding: "32px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <h1 style={{ textAlign: "center", fontSize: 32, fontWeight: "bold", color: "#111827", margin: 0 }}>
            株価ゲーム 📈
          </h1>
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
        </div>

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

        {roomNumber && money !== null && holding !== null && (
          <PlayerInfo money={money} holding={holding} roomNumber={roomNumber} />
        )}

        {/* 中央の表示は「現在のターゲット」だけ（選択は右サイドバーで） */}
        {otherPlayers.length > 0 && (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 12,
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              marginTop: 16,
              padding: 16,
              fontSize: 14,
              color: "#111827",
            }}
          >
            🎯 ターゲット:
            <span style={{ fontWeight: 700, marginLeft: 6 }}>
              {selectedTarget ? (allPlayers[selectedTarget]?.name || selectedTarget.slice(0, 8)) : "未選択"}
            </span>
            <span style={{ color: "#6b7280", marginLeft: 8 }}>(サイドバーのユーザー名をクリックで変更)</span>
          </div>
        )}

        {stockData.length > 0 && <StockChart stockData={stockData} />}

        {stockData.length > 0 && <ControlButtons onButtonClick={handleButtonClick} />}

        {otherPlayers.length > 0 && (
          <CardList
            onButtonClick={(amt) => handleAttack(amt)}
            selectedTarget={selectedTarget}
            hasTargets={otherPlayers.length >= 1}
          />
        )}
      </div>

      {/* 左サイドバー */}
      <SideBar side="left" open={isLeftSidebarOpen} onToggle={handleLeftSidebarToggle} width="300px" title="プレイヤー情報">
        <div>プレイヤー情報やターゲット状況など</div>
      </SideBar>

      {/* 右サイドバー：ログ + クリック可能なユーザー一覧 */}
      <SideBar side="right" open={isRightSidebarOpen} onToggle={handleRightSidebarToggle} width="300px" title="ログ / ユーザー一覧">
        <Log log={logs} />
        <UserList
          players={Object.keys(allPlayers).map((id) => ({
            id,
            name: allPlayers[id].name,
            holding: allPlayers[id].holding,
          }))}
          selfId={clientId}
          selectedId={selectedTarget}
          onSelect={handleTargetSelect}
        />
      </SideBar>
    </div>
  );
};

export default Game;
