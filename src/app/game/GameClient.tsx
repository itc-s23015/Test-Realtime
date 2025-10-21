"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Ably from "ably";

type ConnState = Ably.Types.ConnectionState;
type Props = { room: string };

type Player = {
  id: string;
  name: string;
  cash: number;
  holding: number;
  online: boolean;
};

type PriceEvt = { type: "PRICE"; price: number; ts: number };
type TradeEvt = { type: "TRADE"; who: string; kind: "BUY" | "SELL"; qty: number; price: number; ts: number };
type CardEvt  = { type: "CARD";  who: string; effect: "FORCE_SELL"; amount: number; ts: number };
type StartEvt = { type: "GAME_START"; t0: number; startPrice: number };
type EndEvt   = { type: "GAME_END";  winnerId: string; winnerName: string; finalPrice: number; scores: Record<string, number> };
type AnyEvt   = PriceEvt | TradeEvt | CardEvt | StartEvt | EndEvt;

const MAX_HOLD = 100;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const fmt = (n: number) => n.toLocaleString("ja-JP");
const now = () => Date.now();

export default function GameClient({ room }: Props) {
  const router = useRouter();

  // 表示・ゲーム状態
  const [status, setStatus] = useState<ConnState>("closed");
  const [price, setPrice]   = useState(15000);
  const [events, setEvents] = useState<string[]>([]);
  const [me, setMe]   = useState<Player>({ id: "", name: "", cash: 100_000, holding: 10, online: true });
  const [opp, setOpp] = useState<Player>({ id: "", name: "相手",  cash: 100_000, holding: 10, online: false });

  // タイマー表示
  const [elapsedMs, setElapsedMs] = useState(0);
  const [remainMs,  setRemainMs]  = useState(60_000);
  const [started, setStarted]     = useState(false);
  const [ended, setEnded]         = useState(false);
  const [winner, setWinner]       = useState<{ id: string; name: string } | null>(null);

  // 参照
  const clientRef = useRef<Ably.Types.RealtimePromise | null>(null);
  const chRef     = useRef<Ably.Types.RealtimeChannelPromise | null>(null);
  const tickerRef = useRef<any>(null);
  const timerRef  = useRef<any>(null);
  const endRef    = useRef<any>(null);

  const isHostRef      = useRef(false);
  const startTsRef     = useRef<number | null>(null);
  const startPriceRef  = useRef<number>(15000);

  // ルームとID
  const roomU = useMemo(() => room.toUpperCase(), [room]);
  const channelName = useMemo(() => `rooms:${roomU}`, [roomU]);
  const clientId = useMemo(() => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem("playerName") || `player-${crypto.randomUUID().slice(0, 6)}`;
  }, []);

  // 追加：最新値を保持する refs
const priceRef = useRef(price);
useEffect(() => { priceRef.current = price; }, [price]);

const meRef = useRef(me);
useEffect(() => { meRef.current = me; }, [me]);

const oppRef = useRef(opp);
useEffect(() => { oppRef.current = opp; }, [opp]);

// ❌ これまで: useEffect(..., [channelName, clientId, price, roomU, me, opp])
// ✅ 修正: 依存は roomU と clientId だけ
useEffect(() => {
  if (clientRef.current) return;

  const client = new Ably.Realtime.Promise({
    authUrl: `/api/ably-token?clientId=${encodeURIComponent(clientId)}&room=${encodeURIComponent(roomU)}`,
    closeOnUnload: true,
  });
  clientRef.current = client;

  setMe((p) => ({ ...p, id: clientId, name: clientId }));

  client.connection.on(({ current }) => setStatus(current));

  client.connection.once("connected", async () => {
    const ch = client.channels.get(`rooms:${roomU}`);
    chRef.current = ch;

    await ch.attach();
    await ch.presence.enter({ name: clientId });

    await electHostAndSyncOpponent();
    ch.presence.subscribe(["enter", "leave", "update"], electHostAndSyncOpponent);

    ch.subscribe("event", (msg) => {
      const d = msg.data as AnyEvt;
      if (!d || !("type" in d)) return;

      switch (d.type) {
        case "GAME_START":
          startTsRef.current = d.t0;
          startPriceRef.current = d.startPrice;
          setPrice(d.startPrice);
          bootTimer(d.t0);
          setStarted(true);
          break;

        case "PRICE":
          setPrice(d.price);
          break;

        case "TRADE": {
          const isMeTrade = d.who === clientId;
          if (d.kind === "BUY") {
            if (isMeTrade) setMe(p => ({ ...p, cash: p.cash - d.qty * d.price, holding: clamp(p.holding + d.qty, 0, MAX_HOLD) }));
            else           setOpp(p => ({ ...p, cash: p.cash - d.qty * d.price, holding: clamp(p.holding + d.qty, 0, MAX_HOLD) }));
          } else {
            if (isMeTrade) setMe(p => ({ ...p, cash: p.cash + d.qty * d.price, holding: clamp(p.holding - d.qty, 0, MAX_HOLD) }));
            else           setOpp(p => ({ ...p, cash: p.cash + d.qty * d.price, holding: clamp(p.holding - d.qty, 0, MAX_HOLD) }));
          }
          break;
        }

        case "CARD":
          // …（省略：そのままでOK）
          break;

        case "GAME_END":
          finishGameUI(d);
          break;
      }
    });
  });

  async function electHostAndSyncOpponent() {
    const ch = chRef.current!;
    const mem = await ch.presence.get();
    const ids = mem.map((m) => m.clientId).sort();
    const hostId = ids[0] ?? clientId;
    isHostRef.current = hostId === clientId;

    const other = ids.find((id) => id !== clientId);
    setOpp((p) => ({ ...p, id: other ?? "", name: other ?? "相手", online: Boolean(other) }));

    // 未開始ならホストが開始 & タイカー開始（7秒）
    if (!startTsRef.current && isHostRef.current) {
      const t0 = Date.now() + 800;
      const startPrice = priceRef.current;
      startTsRef.current = t0;
      startPriceRef.current = startPrice;
      bootTimer(t0);
      setStarted(true);
      startTicker(); // ← 下で定義
      safePublish({ type: "GAME_START", t0, startPrice });
    }
  }

  function startTicker() {
    clearInterval(tickerRef.current);
    if (!isHostRef.current) return;
    tickerRef.current = setInterval(() => {
      const prev = priceRef.current;
      const delta = Math.round((Math.random() - 0.5) * 600);
      const next = clamp(prev + delta, 10000, 20000);
      // state更新とref更新を揃える
      setPrice(next);
      // publish
      try { chRef.current?.publish("event", { type: "PRICE", price: next, ts: Date.now() } as PriceEvt); } catch {}
    }, 7000);
  }

  function bootTimer(t0: number) {
    clearInterval(timerRef.current);
    clearTimeout(endRef.current);

    const update = () => {
      const el = Math.max(0, Date.now() - t0);
      const rem = Math.max(0, 60_000 - el);
      setElapsedMs(el);
      setRemainMs(rem);
    };
    update();
    timerRef.current = setInterval(update, 250);

    const msLeft = Math.max(0, 60_000 - (Date.now() - t0));
    endRef.current = setTimeout(() => {
      if (isHostRef.current) {
        const finalPrice = priceRef.current;
        const baseMe  = 100_000 + 10 * (startPriceRef.current ?? finalPrice);
        const baseOpp = 100_000 + 10 * (startPriceRef.current ?? finalPrice);

        const m = meRef.current;
        const o = oppRef.current;

        const netMe  = m.cash + m.holding * finalPrice;
        const netOpp = o.cash + o.holding * finalPrice;

        const profitMe  = netMe  - baseMe;
        const profitOpp = netOpp - baseOpp;

        const winnerId   = profitMe >= profitOpp ? m.id : (o.id || m.id);
        const winnerName = profitMe >= profitOpp ? m.name : (o.name || m.name);

        const payload: EndEvt = {
          type: "GAME_END",
          winnerId,
          winnerName,
          finalPrice,
          scores: { [m.id]: profitMe, [o.id || "opponent"]: profitOpp },
        };
        try { chRef.current?.publish("event", payload); } catch {}
        finishGameUI(payload);
      }
    }, msLeft);
  }

  function finishGameUI(d: EndEvt) {
    setEnded(true);
    setWinner({ id: d.winnerId, name: d.winnerName });
    clearInterval(tickerRef.current);
    clearInterval(timerRef.current);
    clearTimeout(endRef.current);
    setRemainMs(0);
  }

  function safePublish(data: AnyEvt) {
    try { chRef.current?.publish("event", data as any); } catch {}
  }

  return () => {
    try { chRef.current?.unsubscribe(); } catch {}
    clearInterval(tickerRef.current);
    clearInterval(timerRef.current);
    clearTimeout(endRef.current);
    try { clientRef.current?.close(); } catch {}
    clientRef.current = null;
  };
}, [roomU, clientId]); // ← 依存はこれだけに

  // 送信系
  const [qty, setQty] = useState(1);
  const canBuy  = qty > 0 && me.cash >= qty * price && me.holding + qty <= MAX_HOLD;
  const canSell = qty > 0 && me.holding >= qty;

  const publish = (data: AnyEvt) => { try { chRef.current?.publish("event", data as any); } catch {} };

  const buy = () => {
    if (!canBuy) return;
    publish({ type: "TRADE", who: me.id, kind: "BUY",  qty, price, ts: now() } as TradeEvt);
  };
  const sell = () => {
    if (!canSell) return;
    publish({ type: "TRADE", who: me.id, kind: "SELL", qty, price, ts: now() } as TradeEvt);
  };
  const forceSell = (amount = 5) => publish({ type: "CARD", who: me.id, effect: "FORCE_SELL", amount, ts: now() } as CardEvt);

  // タイマー表示（mm:ss）
  const mm = Math.floor(remainMs / 1000 / 60);
  const ss = Math.floor((remainMs / 1000) % 60);
  const timeLeft = `${mm}:${ss.toString().padStart(2, "0")}`;

  const badge =
    status === "connected"
      ? { t: "Connected", bg: "#10b981" }
      : status === "connecting"
      ? { t: "Connecting…", bg: "#f59e0b" }
      : { t: "Disconnected", bg: "#ef4444" };

  // 勝利画面（オーバーレイ）
  const goLobby = () => router.push(`/lobby?room=${encodeURIComponent(roomU)}`);
  const goHome  = () => router.push(`/`);

  return (
    <main style={{ maxWidth: 1120, margin: "24px auto", padding: 16 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, margin: 0, color: "#0f172a" /* slate-900 */ }}>Room: {roomU}</h1>
        <span style={{ display: "inline-block", background: badge.bg, color: "#fff", padding: "4px 10px", borderRadius: 12 }}>{badge.t}</span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ color: "#2563eb", fontWeight: 700 }}>Price: ¥{fmt(price)}</span>
          <span style={{ background: started ? "#22c55e" : "#94a3b8", color: "#fff", padding: "4px 10px", borderRadius: 12 }}>
            ⏱ {timeLeft}
          </span>
        </span>
      </header>

      {/* 2カラム：左 盤面／右 ログ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
        {/* 盤面 */}
        <section style={{ display: "grid", gridTemplateRows: "auto auto 1fr", gap: 12 }}>
          {/* プレイヤー2面（配色を少しカラフルに） */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <PlayerCard title="あなた" p={me} tone="#e2fbe8" border="#16a34a" />
            <PlayerCard title="相手"   p={opp} tone="#fee2e2" border="#ef4444" />
          </div>

          {/* 操作 */}
          <div style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ color: "#0f172a" }}>数量</label>
              <input
                type="number"
                step={1}
                min={1}
                max={MAX_HOLD}
                value={qty}
                onChange={(e) => setQty(clamp(Number(e.target.value) || 1, 1, MAX_HOLD))}
                style={{ width: 110, padding: "6px 8px", borderRadius: 8, border: "1px solid #94a3b8", background: "#ffffff" }}
              />
              <button onClick={() => setQty(Math.min(MAX_HOLD - me.holding, Math.max(1, Math.floor(me.cash / price))))} style={btn}>
                MAX
              </button>
              <button onClick={buy}  disabled={!canBuy}  style={{ ...btn, background: canBuy  ? "#10b981" : "#b9e7d6" }}>BUY</button>
              <button onClick={sell} disabled={!canSell} style={{ ...btn, background: canSell ? "#ef4444" : "#f7c9c9" }}>SELL</button>

              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button onClick={() => forceSell(5)} style={{ ...btn, background: "#3b82f6" }}>🃏 Force-Sell(5)</button>
              </div>
            </div>
          </div>

          {/* 盤面（チャート差し込み予定） */}
          <div style={{
            background: "linear-gradient(135deg,#f8fafc 0%,#e0f2fe 100%)",
            border: "1px solid #bae6fd",
            borderRadius: 12,
            padding: 16,
            color: "#0f172a",
            display: "grid",
            placeItems: "center"
          }}>
            ここにチャートなどを後で差し込み
          </div>
        </section>

        {/* ログ */}
        <aside style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 12, height: 540, overflow: "auto" }}>
          <div style={{ fontWeight: 700, marginBottom: 8, color: "#93c5fd" }}>イベント（最新が上）</div>
          {events.length === 0 ? (
            <div style={{ opacity: 0.7, fontSize: 12, color: "#cbd5e1" }}>まだイベントがありません</div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
              {events.map((t, i) => (
                <li key={i} style={{ fontSize: 12, color: "#e2e8f0" }}>{t}</li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      {/* 勝利オーバーレイ */}
      {ended && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(2,6,23,0.6)",
          display: "grid", placeItems: "center", zIndex: 50
        }}>
          <div style={{
            width: 520, background: "#ffffff", border: "2px solid #c084fc",
            borderRadius: 16, padding: 20, boxShadow: "0 10px 30px rgba(2,6,23,0.4)"
          }}>
            <h2 style={{ margin: 0, marginBottom: 8, color: "#6d28d9" }}>🎉 勝敗結果</h2>
            <p style={{ margin: 0, marginBottom: 16, color: "#0f172a" }}>
              勝者：<b>{winner?.name || "—"}</b>
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={goLobby} style={{ ...btn, background: "#22c55e" }}>ロビーに戻る</button>
              <button onClick={goHome}  style={{ ...btn, background: "#2563eb" }}>ホームに戻る</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* --- 小物UI --- */
function PlayerCard({ title, p, tone, border }: { title: string; p: Player; tone: string; border: string }) {
  return (
    <div style={{ background: tone, border: `1px solid ${border}`, borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ fontWeight: 700, color: "#0f172a" }}>{title}</div>
        {!p.online && <span style={{ marginLeft: "auto", fontSize: 12, color: "#334155" }}>offline</span>}
      </div>
      <div style={{ marginTop: 6, fontSize: 13, color: "#0f172a" }}>{p.name}</div>
      <div style={{ display: "flex", gap: 12, marginTop: 8, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" }}>
        <Stat label="CASH" value={`¥${fmt(p.cash)}`} />
        <Stat label="HOLD" value={`${fmt(p.holding)} 株`} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, padding: 8 }}>
      <div style={{ fontSize: 10, color: "#64748b" }}>{label}</div>
      <div style={{ fontWeight: 700, color: "#0f172a" }}>{value}</div>
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #334155",
  background: "#e2e8f0",
  color: "#0f172a",
  cursor: "pointer",
};
