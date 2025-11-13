"use client";
import { useEffect, useRef } from "react";
import { EVENT_IDS, EVENT_DEFS, pickWeightedId } from "./eventTypes";
import { applyEventForSelf, applyPriceEventAsHost } from "./applyEvent";

/**
 * ランダムイベントの抽選（ホストのみ）＆購読（全員）
 */
export default function useRandomEvents(params) {
  const {
    enabled,              // 有効時のみ動かす（例: gameStartAt 以降）
    chRef,                // Ably channel ref
    isHostRef,            // { current: boolean }
    // self apply 用
    setHand, setMoney, setHolding,
    moneyRef, holdingRef, handRef,
    updatePresence, addLog,
    getCurrentPrice,
    // 株価系列操作（ホスト用）
    getStockData, setStockData,
    intervalMs = 1000, // 1秒ごと
     occurrenceProb = 1 / 75, //追加：発生確率（既定 1/75）
  } = params;

  const timerRef = useRef(null);
  const seenIdsRef = useRef(new Set()); // 受信イベントの重複除去

  // ---- 購読（全員） ----
  useEffect(() => {
    if (!enabled || !chRef.current) return;
    const ch = chRef.current;

    const onRandomEvent = async (msg) => {
      const evt = msg?.data;
      if (!evt?.id) return;
      const uid = evt.uid ?? `${evt.id}:${evt.ts ?? msg.id ?? Date.now()}`;
      if (seenIdsRef.current.has(uid)) return;
      seenIdsRef.current.add(uid);

      // 自分にローカル適用
      applyEventForSelf(evt, {
        setHand, setMoney, setHolding,
        moneyRef, holdingRef,
        updatePresence, addLog,
        getCurrentPrice,
      });

      // 価格イベントはホストだけが系列変更→stock-update 配信
      if ((evt.id === EVENT_IDS.PRICE_SPIKE || evt.id === EVENT_IDS.PRICE_CRASH) && isHostRef.current) {
        await applyPriceEventAsHost(evt, { chRef, getStockData, setStockData });
      }
    };

    ch.subscribe("random-event", onRandomEvent);
    return () => { try { ch.unsubscribe("random-event", onRandomEvent); } catch {} };
  }, [
    enabled, chRef, isHostRef,
    setHand, setMoney, setHolding,
    moneyRef, holdingRef, updatePresence, addLog, getCurrentPrice,
    getStockData, setStockData,
  ]);

  // ---- 抽選（ホストのみ） ----
  useEffect(() => {
    const start = () => {
      if (!enabled || !isHostRef.current || !chRef.current || timerRef.current) return;
      timerRef.current = setInterval(async () => {
      try {
        // ★ 既定: 1/75 の確率でこの tick を「発火」させる
        if (Math.random() >= occurrenceProb) return;
          const id = pickWeightedId();
          const now = Date.now();
          const payload = { id, uid: `${id}:${now}`, ts: now };

            //所持金固定 
          if (id === EVENT_IDS.SET_MONEY) {
            payload.amount = EVENT_DEFS[EVENT_IDS.SET_MONEY].amount;
          }

           //強制売却
           if (id === EVENT_IDS.FORCE_SELL) {
            payload.price = getCurrentPrice?.() ?? 0;
           }

           //株の大幅な上昇・下落
           if (id === EVENT_IDS.PRICE_SPIKE || id === EVENT_IDS.PRICE_CRASH) {
            const base = getCurrentPrice?.() ?? 0;
            const mult = id === EVENT_IDS.PRICE_SPIKE
                ? (1.15 + Math.random() * 0.10) 
                : (0.75 + Math.random() * 0.10);
            payload.newPrice = Math.max(1000, Math.round(base * mult));
           }

          await chRef.current.publish("random-event", payload);
        } catch (e) {
          console.error("❌ random-event publish failed:", e);
        }
      }, intervalMs);
    };

    const stop = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    if (enabled && isHostRef.current) start();
    else stop();

    return stop;
  }, [enabled, isHostRef, chRef, intervalMs]);
}
