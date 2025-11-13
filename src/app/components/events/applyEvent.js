import { EVENT_IDS, EVENT_DEFS } from "./eventTypes";

/** クライアント側で自分の状態にイベントを適用 */
export function applyEventForSelf(evt, ctx) {
  const {
    setHand, setMoney, setHolding,
    moneyRef, holdingRef,
    updatePresence, addLog,
    getCurrentPrice,
  } = ctx;

  const id = evt?.id;
  if (!id) return;

  switch (id) {
    case EVENT_IDS.CLEAR_HAND: {
      setHand([]);
      addLog("🧹 イベント: 手札が全て消去されました");
      break;
    }
    case EVENT_IDS.SET_MONEY: {
      const amount = Number(evt?.amount ?? EVENT_DEFS[EVENT_IDS.SET_MONEY].amount);
      setMoney(amount);
      updatePresence(amount, holdingRef.current);
      addLog(`💴 イベント: 所持金が ¥${amount.toLocaleString()} に設定されました`);
      break;
    }
    case EVENT_IDS.FORCE_SELL: {
      const price = getCurrentPrice();
      const holding = holdingRef.current;
      if (holding > 0 && price > 0) {
        const delta = holding * price;
        const newMoney = moneyRef.current + delta;
        setHolding(0);
        setMoney(newMoney);
        updatePresence(newMoney, 0);
        addLog(`📤 イベント: 全株を強制売却（${holding}株 x ¥${price.toLocaleString()}）`);
      } else {
        addLog("📤 イベント: 強制売却（売る株なし）");
      }
      break;
    }
    // 価格系はホストが株価系列更新＆broadcastするのでログのみ
    case EVENT_IDS.PRICE_SPIKE:
      addLog("🚀 イベント: 株価が大幅に上昇しました");
      break;
    case EVENT_IDS.PRICE_CRASH:
      addLog("💥 イベント: 株価が大幅に下落しました");
      break;
    default:
      break;
  }
}

/** 価格イベントをホストが適用して stock-update を即時配信 */
export async function applyPriceEventAsHost(evt, hostCtx) {
  const { chRef, getStockData, setStockData } = hostCtx;
  const id = evt?.id;
  if (!id || !chRef?.current) return;

  const def = EVENT_DEFS[id];
  if (!def) return;

  const pct = (() => {
    const min = def.pctMin ?? 0.1;
    const max = def.pctMax ?? 0.2;
    return min + Math.random() * (max - min); // 10〜20%
  })();

  const data = [...(getStockData() ?? [])];
  if (data.length === 0) return;

  const last = data[data.length - 1];
  const factor = id === EVENT_IDS.PRICE_SPIKE ? (1 + pct) : (1 - pct);
  const newPrice = Math.round(Math.max(10000, Math.min(20000, last.price * factor)));

  const newPoint = {
    date: new Date().toISOString(),
    price: newPrice,
    volume: Math.floor(Math.random() * 100000000) + 50_000_000,
  };
  const newSeries = data.length >= 180 ? [...data.slice(1), newPoint] : [...data, newPoint];

  setStockData(newSeries);
  try {
    await chRef.current.publish("stock-update", {
      stockData: newSeries,
      changeAmount: newPrice - last.price,
      isAuto: false,
      byEvent: id,
    });
  } catch (e) {
    console.error("❌ price event broadcast failed:", e);
  }
}
