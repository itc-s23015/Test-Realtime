"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Ably from "ably";

type Props = { room: string };
type ConnState = Ably.Types.ConnectionState;

type Member = { id: string; name?: string };

export default function GameClient({ room }: Props) {
  const roomU = useMemo(() => room.toUpperCase(), [room]);

  // 表示用
  const [status, setStatus] = useState<ConnState>("closed");
  const [events, setEvents] = useState<string[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  // Ably
  const clientRef = useRef<Ably.Types.RealtimePromise | null>(null);
  const chRef = useRef<Ably.Types.RealtimeChannelPromise | null>(null);

  // 自分のID（Homeで保存している想定。無ければ生成）
  const clientId = useMemo(() => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem("playerName") || `player-${crypto.randomUUID().slice(0, 6)}`;
  }, []);

  const channelName = useMemo(() => `rooms:${roomU}`, [roomU]);

  useEffect(() => {
    // 二重初期化を避ける
    if (clientRef.current) return;

    const client = new Ably.Realtime.Promise({
      // ★ 重要: room を付与してサーバーの capability と一致させる
      authUrl: `/api/ably-token?clientId=${encodeURIComponent(clientId)}&room=${encodeURIComponent(roomU)}`,
      closeOnUnload: true,
    });
    clientRef.current = client;

    const log = (s: string) =>
      setEvents((e) => [`${new Date().toLocaleTimeString()} — ${s}`, ...e].slice(0, 100));

    client.connection.on(({ current }) => {
      setStatus(current);
      log(`connection: ${current}`);
    });

    client.connection.once("connected", async () => {
      const ch = client.channels.get(channelName);
      chRef.current = ch;

      await ch.attach();
      await ch.presence.enter({ name: clientId });

      // 参加者初期表示
      await refreshMembers();

      // presence 変化で参加者更新
      ch.presence.subscribe(["enter", "leave", "update"], refreshMembers);

      // イベント購読
      ch.subscribe("event", (msg) => {
        log(`event: ${JSON.stringify(msg.data)} (from ${msg.clientId})`);
      });

      log(`attached to ${channelName}`);
    });

    async function refreshMembers() {
      const ch = chRef.current!;
      const mem = await ch.presence.get();
      const list = mem
        .map((m) => ({ id: m.clientId, name: m.data?.name as string | undefined }))
        .sort((a, b) => a.id.localeCompare(b.id));
      setMembers(list);
    }

    return () => {
      try { chRef.current?.unsubscribe(); } catch {}
      try { clientRef.current?.close(); } catch {}
      clientRef.current = null;
    };
  }, [channelName, clientId, roomU]);

  // テスト送信
  const sendPing = async () => {
    if (!chRef.current) return;
    await chRef.current.publish("event", { type: "PING", at: Date.now(), by: clientId });
    setEvents((e) => [`${new Date().toLocaleTimeString()} — PING sent`, ...e].slice(0, 100));
  };

  const badge =
    status === "connected"
      ? { text: "Connected", bg: "#10b981" }
      : status === "connecting"
      ? { text: "Connecting…", bg: "#f59e0b" }
      : { text: "Disconnected", bg: "#ef4444" };

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1>Room: {roomU}</h1>
      <span style={{ display: "inline-block", background: badge.bg, color: "#fff", padding: "4px 10px", borderRadius: 12 }}>
        {badge.text}
      </span>

      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={sendPing} disabled={status !== "connected"} style={{ padding: "8px 14px", borderRadius: 8 }}>
          テストイベント（PING）送信
        </button>
        <span style={{ fontSize: 12, opacity: 0.7 }}>channel: <code>{`rooms:${roomU}`}</code></span>
      </div>

      <section style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 8 }}>参加者（presence）</h3>
        {members.length === 0 ? (
          <div style={{ background: "#fafafa", border: "1px solid #eee", borderRadius: 8, padding: 10 }}>
            まだ誰もいません
          </div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
            {members.map((m) => (
              <li key={m.id} style={{ background: "#fafafa", border: "1px solid #eee", borderRadius: 8, padding: 8 }}>
                <b>{m.name || m.id}</b> <span style={{ opacity: 0.6, fontSize: 12 }}>({m.id})</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 8 }}>イベントログ（最新が上）</h3>
        <div style={{ background: "#f7f7f7", padding: 12, borderRadius: 8, minHeight: 120 }}>
          {events.length === 0 ? "まだイベントがありません" : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {events.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
