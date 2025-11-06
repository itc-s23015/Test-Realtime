"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Ably from "ably";

type ConnState = Ably.Types.ConnectionState;
type Member = { id: string; name: string; ready: boolean };

const CAPACITY = 4;        // ルーム上限
const MIN_PLAYERS = 2;     // 開始に必要な最小人数

export default function LobbyClient({ room }: { room: string }) {
  const router = useRouter();

  // 表示用
  const [status, setStatus] = useState<ConnState>("closed");
  const [members, setMembers] = useState<Member[]>([]);
  const [isFull, setIsFull] = useState(false);

  // 固定値
  const clientId = useMemo(() => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem("playerName") || `player-${crypto.randomUUID().slice(0, 6)}`;
  }, []);
  const roomU = useMemo(() => room.toUpperCase(), [room]);
  const channelName = useMemo(() => `rooms:${roomU}`, [roomU]);

  // Refs
  const clientRef = useRef<Ably.Types.RealtimePromise | null>(null);
  const chRef = useRef<Ably.Types.RealtimeChannelPromise | null>(null);
  const enteredRef = useRef(false);
  const navigatingRef = useRef(false); // 遷移中フラグ（close遅延のため）

  // Ably 接続（1回のみ）
  useEffect(() => {
    if (clientRef.current) return;

    const client = new Ably.Realtime.Promise({
      authUrl: `/api/ably-token?clientId=${encodeURIComponent(clientId)}&room=${encodeURIComponent(roomU)}`,
      closeOnUnload: true,
    });
    clientRef.current = client;

    client.connection.on(({ current }) => setStatus(current));

    client.connection.once("connected", async () => {
      const ch = client.channels.get(channelName);
      chRef.current = ch;
      await ch.attach();

      // 入室前に満員チェック
      const initial = await ch.presence.get();
      const alreadyInside = initial.some((m) => m.clientId === clientId);
      if (!alreadyInside && initial.length >= CAPACITY) {
        setIsFull(true);
        setMembers(formatMembers(initial));
        return;
      }

      await ch.presence.enter({ name: clientId, ready: false });
      enteredRef.current = true;
      await refreshMembers();

      ch.presence.subscribe(["enter", "leave", "update"], refreshMembers);

      // START 受信 → ゲームへ
      ch.subscribe("event", (msg) => {
        if (msg.data?.type === "START") {
          try { sessionStorage.setItem(`lobby-ok:${roomU}`, "1"); } catch {}
          navigatingRef.current = true;
          router.push(`/game?room=${encodeURIComponent(roomU)}`);
        }
      });
    });

    async function refreshMembers() {
      const ch = chRef.current!;
      const mem = await ch.presence.get();
      const list = formatMembers(mem);
      setMembers(list);

      const meInside = mem.some((m) => m.clientId === clientId);
      setIsFull(!meInside && mem.length >= CAPACITY);
    }

    return () => {
      try { chRef.current?.unsubscribe(); } catch {}
      try { if (enteredRef.current) chRef.current?.presence.leave(); } catch {}
      const doClose = () => { try { clientRef.current?.close(); } catch {} };
      if (navigatingRef.current) setTimeout(doClose, 200);
      else doClose();
      clientRef.current = null;
    };
  }, [channelName, clientId, roomU, router]);

  // 派生値
  const me = members.find((m) => m.id === clientId);
  const idsSorted = useMemo(() => members.map((m) => m.id).sort(), [members]);
  const isHost = idsSorted[0] === clientId;
  const allReady = members.length >= MIN_PLAYERS && members.every((m) => m.ready);

  // 操作
  const toggleReady = async () => {
    if (!chRef.current || !enteredRef.current) return;
    const next = !me?.ready;
    await chRef.current.presence.update({ name: clientId, ready: next });
  };

  const start = async () => {
    if (!isHost || !allReady) return;
    navigatingRef.current = true;
    try { sessionStorage.setItem(`lobby-ok:${roomU}`, "1"); } catch {}

    try {
      await chRef.current?.publish("event", { type: "START", by: clientId, ts: Date.now() });
      await new Promise((r) => setTimeout(r, 60));
    } catch (e) {
      console.warn("[lobby] START publish failed:", e);
    }
    router.push(`/game?room=${encodeURIComponent(roomU)}`);
  };

  const inviteUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    url.pathname = "/lobby";
    url.search = `?room=${encodeURIComponent(roomU)}`;
    return url.toString();
  }, [roomU]);

  const badge =
    status === "connected"
      ? { t: "Connected", bg: "#10b981" }    // emerald-500
      : status === "connecting"
      ? { t: "Connecting…", bg: "#f59e0b" } // amber-500
      : { t: "Disconnected", bg: "#ef4444" }; // red-500

  // ===== UI =====
  return (
    <main style={page}>
      <header style={header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h1 style={title}>Lobby — Room: {roomU}</h1>
          <span style={{ ...chip, background: badge.bg }}>{badge.t}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => navigator.clipboard.writeText(inviteUrl)} style={btnSecondary}>招待リンクをコピー</button>
        </div>
      </header>

      {isFull && !me && (
        <div style={alert}>
          <b>満員</b>：このルームは <b>{CAPACITY}/{CAPACITY}</b> です。空きが出たら入り直してください。
        </div>
      )}

      <section style={panel}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ fontWeight: 700, color: "#0f172a" }}>参加者（最大 {CAPACITY} 人）</div>
          {isHost && <span style={{ fontSize: 12, color: "#475569" }}>(あなたがホスト)</span>}
          <span style={{ marginLeft: "auto", fontSize: 12, color: "#475569" }}>
            準備OK: {members.filter((m) => m.ready).length}/{members.length}
          </span>
        </div>

        <div style={grid2}>
          {Array.from({ length: CAPACITY }).map((_, i) => {
            const m = members[i];
            const isHostSeat = m && idsSorted[0] === m.id;
            return (
              <div key={i} style={memberCard}>
                <div style={{ ...dot, background: m ? (m.ready ? "#10b981" : "#94a3b8") : "#e5e7eb" }} />
                <div style={{ fontWeight: 700, color: m ? "#0f172a" : "#94a3b8" }}>
                  {m ? m.name : `空席 ${i + 1}`}
                </div>
                {isHostSeat && <span title="Host" style={{ marginLeft: 6, color: "#f59e0b" }}>👑</span>}
                <div style={{ marginLeft: "auto", fontSize: 12, color: "#64748b" }}>
                  {m ? (m.ready ? "Ready" : "待機中") : "—"}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button onClick={toggleReady} disabled={isFull && !me} style={btnPrimary}>
            {me?.ready ? "準備解除" : "準備OK"}
          </button>
          <button
            onClick={start}
            disabled={!isHost || !allReady}
            style={{
              ...btnPrimary,
              background: !isHost || !allReady ? "#bfdbfe" : "#2563eb", // disabled: blue-200 / enabled: blue-600
              borderColor: !isHost || !allReady ? "#93c5fd" : "#1d4ed8",
              color: !isHost || !allReady ? "#1e3a8a" : "#fff",
            }}
          >
            開始（ホスト）
          </button>
        </div>
      </section>
    </main>
  );
}

/* ---------- helpers ---------- */
function formatMembers(mem: Ably.Types.PresenceMessage[]): Member[] {
  return mem
    .map((m) => ({ id: m.clientId, name: m.data?.name || m.clientId, ready: !!m.data?.ready }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/* ---------- styles ---------- */
const page: React.CSSProperties = {
  maxWidth: 920,
  margin: "32px auto",
  padding: 16,
  background: "linear-gradient(135deg,#f8fafc 0%,#eef2ff 100%)", // 明るいグラデ
  borderRadius: 16,
  boxShadow: "0 10px 30px rgba(2,6,23,0.06)",
};

const header: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 16,
  justifyContent: "space-between",
};

const title: React.CSSProperties = {
  margin: 0,
  fontSize: 22,
  color: "#0f172a", // slate-900
};

const chip: React.CSSProperties = {
  color: "#fff",
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  boxShadow: "0 2px 10px rgba(2,6,23,.12)",
};

const panel: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 16,
  boxShadow: "0 4px 14px rgba(2,6,23,0.04)",
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
};

const memberCard: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 12,
  minHeight: 56,
};

const dot: React.CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: 9999,
};

const btnBase: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  borderWidth: 1,
  cursor: "pointer",
  fontWeight: 600,
};

const btnPrimary: React.CSSProperties = {
  ...btnBase,
  background: "#22c55e",        // emerald-500
  border: "1px solid #16a34a",  // emerald-600
  color: "#ffffff",
};

const btnSecondary: React.CSSProperties = {
  ...btnBase,
  background: "#ffffff",
  border: "1px solid #cbd5e1",  // slate-300
  color: "#0f172a",
};

const btnGhost: React.CSSProperties = {
  ...btnBase,
  background: "transparent",
  border: "1px solid #cbd5e1",
  color: "#2563eb",
};

const alert: React.CSSProperties = {
  background: "#fff7ed",       // amber-50
  border: "1px solid #fed7aa", // amber-200
  color: "#9a3412",            // amber-800
  borderRadius: 12,
  padding: 12,
  marginBottom: 12,
};
