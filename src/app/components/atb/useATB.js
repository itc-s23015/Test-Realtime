"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useATB
 * - ローカルでATBを蓄積（デフォ: 30/秒）
 * - spend(cost) で消費（不足なら false）
 * - syncPresence(value) を指定すると一定間隔でPresenceへ同期
 */
export default function useATB({
  initial = 0,
  max = 100,
  ratePerSec = 20,        // 1秒あたりの増加量
  paused = false,
  syncPresence,           // (value:number) => void|Promise<void>
  syncIntervalMs = 500,
} = {}) {
  const [atb, setAtb] = useState(initial);
  const atbRef = useRef(initial);
  const maxRef = useRef(max);
  const rateRef = useRef(ratePerSec);
  const pausedRef = useRef(paused);
  const tickRef = useRef(null);
  const syncRef = useRef(null);

  const clamp = useCallback((v) => Math.max(0, Math.min(maxRef.current, v)), []);

  const set = useCallback((v) => {
    atbRef.current = clamp(v);
    setAtb(atbRef.current);
  }, [clamp]);

  const reset = useCallback((v = 0) => set(v), [set]);

  const setMax = useCallback((v) => {
    maxRef.current = Math.max(1, Number(v) || 1);
    set(atbRef.current); // 範囲内に補正
  }, [set]);

  const setRate = useCallback((v) => {
    rateRef.current = Math.max(0, Number(v) || 0);
  }, []);

  const pause = useCallback(() => { pausedRef.current = true; }, []);
  const resume = useCallback(() => { pausedRef.current = false; }, []);

  const spend = useCallback((cost) => {
    const c = Math.max(0, Number(cost) || 0);
    if (atbRef.current < c) return false;
    set(atbRef.current - c);
    return true;
  }, [set]);

  useEffect(() => {
    // 200ms毎にレート/5 加算（例: 30/秒 → 6/200ms）
    tickRef.current = setInterval(() => {
      if (pausedRef.current || rateRef.current <= 0) return;
      if (atbRef.current >= maxRef.current) return;
      set(atbRef.current + rateRef.current * 0.2);
    }, 200);

    if (syncPresence) {
      syncRef.current = setInterval(() => {
        // Presenceは整数で十分（帯域節約）
        syncPresence(Math.round(atbRef.current));
      }, syncIntervalMs);
    }
    return () => {
      clearInterval(tickRef.current);
      clearInterval(syncRef.current);
    };
  }, [set, syncPresence, syncIntervalMs]);

  return {
    atb,               // 表示用 state
    set, reset, spend, // 値操作
    setMax, setRate,   // 上限/速度変更
    pause, resume,
    get value() { return atbRef.current; },
    get max()   { return maxRef.current; },
  };
}
