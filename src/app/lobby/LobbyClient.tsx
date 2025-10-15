"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Ably from "ably";

const CAPACITY = 4;     // ← 上限4人
const MIN_PLAYERS = 2;  // 開始必要人数

type Member = { id: string; name: string; ready: boolean };

type Props = { room: string };

export default function LobbyClient({ room }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<Ably.Types.ConnectionState>("closed");
  const [members, setMembers] = useState<Member[]>([]);
  const [isFull, setIsFull] = useState(false);
  const enteredRef = useRef(false);

  const clientId = useMemo(() => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem("playerName") || `player-${crypto.randomUUID().slice(0, 6)}`;
  }, []);

  const clientRef = useRef<Ably.Types.RealtimePromise | null>(null);
  const chRef = useRef<Ably.Types.RealtimeChannelPromise | null>(null);
  const channelName = useMemo(() => `rooms:${room}`, [room]);

  useEffect(() => {
    const client = new Ably.Realtime.Promise({
      authUrl: `/api/ably-token?clientId=${encodeURIComponent(clientId)}`,
    });
    clientRef.current = client;

    client.connection.on(({ current }) => setStatus(current));

    client.connection.once("connected", async () => {
      const ch = client.channels.get(channelName);
      chRef.current = ch;
      await ch.attach();
            // 入室前に満員チェック
      const mem = await ch.presence.get();
      const already = mem.some((m) => m.clientId === clientId);
      if (!already && mem.length >= CAPACITY) {
        setIsFull(true);
        setMembers(formatMembers(mem));
        return; // enterしない
      }

      await ch.presence.enter({ name: clientId, ready: false });
      enteredRef.current = true;
      await refreshMembers();

      ch.presence.subscribe(["enter", "leave", "update"], refreshMembers);
      ch.subscribe("event", (msg) => {
        if (msg.data?.type === "START") {
          router.push(`/game?room=${encodeURIComponent(room)}`);
        }
      });
    });

    async function refreshMembers() {
      const ch = chRef.current!;
      const mem = await ch.presence.get();
      setMembers(formatMembers(mem));
      const meInside = mem.some((m) => m.clientId === clientId);
      setIsFull(!meInside && mem.length >= CAPACITY);
    }

    return () => {
      try { chRef.current?.unsubscribe(); } catch {}
      try { if (enteredRef.current) chRef.current?.presence.leave(); } catch {}
      try { clientRef.current?.close(); } catch {}
    };
  }, [channelName, clientId, room, router]);

  const me = members.find((m) => m.id === clientId);
  const idsSorted = useMemo(() => members.map((m) => m.id).sort(), [members]);
  const isHost = idsSorted[0] === clientId; // 先頭=ホスト
  const allReady = members.length >= MIN_PLAYERS && members.every((m) => m.ready);

  const toggleReady = async () => {
    if (isFull && !me) return; // 満員未参加は不可
    const ch = chRef.current!;
    const next = !me?.ready;
    await ch.presence.update({ name: clientId, ready: next });
  };
   const start = async () => {
    if (!isHost || !allReady) return;
    await chRef.current?.publish("event", { type: "START", by: clientId, ts: Date.now() });
  };

  const inviteUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    url.pathname = "/lobby";
    url.search = `?room=${encodeURIComponent(room)}`;
    return url.toString();
  }, [room]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(inviteUrl); alert("招待リンクをコピーしました"); }
    catch { alert("コピーに失敗しました"); }
  };

  // 4枠スロット
  const slots: (Member | undefined)[] = Array.from({ length: CAPACITY }, (_, i) => members[i]);

  const badge =
    status === "connected"
      ? { text: "Connected", bg: "#10b981" }
      : status === "connecting"
      ? { text: "Connecting…", bg: "#f59e0b" }
      : { text: "Disconnected", bg: "#ef4444" };

  return (
    <main style={{ maxWidth: 900, margin: "32px auto", padding: 16 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>Lobby — Room: {room}</h1>
        <span style={{ display: "inline-block", background: badge.bg, color: "#fff", padding: "4px 10px", borderRadius: 12 }}>{badge.text}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={copy} style={btn}>招待リンクをコピー</button>
        </div>
      </header>

      {isFull && !me && (
        <div style={{ background: "#e7e7e7ff", border: "1px solid #545769ff", color: "#ffd2d2", borderRadius: 10, padding: 10, marginBottom: 12 }}>
          このルームは現在 <b>{CAPACITY} / {CAPACITY}</b> で満員です。空きが出たら入り直してください。
        </div>
      )}
            <section style={{ background: "#ffffffff", border: "1px solid #dac5c5ff", borderRadius: 12, padding: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ fontWeight: 700 }}>参加者（最大 {CAPACITY} 人）</div>
          {isHost && <span style={{ fontSize: 12, opacity: 0.7 }}>(あなたがホスト)</span>}
          <span style={{ marginLeft: "auto", fontSize: 12, opacity: 0.7 }}>準備OK: {members.filter((m) => m.ready).length}/{members.length}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          {slots.map((m, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "#c0a1a1ff", border: "1px solid #29a72fff", borderRadius: 10, padding: 10, minHeight: 56 }}>
              <div style={{ width: 10, height: 10, borderRadius: 9999, background: m ? (m.ready ? "#10b981" : "#666") : "#ffffffff" }} />
              <div style={{ fontWeight: 700 }}>{m ? m.name : `空席 ${i + 1}`}</div>
              {m && idsSorted[0] === m.id && <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.8 }}>👑</span>}
              <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.8 }}>{m ? (m.ready ? "Ready" : "Not ready") : "—"}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <button onClick={toggleReady} disabled={isFull && !me} style={btn}>{me?.ready ? "準備解除" : "準備OK"}</button>
          <button onClick={start} disabled={!isHost || !allReady} style={{ ...btn, background: !isHost || !allReady ? "#333" : "#3b82f6" }}>開始（ホスト）</button>
        </div>
      </section>
    </main>
  );
}

function formatMembers(mem: Ably.Types.PresenceMessage[]): Member[] {
  return mem
    .map((m) => ({ id: m.clientId, name: m.data?.name || m.clientId, ready: Boolean(m.data?.ready) }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

const btn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #333",
  background: "#1a1a1a",
  color: "#fff",
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #333",
  background: "transparent",
  color: "#fff",
  cursor: "pointer",
};