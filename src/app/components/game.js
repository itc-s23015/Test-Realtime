"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Ably from "ably";
import StockChart from "./StockChart";
import PlayerInfo from "./PlayerInfo";
import GameTimer from "./GameTimer";
import TradingPanel from "./TradingPanel";
import { CARD_TYPES, CARD_DEFINITIONS, executeCardEffect, drawRandomCard, drawCards, createSeededRng } from "./cardDefinitions";
import Hand from "./Hand";
import SideBar from "./SideBar";
import Log from "./Log";
import TargetSelector from "./TargetSelector";
import RightUserList from "./RightUserList";
import styles from "../styles/game.module.css";
import  ResultModal  from "../game/ResultModal";
import StartCountdown from "./StartCountdown";
import useATB from "./atb/useATB";
import ATBBar from "./ATBBar";


// ====== 定数 ======
const INITIAL_MONEY = 100000;
const INITIAL_HOLDING = 10;
const AUTO_UPDATE_INTERVAL = 2000;     // 価格自動配信間隔（2秒）
const GAME_DURATION = 300;             // ゲーム時間（秒）
const MAX_HAND_SIZE = 8;              // 最大手札枚数
const CARD_DRAW_INTERVAL = 10000;    // 手札補充間隔（10秒）

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

function strToSeed(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + ( hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash) >>> 0;
}

// ====== メインコンポーネント ======
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
  const [hand, setHand] = useState([]);
  const [logs, setLogs] = useState([]);

  // ゲーム終了 & 結果
  const [isGameOver, setIsGameOver] = useState(false);
  const [results, setResults] = useState([]);
  const resultsMapRef = useRef(new Map());

   //カウントダウン
  const [showStartCD, setShowStartCD] = useState(false);
  const [countdownStartAt, setCountdownStartAt] = useState(null);
  
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
  const handRef = useRef(hand);
  const rngRef = useRef(null);
  const drawTimerRef = useRef(null);
  const isGameOverRef = useRef(false);

  // Refの同期
  useEffect(() => {
    holdingRef.current = holding;
  }, [holding]);
  
  useEffect(() => {
    moneyRef.current = money;
  }, [money]);

  useEffect(() => {
    handRef.current = hand;
  }, [hand]);

  useEffect(() => {
    isGameOverRef.current = isGameOver;
  }, [isGameOver]);

  useEffect(() => {
    if (isGameOver) {
      if (autoTimerRef.current) {
        clearInterval(autoTimerRef.current);
        autoTimerRef.current = null;
      }
      if (drawTimerRef.current) {
        clearInterval(drawTimerRef.current);
        drawTimerRef.current = null;
      }
    }  
  }, [isGameOver]);

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

  // 現在の株価
  const currentPrice = useMemo(() => {
    return stockData.length > 0 ? stockData[stockData.length - 1].price : 0;
  }, [stockData]);

  // ユーティリティ関数
  const addLog = (message) => setLogs((prev) => [...prev, message]);

  // Presence更新関数
  const updatePresence = useCallback(
    async (newMoney, newHolding, newAtb) => {
      if (!chRef.current) return;
      try {
        await chRef.current.presence.update({
          name: clientId,
          money: newMoney,
          holding: newHolding,
          atb: typeof newAtb === "number" ? newAtb : undefined,
        });
      } catch (e) {
        console.error("❌ Presence更新失敗:", e);
      }
    },
    [clientId]
  );

  // ATBゲージ
  const syncATBToPresence = useCallback(
    (v) => updatePresence(moneyRef.current, holdingRef.current, v),
    [updatePresence]
  );
  
  const { atb, spend, setRate, setMax, reset } = useATB({
    initial: 0,
    max: 100,
    ratePerSec: 30,
    syncPresence: syncATBToPresence,
    syncIntervalMs: 500,
  });

  // 取引機能
  const handleTrade = useCallback(async (type, amount) => {
    if (!chRef.current || amount <= 0) return;

    const price = currentPrice;
    const cost = price * amount;
    
    if (type === "buy") {
      if(money < cost) {
        setError("❌ 資金が不足しています");
        setTimeout(() => setError(""), 3000);
        return;
      }

      const newMoney = money - cost;
      const newHolding = holding + amount;

      setMoney(newMoney);
      setHolding(newHolding);
      await updatePresence(newMoney, newHolding);

      addLog(`🛒 ${amount} 株を ¥${cost.toLocaleString()} で購入(合計￥${cost.toLocaleString()})`);
      setError(`✅ ${amount} 株を購入しました！`);
      setTimeout(() => setError(""), 3000);
    } else if (type === "sell") {
      if(holding < amount) {
        setError("❌ 保有株が不足しています");
        setTimeout(() => setError(""), 3000);
        return;
      }
      
      const newMoney = money + cost;
      const newHolding = holding - amount;

      setMoney(newMoney);
      setHolding(newHolding);
    
      await updatePresence(newMoney, newHolding);

      addLog(`💰 ${amount} 株を ¥${price.toLocaleString()} で売却(合計￥${cost.toLocaleString()})`);
      setError(`✅ ${amount} 株を売却しました！`);
      setTimeout(() => setError(""), 3000);
    }
  }, [money, holding, currentPrice, updatePresence]);

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

   const beginGame = useCallback(async () => {
    if (!chRef.current || beginRef.current) return;
    beginRef.current = true;

    const seed = Date.now();
    const initialData = generateStockData(seed);
    setStockData(initialData);

    await chRef.current.publish("stock-init", { seed, data: initialData, by: clientId });
    startAutoUpdate(chRef.current, initialData);
  }, [clientId]);

  // 初期手札取得(3枚)
  useEffect(() => {
    if (!clientId || !roomU) return;
    if (!rngRef.current) {
      rngRef.current = createSeededRng(strToSeed(`${clientId} : ${roomU}`));
      const init = drawCards(3, { rng: rngRef.current }).map((c) => ({ id: c.id }));
      setHand(init);
      addLog("🃏 初期手札を取得しました");
    }
  }, [clientId, roomU]);  

  // Ably接続とイベント処理
  useEffect(() => {
    if (!roomU || !clientId || initializedRef.current) return;
    initializedRef.current = true;

    const client = new Ably.Realtime.Promise({
      authUrl: `/api/ably-token?clientId=${encodeURIComponent(
        clientId
      )}&room=${encodeURIComponent(roomU)}`,
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
        atb: 0,
      });

      addLog("🎮 対戦が開始されました！");

      async function refreshPlayers() {
        const mem = await ch.presence.get();
        const players = {};
        mem.forEach((m) => {
          players[m.clientId] = {
            name: m.data?.name || m.clientId,
            money: m.data?.money ?? INITIAL_MONEY,
            holding: m.data?.holding ?? INITIAL_HOLDING,
            atb: m.data?.atb ?? 0,
          };
        });
        setAllPlayers(players);
      }

      await refreshPlayers();
      ch.presence.subscribe(["enter", "leave", "update"], refreshPlayers);

      //開始までのカウントダウン
       ch.subscribe("start-countdown", (msg) => {
        const { startAt, seconds = 5 } = msg.data || {};
        if (!startAt) return;
        setCountdownStartAt(startAt);
        setShowStartCD(true);
      });

      const members = await ch.presence.get();
      const ids = members.map((m) => m.clientId).sort();
      const isHost = ids[0] === clientId;

      if (isHost) {
        const startAt = Date.now() + 3000; // 3秒後にカウントダウン開始
        await ch.publish("start-countdown", { startAt, seconds: 5 });

        const seed = Date.now();
        const initialData = generateStockData(seed);
        setStockData(initialData);
        await ch.publish("stock-init", {
          seed,
          data: initialData,
          by: clientId,
        });
        startAutoUpdate(ch, initialData);

        if (!drawTimerRef.current) {
          drawTimerRef.current = setInterval(async () => {
            try {
              await ch.publish("card-draw-tick", { at: Date.now() });
              console.log("🃏 カードドロー通知を送信しました");
            } catch (e) {
              console.error("❌ カードドロー通知送信失敗:", e);
            }
          }, CARD_DRAW_INTERVAL);
        }
      }

      ch.subscribe("stock-init", (msg) => {
        setStockData(msg.data.data);
      });

      ch.subscribe("stock-update", (msg) => {
        setStockData(msg.data.stockData);
        const change = msg.data.changeAmount;
        addLog(
          change > 0
            ? `📈 株価が ${Math.abs(change)} 円上昇`
            : `📉 株価が ${Math.abs(change)} 円下降`
        );
      });

      ch.subscribe("card-draw-tick", (msg) => {
        if (handRef.current.length >= MAX_HAND_SIZE) return;
        const rng = rngRef.current || Math.random;
        const card = drawRandomCard({ rng });
        setHand((prev) =>
          prev.length < MAX_HAND_SIZE ? [...prev, { id: card.id }] : prev
        );
        addLog("🃏 1枚ドローしました");
      });

      ch.subscribe("card-used", (msg) => {
        const { cardId, playerId, targetId } = msg.data || {};
        if (!cardId || !playerId) return;

        if (targetId === clientId) {
          setAllPlayers((currentPlayers) => {
            const snapshot = {
              ...currentPlayers,
              [clientId]: {
                ...(currentPlayers[clientId] ?? {
                  name: clientId,
                  money: moneyRef.current,
                  holding: holdingRef.current,
                  guards: 0
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
              
              const meAfter = result.gameState?.players?.[clientId];
              if (meAfter && typeof meAfter.guards === "number") {
                setTimeout(() => updatePresence(moneyRef.current, newHolding), 50);
                setError(
                  `⚔️ ${CARD_DEFINITIONS[cardId]?.name || "カード"} を受けました！`
                );
                setTimeout(() => setError(""), 3000);
                
                return {
                  ...currentPlayers,
                  [clientId]: {
                    ...(currentPlayers[clientId] ?? {}),
                    guards: meAfter.guards,
                    holding: newHolding,
                  },
                };
              }
            }
            return currentPlayers;
          });
        }

        addLog(
          `🃏 ${playerId} が ${
            CARD_DEFINITIONS[cardId]?.name || cardId
          } を使用`
        );
      });

      ch.subscribe("game-over", (msg) => {
        const r = msg.data || {};
        if (!r.playerId) return;
        resultsMapRef.current.set(r.playerId, r);
        setResults(Array.from(resultsMapRef.current.values()));
        setIsGameOver(true);
      });
    });

    return () => {
      if (autoTimerRef.current) {
        clearInterval(autoTimerRef.current);
        autoTimerRef.current = null;
      }

      if (drawTimerRef.current) {
        clearInterval(drawTimerRef.current);
        drawTimerRef.current = null;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomU, clientId]);

  const RESULT_WAIT_MS = 2000;

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
      resultsMapRef.current.set(clientId, payload);
      setResults(Array.from(resultsMapRef.current.values()));
      setTimeout(() => setIsGameOver(true), RESULT_WAIT_MS);
    } catch (e) {
      console.error("❌ 結果送信失敗:", e);
      resultsMapRef.current.set(clientId, payload);
      setResults(Array.from(resultsMapRef.current.values()));
      setIsGameOver(true);
    }
  };

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

      const lastDate = new Date(currentData[currentData.length - 1].date);
      lastDate.setSeconds(lastDate.getSeconds() + 2);

      const newPoint = {
        date: lastDate.toISOString(),
        price: Math.round(newPrice),
        volume: Math.floor(Math.random() * 100000000) + 50_000_000,
      };

      if (currentData.length >= 180) {
        currentData = [...currentData.slice(1), newPoint];
      } else {
        currentData = [...currentData, newPoint];
      }

      setStockData([...currentData]);
      
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

    // ATBゲージチェック
    const cost = cardDef?.atbCost ?? 0;
    if (cost > 0 && !spend(cost)) {
      setError("❌ ATBが足りません");
      setTimeout(() => setError(""), 2000);
      return;
    }

    const others = Object.keys(allPlayers).filter((id) => id !== clientId);
    
    if (cardDef?.needsTarget && others.length >= 1 && !selectedTarget) {
      setError("❌ ターゲットを選択してください");
      setTimeout(() => setError(""), 3000);
      return;
    }

    const targetId = selectedTarget || others[0] || null;

    try {
      const snapshot = {
        players: {
          ...allPlayers,
          [clientId]: {
            ...(allPlayers[clientId] ?? { 
              name: clientId, 
              money: moneyRef.current, 
              holding: holdingRef.current, 
              guards: 0 
            }),
          },
          ...(targetId ? {
            [targetId]: {
              ...(allPlayers[targetId] ?? { 
                name: targetId, 
                money: 0, 
                holding: 0, 
                guards: 0 
              }),
            }
          } : {})
        }
      };

      const sim = executeCardEffect(card.id, snapshot, clientId, targetId);
      
      if (!sim.success) {
        setError("❌ カードを使えませんでした");
        setTimeout(() => setError(""), 2500);
        return;
      }

      // 持ち株・ガードの更新
      if (sim.needsSync && sim.gameState?.players?.[clientId]) {
        const newHolding = sim.gameState.players[clientId].holding;
        const newGuards = sim.gameState.players[clientId].guards;

        // 持ち株が変化していたら更新
        if (newHolding !== undefined && newHolding !== holdingRef.current) {
          console.log("🔄 持ち株更新:", holdingRef.current, "→", newHolding);
          setHolding(newHolding);
          setTimeout(() => updatePresence(moneyRef.current, newHolding), 50);
        }

        // allPlayers に反映
        if (newGuards !== undefined || (newHolding !== undefined && newHolding !== holdingRef.current)) {
          setAllPlayers((prev) => ({
            ...prev,
            [clientId]: {
              ...(prev[clientId] ?? {
                name: clientId,
                money: moneyRef.current,
                holding: holdingRef.current,
              }),
              holding: newHolding ?? holdingRef.current,
              guards: newGuards ?? (prev[clientId]?.guards || 0),
            }
          }));
        }
      }

      // ドロー処理
      if (sim.drawCount && sim.drawCount > 0) {
        const rng = rngRef.current || Math.random;
        const adds = Array.from({ length: sim.drawCount }, () => 
          drawRandomCard({ rng })
        ).map(c => ({ id: c.id }));
        setHand((prev) => prev.filter((_, i) => i !== cardIndex).concat(adds));
      } else {
        setHand((prev) => prev.filter((_, i) => i !== cardIndex));
      }

    } catch (e) {
      console.error("❌ ローカル適用失敗: ", e);
      setError("カードの処理に失敗しました");
      setTimeout(() => setError(""), 3000);
      return;
    }

    try {
      await chRef.current.publish("card-used", {
        cardId: card.id,
        playerId: clientId,
        targetId,
        timestamp: Date.now(),
      });
      
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
    .map((id) => ({
      id,
      name: allPlayers[id].name,
      holding: allPlayers[id].holding,
    }));

  const statusBadge =
    status === "connected"
      ? { text: "接続中", color: "#10b981" }
      : status === "connecting"
      ? { text: "接続中...", color: "#f59e0b" }
      : { text: "切断", color: "#ef4444" };

  return (
    <div className={styles.container}>
      <div className={styles.innerContainer}>
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
              onTimeUp={onTimeUp}
            />
          </div>
        </div>

        {showStartCD && countdownStartAt && (
          <StartCountdown
            startAt={countdownStartAt}
            seconds={3}
            onFinish={() => setShowStartCD(false)}
          />
        )}

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

    <div className={styles.contentGrid}>
      {/* 左：プレイヤー情報＋チャート */}
      <section className={styles.leftCol}>
        {roomNumber && money !== null && holding !== null && (
          <PlayerInfo
            money={money}
            holding={holding}
            roomNumber={roomNumber}
          />
        )}
        {stockData.length > 0 && <StockChart stockData={stockData} />}
      </section>

    {/* 右カラム */}
    <div className={styles.rightCol}>
      {/* ← これを追加：中で高さを伸ばすボックス */}
      <div className={styles.tradePanelBox}>
        <TradingPanel
          currentPrice={currentPrice}
          money={money}
          holding={holding}
          onTrade={handleTrade}
        />
      </div>
  </div>
</div>
   
        <ATBBar value={atb} max={100} label="ATB" />
        <Hand hand={hand} onPlay={handlePlayCard} maxHand={8} />

      </div>

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

      <SideBar
        side="right"
        open={isRightSidebarOpen}
        onToggle={() => setIsRightSidebarOpen((v) => !v)}
        title="ログ / ユーザー一覧"
      >
        <Log log={logs} />
        <div className={styles.userListTitle}>ユーザー一覧</div>
        <RightUserList
          meId={clientId}
          players={allPlayers}
          selectedTarget={selectedTarget}
          onSelect={handleTargetSelect}
        />
      </SideBar>

      {/* 右サイドバーが閉じている時だけ、空いた右端に手札をドック表示 */}
      {!isRightSidebarOpen && (
        <div className={styles.rightSidebarSlot}>
            <ATBBar value={atb} max={100} label="ATB" />
          <Hand hand={hand} onPlay={handlePlayCard} maxHand={8} />
        </div>
      )}

            {/* === リザルトモーダル === */}
            <ResultModal
              open={isGameOver}
              results={results}
              onClose={() => setIsGameOver(false)}
              onRetry={() => {
                window.location.href = `/game?room=${encodeURIComponent(roomU)}`;
              }}
              onBack={() => {
                window.location.href = `/lobby?room=${encodeURIComponent(roomU)}`;
              }}
            />
    </div>
  );
}