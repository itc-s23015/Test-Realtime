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
    if (clientRef.current) return; // HMR/再描画での二重初期化防止

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
      // 購読解除
      try { chRef.current?.unsubscribe(); } catch {}
      try { if (enteredRef.current) chRef.current?.presence.leave(); } catch {}

      // 遷移中は close を遅延（キュー破棄 80017 の赤エラー抑制）
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
      await new Promise((r) => setTimeout(r, 60)); // 送信フラッシュの猶予
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
      ? { t: "Connected", bg: "#10b981" }
      : status === "connecting"
      ? { t: "Connecting…", bg: "#f59e0b" }
      : { t: "Disconnected", bg: "#ef4444" };

  // UI
  return (
    <main style={{ maxWidth: 900, margin: "32px auto", padding: 16 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Lobby — Room: {roomU}</h1>
        <span style={{ background: badge.bg, color: "#fff", padding: "4px 10px", borderRadius: 12 }}>{badge.t}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={() => router.push(`/game?room=${encodeURIComponent(roomU)}`)} style={btnGhost}>スキップして入室</button>
        </div>
      </header>

      {isFull && !me && (
        <div style={alert}>
          このルームは <b>{CAPACITY}/{CAPACITY}</b> で満員です。空きが出たら入り直してください。
        </div>
      )}

      <section style={panel}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ fontWeight: 700 }}>参加者（最大 {CAPACITY} 人）</div>
          {isHost && <span style={{ fontSize: 12, opacity: 0.75 }}>(あなたがホスト)</span>}
          <span style={{ marginLeft: "auto", fontSize: 12, opacity: 0.75 }}>
            準備OK: {members.filter((m) => m.ready).length}/{members.length}
          </span>
        </div>

        <div style={grid2}>
          {Array.from({ length: CAPACITY }).map((_, i) => {
            const m = members[i];
            const hostBadge = m && idsSorted[0] === m.id;
            return (
              <div key={i} style={memberCard}>
                <div style={{ width: 10, height: 10, borderRadius: 9999, background: m ? (m.ready ? "#10b981" : "#666") : "#333" }} />
                <div style={{ fontWeight: 700 }}>{m ? m.name : `空席 ${i + 1}`}</div>
                {hostBadge && <span style={{ marginLeft: 6 }}>👑</span>}
                <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.8 }}>{m ? (m.ready ? "Ready" : "待機中") : "—"}</div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button onClick={toggleReady} disabled={isFull && !me} style={btn}>
            {me?.ready ? "準備解除" : "準備OK"}
          </button>
          <button
            onClick={start}
            disabled={!isHost || !allReady}
            style={{ ...btn, background: !isHost || !allReady ? "#333" : "#3b82f6" }}
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
const panel: React.CSSProperties = {
  background: "#0f0f0f",
  border: "1px solid #222",
  borderRadius: 12,
  padding: 12,
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const memberCard: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "#111",
  border: "1px solid #222",
  borderRadius: 10,
  padding: 10,
  minHeight: 56,
};

const btn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #333",
  background: "#1a1a1a",
  color: "#fff",
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  ...btn,
  background: "transparent",
};

const alert: React.CSSProperties = {
  background: "#2a1f1f",
  border: "1px solid #5a2f2f",
  color: "#ffd2d2",
  borderRadius: 10,
  padding: 10,
  marginBottom: 12,
};
