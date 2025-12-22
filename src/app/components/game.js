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
import RightUserList from "./RightUserList";
import styles from "../styles/game.module.css";
import ResultModal from "../game/ResultModal";
import StartCountdown from "./StartCountdown";
import useATB from "./atb/useATB";
import ATBBar from "./ATBBar"; 
import useRandomEvents from "./events/useRandomEvents";
import LeftHelpPanel from "./LeftHelpPanel";
import Toast from "./Toast";
import useEventNotification from "./events/useEventNotification";
import EventNotification from "./events/EventNotification";

// ====== 定数 ======
const INITIAL_MONEY = 100000;
const INITIAL_HOLDING = 10;
const AUTO_UPDATE_INTERVAL = 10000; // 10秒ごとの自動更新
const GAME_DURATION = 240;
const MAX_HAND_SIZE = 7;
const CARD_DRAW_INTERVAL = 3500;

// ====== スマホ横「中央にボード」表示用 ======
const BASE_W = 1100; // ボード基準幅（game.module.css の compactBoard と同じにする）
const BASE_H = 620;  // ボード基準高さ

function useLandscapeScale() {
  const [info, setInfo] = useState({ compact: false, scale: 1 });

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      const isLandscape = w > h;
      // 「スマホ横っぽい」条件（必要なら調整）
      const compact = isLandscape && h <= 520;

      if (!compact) {
        setInfo({ compact: false, scale: 1 });
        return;
      }

      const s = Math.min(w / BASE_W, h / BASE_H);
      const scale = Math.max(0.55, Math.min(1, s)); // 小さくなりすぎ防止

      setInfo({ compact: true, scale });
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return info;
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

function strToSeed(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash) >>> 0;
}

function safeName(id, allPlayers) {
  return allPlayers[id]?.name || sessionStorage.getItem("playerName") || id.slice(0, 5);
}


// ====== メインコンポーネント ======
export default function Game() {
  const router = useRouter();

    // ===== スマホ横「中央ボード」用 =====
  const { compact, scale } = useLandscapeScale();

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
  const [isGameOver, setIsGameOver] = useState(false);
  const [results, setResults] = useState([]);
  const [cdSeconds, setCdSeconds] = useState(5);
  const [gameStartAt, setGameStartAt] = useState(null);
  const [showStartCD, setShowStartCD] = useState(false);
  const [countdownStartAt, setCountdownStartAt] = useState(null);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [usingCardIndex, setUsingCardIndex] = useState(-1);
  const [messages, setMessages] = useState([]);   // ←これを必ず追加
  const [chatInput, setChatInput] = useState(""); // ←入力欄
  const resultsMapRef = useRef(new Map());
  const { notification, showNotification, clearNotification } = useEventNotification();


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
  const isHostRef = useRef(false);
  const stockDataRef = useRef(stockData);

useEffect(() => {
  if (!chRef.current) return;

  const unsubscribe = chRef.current.subscribe("chat-message", (msg) => {
    setMessages((prev) => [...prev, msg.data]);
  });

  return () => unsubscribe();
}, [chRef.current]);

const sendChat = (text) => {
  if (!text.trim()) return;
  if (!chRef.current) return;

  chRef.current.publish("chat-message", {
    id: clientId,
    name: displayName,
    text,
    ts: Date.now(),
  });
};

  
  useEffect(() => { stockDataRef.current = stockData; }, [stockData]);


  // Refの同期
  useEffect(() => { holdingRef.current = holding; }, [holding]);
  useEffect(() => { moneyRef.current = money; }, [money]);
  useEffect(() => { handRef.current = hand; }, [hand]);
  useEffect(() => { isGameOverRef.current = isGameOver; }, [isGameOver]);
  useEffect(() => { stockDataRef.current = stockData; }, [stockData]);

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
    let id = sessionStorage.getItem("clientUUID");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("clientUUID", id);
    }
    return id;
  }, []);

  const displayName = useMemo(() => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem("playerName") || "noname";
  }, []);

  const roomU = useMemo(() => (roomNumber ? roomNumber.toUpperCase() : ""), [roomNumber]);

  const currentPrice = useMemo(() => {
    return stockData.length > 0 ? stockData[stockData.length - 1].price : 0;
  }, [stockData]);

  const addLog = (message) => setLogs((prev) => [...prev, message]);

  // Presence更新関数
  const updatePresence = useCallback(
    async (newMoney, newHolding, newAtb) => {
      if (!chRef.current) return;
      try {
        await chRef.current.presence.update({
          name: displayName,
          money: newMoney,
          holding: newHolding,
          atb: typeof newAtb === "number" ? newAtb : undefined,
        });
      } catch (e) {
        console.error("❌ Presence更新失敗:", e);
      }
    },
    [displayName]
  );

  // 行動ゲージ
  const syncATBToPresence = useCallback(
    (v) => updatePresence(moneyRef.current, holdingRef.current, v),
    [updatePresence]
  );

  const { atb, spend } = useATB({
    initial: 0,
    max: 100,
    ratePerSec: 10,
    syncPresence: syncATBToPresence,
    syncIntervalMs: 500,
  });

  // 取引機能
  const handleTrade = useCallback(
    async (type, amount) => {
      if (!chRef.current || amount <= 0) return;

      const price = currentPrice;
      const cost = price * amount;

      if (type === "buy") {
        if (money < cost) {
          setError("❌ 資金が不足しています");
          setTimeout(() => setError(""), 3000);
          return;
        }

        const newMoney = money - cost;
        const newHolding = holding + amount;

        setMoney(newMoney);
        setHolding(newHolding);
        await updatePresence(newMoney, newHolding);

        addLog(`🛒 ${amount} 株を ¥${cost.toLocaleString()} で購入`);
        setError(`✅ ${amount} 株を購入しました！`);
        setTimeout(() => setError(""), 3000);
      } else if (type === "sell") {
        if (holding < amount) {
          setError("❌ 保有株が不足しています");
          setTimeout(() => setError(""), 3000);
          return;
        }

        const newMoney = money + cost;
        const newHolding = holding - amount;

        setMoney(newMoney);
        setHolding(newHolding);

        await updatePresence(newMoney, newHolding);

        addLog(`💰 ${amount} 株を ¥${price.toLocaleString()} で売却`);
        setError(`✅ ${amount} 株を売却しました！`);
        setTimeout(() => setError(""), 3000);
      }
    },
    [money, holding, currentPrice, updatePresence]
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

  // 初期手札取得(4枚)
  useEffect(() => {
    if (!clientId || !roomU) return;
    if (!rngRef.current) {
      rngRef.current = createSeededRng(strToSeed(`${clientId} : ${roomU}`));
      const init = drawCards(4, { rng: rngRef.current }).map((c) => ({ id: c.id }));
      setHand(init);
      addLog("🃏 初期手札を取得しました");
    }
  }, [clientId, roomU]);

  // 株価自動更新（10秒ごと）
  const startAutoUpdate = useCallback((ch) => {
    if (autoTimerRef.current) return;

    autoTimerRef.current = setInterval(async () => {
      // Refから最新のstockDataを取得
      const currentData = stockDataRef.current;
      if (currentData.length === 0) return;

      const last = currentData[currentData.length - 1];
      const lastPrice = last.price; // カード操作後の価格を基準にする

      // ランダムな変動を加える
      const changeAmount = Math.round((Math.random() - 0.5) * 600);
      const newPrice = Math.max(10000, Math.min(20000, lastPrice + changeAmount));

      const lastDate = new Date(last.date);
      lastDate.setSeconds(lastDate.getSeconds() + 2);

      const newPoint = {
        date: lastDate.toISOString(),
        price: Math.round(newPrice),
        volume: Math.floor(Math.random() * 100000000) + 50_000_000,
      };

      let newData;
      if (currentData.length >= 180) {
        newData = [...currentData.slice(1), newPoint];
      } else {
        newData = [...currentData, newPoint];
      }

      setStockData(newData);

      try {
        await ch.publish("stock-update", {
          stockData: newData,
          changeAmount,
          isAuto: true,
        });
      } catch (e) {
        console.error("❌ 自動変動送信失敗:", e);
      }
    }, AUTO_UPDATE_INTERVAL);
  }, []);

  // Ably接続とイベント処理
  useEffect(() => {
    if (!roomU || !clientId || initializedRef.current) return;
    initializedRef.current = true;

    const client = new Ably.Realtime.Promise({
      authUrl: `/api/ably-token?clientId=${encodeURIComponent(clientId)}&room=${encodeURIComponent(roomU)}`,
      closeOnUnload: false,
    });
    clientRef.current = client;

    client.connection.on((stateChange) => {
      setStatus(stateChange.current);
      if (stateChange.current === "failed" || stateChange.current === "suspended") {
        setError("⚠️ 接続が切断されました。再読み込みしてください。");
      }
    });

    client.connection.once("connected", async () => {
      const channelName = `rooms:${roomU}`;
      const ch = client.channels.get(channelName);
      chRef.current = ch;

      await ch.attach();

      const initialName =
        (typeof window !== "undefined" && sessionStorage.getItem("playerName")) || clientId;

      await ch.presence.enter({
        name: displayName,
        money: INITIAL_MONEY,
        holding: INITIAL_HOLDING,
        atb: 0,
      })

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

      ch.subscribe("start-countdown", (msg) => {
        const { startAt, seconds = 5 } = msg.data || {};
        if (!Number.isFinite(startAt)) return;

        //新規追加
        setGameStartAt(startAt + seconds * 1000);

        setCdSeconds(seconds);
        setCountdownStartAt(startAt);
        setShowStartCD(true);
      });

      const members = await ch.presence.get();
      const ids = members.map((m) => m.clientId).sort();
      const isHost = ids[0] === clientId;
      //新規追加
      isHostRef.current = isHost;

      if (isHost) {
        setTimeout(async () => {
        const seconds = 3;
        const startAt = Date.now() + seconds * 1000;
        await ch.publish("start-countdown", { startAt, seconds }); //修正

        setCountdownStartAt(startAt);
        setCdSeconds(seconds);
        setShowStartCD(true);
        setGameStartAt(startAt + seconds * 1000);

        const seed = Date.now();
        const initialData = generateStockData(seed);
        setStockData(initialData);
        await ch.publish("stock-init", {
          seed,
          data: initialData,
          by: clientId,
        });
        startAutoUpdate(ch);

        if (!drawTimerRef.current) {
          drawTimerRef.current = setInterval(async () => {
            try {
              await ch.publish("card-draw-tick", { at: Date.now() });
            } catch (e) {
              console.error("❌ カードドロー通知送信失敗:", e);
            }
          }, CARD_DRAW_INTERVAL);
        }
      }, 1000);
    }

      ch.subscribe("stock-init", (msg) => {
        setStockData(msg.data.data);
      });



ch.subscribe("stock-update", (msg) => {
  const { stockData: next, changeAmount, isAuto } = msg.data || {};
  if (!next) return;
  setStockData(next);

  //  if (changeAmount) {
  //   const line = changeAmount > 0
  //     // ? `📈 株価が ${Math.abs(changeAmount)} 円上昇${isAuto ? "（自動）" : "（手動）"}`
  //     // : `📉 株価が ${Math.abs(changeAmount)} 円下降${isAuto ? "（自動）" : "（手動）"}`;
  //   addLog(line);
  // }
});

      ch.subscribe("card-draw-tick", (msg) => {
        if (handRef.current.length >= MAX_HAND_SIZE) return;
        const rng = rngRef.current || Math.random;
        const card = drawRandomCard({ rng });
        setHand((prev) => (prev.length < MAX_HAND_SIZE ? [...prev, { id: card.id }] : prev));
        // addLog("🃏 1枚ドローしました");
      });

      ch.subscribe("card-used", (msg) => {
        console.log("📥 card-used受信（全データ）:", JSON.stringify(msg.data));

        const { cardId, playerId, targetId, removeCount } = msg.data || {};

        console.log("📥 分解後:", { cardId, playerId, targetId, removeCount });

        if (!cardId || !playerId) {
          console.log("❌ carrdId または playerIdが不足");
          return;
        }

        const you = playerId === clientId ? "(あなた)" : "";
        const cardName = CARD_DEFINITIONS[cardId]?.name || cardId;
        const tail = targetId ? ` → 対象: ${allPlayers[targetId]?.name || targetId}` : "";
        const playerName = allPlayers[playerId]?.name || playerId;
        const targetName = targetId ? allPlayers[targetId]?.name || targetId : "";

const shortPlayerName = safeName(playerId, allPlayers);
const shortTargetName = targetId ? safeName(targetId, allPlayers) : null;

if (targetId) {
  addLog(`🃏 ${shortPlayerName}${you} が ${cardName} を使用`);
} else {
  addLog(`🃏 ${shortPlayerName}${you} が ${cardName} を使用`);
}

        // delete card
        if (removeCount && targetId === clientId) {
          console.log(`🗑️ 手札をランダムに ${removeCount} 枚削除`);
          console.log(`📋 削除前の手札:`, handRef.current.map(c => CARD_DEFINITIONS[c.id]?.name));

          setHand((currentHand) => {
            console.log(`🗑️ setHand実行 - 現在の手札枚数: ${currentHand.length}`);

            if (currentHand.length === 0) {
              console.log("⚠️ 手札が空です");
              addLog(`🗑️ 手札が空のため削除できませんでした`);
              return currentHand;
            }

            const toRemove = Math.min(removeCount, currentHand.length);
            const newHand = [...currentHand];

            console.log(`🗑️ ${toRemove}枚を削除します`);

            for (let i = 0; i < toRemove; i++) {
              if (newHand.length === 0) break;
              const randomIndex = Math.floor(Math.random() * newHand.length);
              const removed = newHand.splice(randomIndex, 1)[0];
        console.log(`🗑️ ${i + 1}枚目削除: インデックス${randomIndex} - ${CARD_DEFINITIONS[removed.id]?.name}`);
      }
      
      console.log(`✅ 削除完了: ${currentHand.length}枚 → ${newHand.length}枚`);
      console.log(`📋 削除後の手札:`, newHand.map(c => CARD_DEFINITIONS[c.id]?.name));
      
      addLog(`🗑️ 手札が ${toRemove} 枚削除されました`);
      
      return newHand;
    });
    
    setError(`⚔️ ${cardName} の効果を受けました！手札が${removeCount}枚削除されました`);
    setTimeout(() => setError(""), 3000);
    
    console.log("🗑️ 手札削除処理完了、return");
    return; // ここで処理終了
  }

  console.log("ℹ️ 手札削除の条件に該当せず、通常処理へ");

        if (targetId === clientId) {
          setAllPlayers((currentPlayers) => {
            const snapshot = {
              ...currentPlayers,
              [clientId]: {
                ...(currentPlayers[clientId] ?? {
                  name: clientId,
                  money: moneyRef.current,
                  holding: holdingRef.current,
                }),
              },
            };

            const result = executeCardEffect(cardId, { players: snapshot }, playerId, targetId);

            if (result?.success && result?.needsSync) {
              const updatedPlayer = result.gameState?.players?.[clientId];

              const newHolding = updatedPlayer.holding ?? holdingRef.current;
              if (newHolding !== holdingRef.current) {
                console.log("🔄 保有株更新 (カード効果):", holdingRef.current, "→", newHolding);
                setHolding(newHolding);
              }

              const newMoney = updatedPlayer.money ?? moneyRef.current;
              if (newMoney !== moneyRef.current) {
                console.log("🔄 資金更新 (カード効果):", moneyRef.current, "→", newMoney);
                setMoney(newMoney);
              }

              setTimeout(() => updatePresence(newMoney, newHolding), 50);

              setError(`⚔️ ${CARD_DEFINITIONS[cardId]?.name || "カード"} の効果を受けました！`);
              setTimeout(() => setError(""), 3000);

              return {
                ...currentPlayers,
                [clientId]: {
                  ...(currentPlayers[clientId] ?? {}),
                  holding: newHolding,
                  money: newMoney,
                },
              };
            }
            return currentPlayers;
          });
        }

        // addLog(`🃏 ${shortPlayerName} が ${CARD_DEFINITIONS[cardId]?.name || cardId} を使用`);
      });

      // 株価操作イベント
      ch.subscribe("chart-manipulation", (msg) => {
        const { changeAmount, playerId } = msg.data || {};
        if (!changeAmount) return;

        if(playerId === clientId) {
          console.log("📡 自分の株価操作イベントはスキップ");
          return;
        }

        console.log(`📡 株価操作イベント受信: ${changeAmount}円の変動 by ${playerId}`);

        setStockData((prev) => {
          if (prev.length === 0) return prev;
          const newData = [...prev];
          const lastPoint = newData[newData.length - 1];
          const newPrice = Math.max(10000, Math.min(20000, lastPoint.price + changeAmount));

          newData[newData.length - 1] = {
            ...lastPoint,
            price: newPrice,
          };
          return newData;
        });

        const direction = changeAmount > 0 ? "上昇" : "下降";
        addLog(`📊 ${shortPlayerName} の操作により株価が ${Math.abs(changeAmount)} 円${direction}`);
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
  }, [roomU, clientId, startAutoUpdate, updatePresence]);

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
      setTimeout(() => setIsGameOver(true), 2000);
    } catch (e) {
      console.error("❌ 結果送信失敗:", e);
      resultsMapRef.current.set(clientId, payload);
      setResults(Array.from(resultsMapRef.current.values()));
      setIsGameOver(true);
    }
  };

  // カード使用ハンドラ
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

    const cost = cardDef?.atbCost ?? 0;
    if (cost > 0 && !spend(cost)) {
      setError("❌ 行動ゲージが足りません");
      setTimeout(() => setError(""), 2000);
      return;
    }

    // animation
    setUsingCardIndex(cardIndex);
    await new Promise((resolve) => setTimeout(resolve, 600));

    const targetId = selectedTarget || others[0] || null;
    let sim;

    try {
      const snapshot = {
        players: {
          ...allPlayers,
          [clientId]: {
            ...(allPlayers[clientId] ?? {
              name: clientId,
              money: moneyRef.current,
              holding: holdingRef.current,
            }),
          },
          ...(targetId
            ? {
                [targetId]: {
                  ...(allPlayers[targetId] ?? {
                    name: targetId,
                    money: 0,
                    holding: 0,
                  }),
                },
              }
            : {}),
        },
      };

      sim = executeCardEffect(card.id, snapshot, clientId, targetId);

      if (!sim.success) {
        setError("❌ カードを使えませんでした");
        setTimeout(() => setError(""), 2500);
        setUsingCardIndex(-1);
        return;
      }

      // 株価変動カードの処理
      if (sim.chartChange && sim.chartChange !== 0) {
        console.log(`📊 株価操作カード発動: ${sim.chartChange}円の変動`);

        // 自分のチャートを更新
        setStockData((prev) => {
          if (prev.length === 0) return prev;
          const newData = [...prev];
          const lastPoint = newData[newData.length - 1];
          const newPrice = Math.max(10000, Math.min(20000, lastPoint.price + sim.chartChange));

          newData[newData.length - 1] = {
            ...lastPoint,
            price: newPrice,
          };

          console.log(`📊 株価更新（自分）: ${lastPoint.price} → ${newPrice}`);
          return newData;
        });

        // 他のプレイヤーに配信（自分は受信時にスキップする）
        try {
          await chRef.current.publish("chart-manipulation", {
            cardId: card.id,
            changeAmount: sim.chartChange,
            playerId: clientId,
            timestamp: Date.now(),
          });
          console.log("📡 株価操作イベントを配信しました");
        } catch (e) {
          console.error("❌ 株価操作配信失敗:", e);
        }

        const direction = sim.chartChange > 0 ? "上昇" : "下降";
        addLog(`📊 株価が ${Math.abs(sim.chartChange)} 円${direction}（カード効果）`);
      }

      // 自分の状態を更新
      if (sim.needsSync && sim.gameState?.players?.[clientId]) {
        const playerData = sim.gameState.players[clientId];
        const newHolding = playerData.holding;
        const newMoney = playerData.money;

        if (newHolding !== undefined && newHolding !== holdingRef.current) {
          console.log("🔄 持ち株更新:", holdingRef.current, "→", newHolding);
          setHolding(newHolding);
        }

        if (newMoney !== undefined && newMoney !== moneyRef.current) {
          console.log("🔄 資金更新:", moneyRef.current, "→", newMoney);
          setMoney(newMoney);
        }

        const moneyChanged = newMoney !== undefined && newMoney !== moneyRef.current;
        const holdingChanged = newHolding !== undefined && newHolding !== holdingRef.current;

        if (moneyChanged || holdingChanged) {
          const finalMoney = newMoney !== undefined ? newMoney : moneyRef.current;
          const finalHolding = newHolding !== undefined ? newHolding : holdingRef.current;
          setTimeout(() => updatePresence(finalMoney, finalHolding), 50);
        }

        if (holdingChanged || moneyChanged) {
          setAllPlayers((prev) => ({
            ...prev,
            [clientId]: {
              ...(prev[clientId] ?? {
                name: clientId,
                money: moneyRef.current,
                holding: holdingRef.current,
              }),
              money: newMoney !== undefined ? newMoney : moneyRef.current,
              holding: newHolding !== undefined ? newHolding : holdingRef.current,
            },
          }));
        }
      }

      // カードドロー処理
      if (sim.drawCount && sim.drawCount > 0) {
        const rng = rngRef.current || Math.random;
        const adds = Array.from({ length: sim.drawCount }, () => drawRandomCard({ rng })).map((c) => ({ id: c.id }));
        setHand((prev) => prev.filter((_, i) => i !== cardIndex).concat(adds));
      } else {
        setHand((prev) => prev.filter((_, i) => i !== cardIndex));
      }
    } catch (e) {
      console.error("❌ ローカル適用失敗: ", e);
      setError("カードの処理に失敗しました");
      setTimeout(() => setError(""), 3000);
      setUsingCardIndex(-1);
      return;
    }

    // 自分に対する効果のカードかどうかを判定
    const isSelfTargetCard = !cardDef?.needsTarget || targetId === clientId;

    try {
      // 自分に対する効果のカードは相手に送信しない
      if (!isSelfTargetCard) {
        // await chRef.current.publish("card-used", {
        const payload = {
          cardId: card.id,
          playerId: clientId,
          targetId,
          timestamp: Date.now(),
        };

        if (sim?.removeCount) {
          payload.removeCount = sim.removeCount;
        }

        console.log("📡 カード使用イベント送信:", payload)
        await chRef.current.publish("card-used", payload);
      }

      setError(`✅ ${cardDef?.name || "カード"} を使用しました！`);
      setTimeout(() => setError(""), 3000);
    } catch (e) {
      console.error("❌ カード使用送信失敗:", e);
      setError("カード使用の送信に失敗しました");
    }
    setUsingCardIndex(-1);
  };

  const handleTargetSelect = (targetId) => setSelectedTarget(targetId);

  const statusBadge =
    status === "connected"
      ? { text: "接続中", color: "#10b981" }
      : status === "connecting"
      ? { text: "接続中...", color: "#f59e0b" }
      : { text: "切断", color: "#ef4444" };

  //新規追加　イベント関連
  useRandomEvents({
    enabled: !isGameOver && Boolean(chRef.current) && Boolean(gameStartAt),
    chRef,
    isHostRef,
    setHand, setMoney, setHolding,
    moneyRef, holdingRef, handRef,
    updatePresence,
    addLog,
    getCurrentPrice: () =>
      stockDataRef.current.length
        ? stockDataRef.current[stockDataRef.current.length - 1].price
        : 0,
    getStockData: () => stockDataRef.current,
    setStockData,
    intervalMs: 1000,
    showEventNotification: showNotification
  });
  
  const gameContent = (
    <div className={`${styles.container} ${compact ? styles.compactBoard : ""}`}>
      {/* ＝＝＝＝＝＝＝ ヘッダー ＝＝＝＝＝＝＝ */}
      <header className={styles.header}>
        <h1 className={styles.title}>株価ゲーム 📈</h1>

        <span className={styles.statusBadge} style={{ backgroundColor: statusBadge.color }}>
          {statusBadge.text}
        </span>

        {/* 🔔 中央トースト通知（errorを出すなら errorBar はどちらか1つでOK） */}
        <Toast message={error} />

        <div className={styles.timerWrapper}>
          <GameTimer duration={GAME_DURATION} startAt={gameStartAt} onTimeUp={onTimeUp} />
        </div>
      </header>

      {/* ＝＝＝＝＝＝＝ スタートカウントダウン ＝＝＝＝＝＝＝ */}
      {showStartCD && countdownStartAt && (
        <StartCountdown
          startAt={countdownStartAt}
          seconds={cdSeconds}
          onFinish={() => {
            setShowStartCD(false);
            setIsLeftSidebarOpen(false);
            setIsRightSidebarOpen(false);
            if (!gameStartAt) {
              const now = Date.now();
              setGameStartAt(now);
            }
          }}
        />
      )}

      {/* ＝＝＝＝＝＝＝ 中段 2カラム ＝＝＝＝＝＝＝ */}
      <div className={styles.mainGrid}>
        {/* 左カラム */}
        <div className={styles.leftCol}>
          {/* 左上：固定（ATB+手札+ユーザー一覧） */}
          <div className={styles.topLeftBox}>
            <ATBBar value={atb} max={100} label="ゲージ" />
            <Hand hand={hand} onPlay={handlePlayCard} maxHand={7} usingCardIndex={usingCardIndex} />
            <RightUserList
              meId={clientId}
              players={allPlayers}
              selectedTarget={selectedTarget}
              onSelect={handleTargetSelect}
            />
          </div>

          {/* 左下：伸縮（チャート） */}
          <div className={styles.chartWrapper}>
            <StockChart stockData={stockData} />
          </div>
        </div>

        {/* 右カラム */}
        <div className={styles.rightCol}>
          <div className={styles.tradePanelBox}>
            <TradingPanel
              currentPrice={currentPrice}
              money={money}
              holding={holding}
              onTrade={handleTrade}
            />
            <PlayerInfo money={money} holding={holding} roomNumber={roomNumber} />
          </div>
        </div>
      </div>

      {/* サイドバー（ゲーム画面の外に出したいなら gameContent 外でもOK） */}
      <SideBar
        side="left"
        open={isLeftSidebarOpen}
        onToggle={() => setIsLeftSidebarOpen((v) => !v)}
        title="ヘルプ"
      >
        <LeftHelpPanel roomId={roomU} messages={messages} sendChat={sendChat} />
      </SideBar>

      <SideBar
        side="right"
        open={isRightSidebarOpen}
        onToggle={() => setIsRightSidebarOpen((v) => !v)}
        title="ログ"
      >
        <Log log={logs} />
      </SideBar>

      <ResultModal
        open={isGameOver}
        results={results}
        onHome={() => { window.location.href = "/"; }}
        onLobby={() => { window.location.href = `/lobby?room=${encodeURIComponent(roomU)}`; }}
      />

      {notification && (
        <EventNotification
          message={notification.message}
          icon={notification.icon}
          type={notification.type}
          duration={notification.duration}
          onClose={clearNotification}
        />
      )}
    </div>
  );

  return compact ? (
    <div className={styles.stage} style={{ ["--game-scale"]: scale }}>
      <div className={styles.scaler}>{gameContent}</div>
    </div>
  ) : (
    gameContent
  );
}