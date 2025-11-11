"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Ably from "ably";
import StockChart from "./StockChart";
import PlayerInfo from "./PlayerInfo";
import GameTimer from "./GameTimer";
import { CARD_TYPES, CARD_DEFINITIONS, executeCardEffect } from "./cardDefinitions";
import Hand from "./Hand";
<<<<<<< HEAD
import ResultModal from "../game/ResultModal";

=======
import SideBar from "./SideBar";
import Log from "./Log";
import TargetSelector from "./TargetSelector";
import styles from "../styles/game.module.css";
>>>>>>> main

// ====== 定数 ======
const INITIAL_MONEY = 100000;
const INITIAL_HOLDING = 10;
const AUTO_UPDATE_INTERVAL = 2000;     // 価格自動配信間隔（2秒）
<<<<<<< HEAD
const GAME_DURATION = 300;             // 秒
const RESULT_WAIT_MS = 1500;           //

=======
const GAME_DURATION = 300;             // ゲーム時間（秒）
>>>>>>> main

// 初期手札
function getInitialHand() {
  return [
    { id: CARD_TYPES.REDUCE_HOLDINGS_SMALL },
    { id: CARD_TYPES.REDUCE_HOLDINGS_MEDIUM },
    { id: CARD_TYPES.REDUCE_HOLDINGS_LARGE },
  ];
}

// ダミー株価データ生成
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

<<<<<<< HEAD
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
=======
// ====== メインコンポーネント ======
>>>>>>> main
export default function Game() {
  const router = useRouter();

  // 状態管理
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
    // ゲーム終了 & 結果
  const [isGameOver, setIsGameOver] = useState(false);
  const [results, setResults] = useState([]); // {id,name,money,holding,price,score}[]
  const resultsMapRef = useRef(new Map());    // 重複上書き用


  // サイドバー開閉状態
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  // 参照（Ref）
  const clientRef = useRef(null);
  const chRef = useRef(null);
  const autoTimerRef = useRef(null);
  const navigatingRef = useRef(false);
  const initializedRef = useRef(false);
  const holdingRef = useRef(holding);
  const moneyRef = useRef(money);

  // Refの同期
  useEffect(() => {
    holdingRef.current = holding;
  }, [holding]);
  
  useEffect(() => {
    moneyRef.current = money;
  }, [money]);

  // クライアントID生成
  const clientId = useMemo(() => {
    if (typeof window === "undefined") return "";
    return (
      sessionStorage.getItem("playerName") ||
      `player-${crypto.randomUUID().slice(0, 6)}`
    );
  }, []);

  // ルーム番号（大文字化）
  const roomU = useMemo(
    () => (roomNumber ? roomNumber.toUpperCase() : ""),
    [roomNumber]
  );

  // ユーティリティ関数
  const addLog = (message) => setLogs((prev) => [...prev, message]);

  // Presence更新関数
  const updatePresence = useCallback(
    async (newMoney, newHolding) => {
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
    },
    [clientId]
  );

  // URLからルーム番号取得
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

  // Ably接続とイベント処理
  useEffect(() => {
    if (!roomU || !clientId || initializedRef.current) return;
    initializedRef.current = true;

    // Ablyクライアント初期化
    const client = new Ably.Realtime.Promise({
      authUrl: `/api/ably-token?clientId=${encodeURIComponent(
        clientId
      )}&room=${encodeURIComponent(roomU)}`,
      closeOnUnload: false,
    });
    clientRef.current = client;

    // 接続状態監視
    client.connection.on(({ current }) => {
      setStatus(current);
      if (current === "failed" || current === "suspended") {
        setError("⚠️ 接続が切断されました。再読み込みしてください。");
      }
    });

    // 接続完了時の処理
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

      // ホスト決定（clientIdの辞書順最小）
      const members = await ch.presence.get();
      const ids = members.map((m) => m.clientId).sort();
      const isHost = ids[0] === clientId;

      // ホストのみ株価データ初期化と配信開始
      if (isHost) {
        const seed = Date.now();
        const initialData = generateStockData(seed);
        setStockData(initialData);
        await ch.publish("stock-init", {
          seed,
          data: initialData,
          by: clientId,
        });
        startAutoUpdate(ch, initialData);
      }

      // イベント受信設定
      
      // 株価初期化イベント
      ch.subscribe("stock-init", (msg) => {
        setStockData(msg.data.data);
      });

      // 株価更新イベント
      ch.subscribe("stock-update", (msg) => {
        setStockData(msg.data.stockData);
        const change = msg.data.changeAmount;
        addLog(
          change > 0
            ? `📈 株価が ${Math.abs(change)} 円上昇`
            : `📉 株価が ${Math.abs(change)} 円下降`
        );
      });

      // カード使用イベント
      ch.subscribe("card-used", (msg) => {
        const { cardId, playerId, targetId } = msg.data || {};
        if (!cardId || !playerId) return;

        // 自分がターゲットの場合、効果を適用
        if (targetId === clientId) {
          const snapshot = {
            ...allPlayers,
            [clientId]: {
              ...(allPlayers[clientId] ?? {
                name: clientId,
                money: moneyRef.current,
                holding: holdingRef.current,
              }),
            },
          };
          
          const result = executeCardEffect(
            cardId,
            { players: snapshot },
            playerId,
            targetId
          );
          
          if (result?.success && result?.needsSync) {
            const newHolding =
              result.gameState.players[clientId].holding ?? holdingRef.current;
            setHolding(newHolding);
            setTimeout(() => updatePresence(moneyRef.current, newHolding), 50);
            setError(
              `⚔️ ${CARD_DEFINITIONS[cardId]?.name || "カード"} を受けました！`
            );
            setTimeout(() => setError(""), 3000);
          }
        }

        addLog(
          `🃏 ${playerId} が ${
            CARD_DEFINITIONS[cardId]?.name || cardId
          } を使用`
        );
      });

<<<<<<< HEAD
           // === 終了結果の購読 ===
        ch.subscribe("game-over", (msg) => {
          const r = msg.data || {};
          if (!r.playerId) return;
          // 同じplayerIdの結果は上書き
          resultsMapRef.current.set(r.playerId, r);
          setResults(Array.from(resultsMapRef.current.values()));
          setIsGameOver(true);
      });

=======
      // プレイヤー情報更新関数
>>>>>>> main
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

    // クリーンアップ処理
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
                new Promise((_, reject) =>
                  setTimeout(() => reject(new Error("timeout")), 1000)
                ),
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
 
 // ====== タイムアップ処理（全員で発火してOK：Mapで重複吸収） ======
  useEffect(() => {
    if (!roomU || !clientId || !chRef.current) return;
    // 接続後にゲーム時間カウント開始
    const t = setTimeout(() => onTimeUp(), GAME_DURATION * 1000);
    return () => clearTimeout(t);
  }, [roomU, clientId]);

  const onTimeUp = async () => {
    if (!chRef.current) return;
    const price = stockData.length ? stockData[stockData.length - 1].price : 0;
    const moneyNow = moneyRef.current;
    const holdingNow = holdingRef.current;
    const score = Math.max(0, Math.round(moneyNow + holdingNow * price));
    const payload = {
      type: "result",
      playerId: clientId,
      name: allPlayers[clientId]?.name || clientId,
      money: moneyNow,
      holding: holdingNow,
      price,
      score,
      ts: Date.now(),
    };
    try {
      await chRef.current.publish("game-over", payload);
      // 自分分も即時反映
      resultsMapRef.current.set(clientId, payload);
      setResults(Array.from(resultsMapRef.current.values()));
      // 少し待ってから確実にモーダルを開く
      setTimeout(() => setIsGameOver(true), RESULT_WAIT_MS);
    } catch (e) {
      console.error("❌ 結果送信失敗:", e);
      setIsGameOver(true); // それでも自分の結果は出す
    }
  };

  // 自動株価更新（ホストのみ）
  const startAutoUpdate = (ch, initialData) => {
    if (autoTimerRef.current) return;
    let currentData = [...initialData];

    autoTimerRef.current = setInterval(async () => {
      const last = currentData[currentData.length - 1];
      const lastPrice = last.price;
      const changeAmount = Math.round((Math.random() - 0.5) * 600);
      const newPrice = Math.max(
        10000,
        Math.min(20000, lastPrice + changeAmount)
      );

      const lastDate = new Date(last.date);
      lastDate.setSeconds(lastDate.getSeconds() + 2);

      const newPoint = {
        date: lastDate.toISOString(),
        price: Math.round(newPrice),
        volume: Math.floor(Math.random() * 100000000) + 50_000_000,
      };

      // 最大180件を保持
      if (currentData.length >= 180) {
        currentData = [...currentData.slice(1), newPoint];
      } else {
        currentData = [...currentData, newPoint];
      }

      setStockData(currentData);
      
      try {
        await ch.publish("stock-update", {
          stockData: currentData,
          changeAmount,
          isAuto: true,
        });
      } catch (e) {
        console.error("❌ 自動変動送信失敗:", e);
      }
    }, AUTO_UPDATE_INTERVAL);
  };

  // カード使用ハンドラ
  const handlePlayCard = async (cardIndex) => {
    if (!chRef.current || cardIndex < 0 || cardIndex >= hand.length) return;
    
    const card = hand[cardIndex];
    const cardDef = CARD_DEFINITIONS[card.id];

    const others = Object.keys(allPlayers).filter((id) => id !== clientId);
    
    // ターゲット必須カードでターゲット未選択の場合
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
      
      // 手札から削除
      setHand((prev) => prev.filter((_, i) => i !== cardIndex));
      
      setError(`✅ ${cardDef?.name || "カード"} を使用しました！`);
      setTimeout(() => setError(""), 3000);
    } catch (e) {
      console.error("❌ カード使用送信失敗:", e);
      setError("カード使用の送信に失敗しました");
    }
  };

  // ターゲット選択ハンドラ
  const handleTargetSelect = (targetId) => setSelectedTarget(targetId);

  // 他のプレイヤー情報
  const otherPlayers = Object.keys(allPlayers)
    .filter((id) => id !== clientId)
    .map((id) => ({
      id,
      name: allPlayers[id].name,
      holding: allPlayers[id].holding,
    }));

  // ステータスバッジ設定
  const statusBadge =
    status === "connected"
      ? { text: "接続中", color: "#10b981" }
      : status === "connecting"
      ? { text: "接続中...", color: "#f59e0b" }
      : { text: "切断", color: "#ef4444" };

  // レンダリング
  return (
    <div className={styles.container}>
      <div className={styles.innerContainer}>
        {/* ヘッダー */}
        <div className={styles.header}>
          <h1 className={styles.title}>株価ゲーム 📈</h1>
          <span
            className={styles.statusBadge}
            style={{ backgroundColor: statusBadge.color }}
          >
            {statusBadge.text}
          </span>
          <div className={styles.timerWrapper}>
            <GameTimer
              duration={GAME_DURATION}
              onTimeUp={() => {
                console.log("タイマーが終了したので結果画面へ遷移します");
                router.push("/");
              }}
            />
          </div>
        </div>

        {/* エラー/成功メッセージバー */}
        {error && (
          <div
            className={`${styles.errorBar} ${
              error.startsWith("✅")
                ? styles.errorBarSuccess
                : styles.errorBarError
            }`}
          >
            {error.startsWith("✅") ? "" : "⚠️ "}
            {error}
          </div>
        )}

        {/* プレイヤー情報表示 */}
        {roomNumber && money !== null && holding !== null && (
          <PlayerInfo
            money={money}
            holding={holding}
            roomNumber={roomNumber}
          />
        )}

        {/* ターゲット選択UI */}
        <TargetSelector
          otherPlayers={otherPlayers}
          selectedTarget={selectedTarget}
          onTargetSelect={handleTargetSelect}
        />

        {/* 株価チャート */}
        {stockData.length > 0 && <StockChart stockData={stockData} />}

        {/* 手札表示 */}
        <Hand hand={hand} onPlay={handlePlayCard} maxHand={8} />
      </div>

      {/* 左サイドバー：メモ/ヘルプ */}
      <SideBar
        side="left"
        open={isLeftSidebarOpen}
        onToggle={() => setIsLeftSidebarOpen((v) => !v)}
        title="メモ / ヘルプ"
      >
        <div className={styles.memoContent}>
          ・ゲームのヒント/ルールを書けます。
          <br />
          ・必要に応じて好きな内容に差し替えてください。
        </div>
      </SideBar>

      {/* 右サイドバー：ログ＆ユーザー一覧 */}
      <SideBar
        side="right"
        open={isRightSidebarOpen}
        onToggle={() => setIsRightSidebarOpen((v) => !v)}
        title="ログ / ユーザー一覧"
      >
        <Log log={logs} />
        <div className={styles.userListTitle}>ユーザー一覧</div>
        <div>
          {Object.entries(allPlayers).map(([id, p]) => (
            <div key={id} className={styles.userListItem}>
              {p.name} — 保有株: {p.holding} 株
            </div>
          ))}
        </div>
      </SideBar>
            {/* === リザルトモーダル === */}
      <ResultModal
        open={isGameOver}
        results={results}
        onClose={() => setIsGameOver(false)}
        onRetry={() => {
          // 同じルームで再読み込み
          window.location.href = `/game?room=${encodeURIComponent(roomU)}`;
        }}
        onBack={() => {
          // ロビーへ
          window.location.href = `/lobby?room=${encodeURIComponent(roomU)}`;
        }}
      />
    </div>
  );
}