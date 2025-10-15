"use client";

import { useEffect, useRef, useState } from "react";
import Ably from "ably";

type Props = { room: string };
type ConnState = Ably.Types.ConnectionState;

export default function GameClient({ room }: Props) {
  const [status, setStatus] = useState<ConnState>("closed");
  const [events, setEvents] = useState<string[]>([]);
  const clientRef = useRef<Ably.Types.RealtimePromise | null>(null);
  const channelRef = useRef<Ably.Types.RealtimeChannelPromise | null>(null);

  useEffect(() => {
    const clientId =
      sessionStorage.getItem("playerName") ||
      `player-${crypto.randomUUID().slice(0, 6)}`;

    const client = new Ably.Realtime.Promise({
      authUrl: `/api/ably-token?clientId=${encodeURIComponent(clientId)}`,
    });
    clientRef.current = client;

    client.connection.on(({ current }) => setStatus(current));

    client.connection.once("connected", async () => {
      const ch = client.channels.get(`rooms:${room}`);
      channelRef.current = ch;

      await ch.attach();
      ch.subscribe("event", (msg) => {
        setEvents((e) => [
          `${new Date().toLocaleTimeString()} — ${msg.data?.type} by ${msg.clientId}`,
          ...e,
        ].slice(0, 50));
      });

      setEvents((e) => [
        `${new Date().toLocaleTimeString()} — joined rooms:${room}`,
        ...e,
      ]);
      console.log("[ably] connected -> rooms:%s attached", room);
    });

    return () => {
      try { channelRef.current?.unsubscribe(); } catch {}
      client.close();
    };
  }, [room]);

  const sendBuy = async () => {
    if (!channelRef.current) return;
    await channelRef.current.publish("event", { type: "BUY", at: Date.now() });
    setEvents((e) => [`${new Date().toLocaleTimeString()} — BUY sent`, ...e]);
  };

  const badge =
    status === "connected"
      ? { text: "Connected", bg: "#10b981" }
      : status === "connecting"
      ? { text: "Connecting…", bg: "#f59e0b" }
      : { text: "Disconnected", bg: "#f59e0b" };

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1>Room: {room}</h1>
      <span style={{ display: "inline-block", background: badge.bg, color: "#fff", padding: "4px 10px", borderRadius: 12 }}>
        {badge.text}
      </span>

      <div style={{ margin: "12px 0" }}>
        <button onClick={sendBuy} disabled={status !== "connected"} style={{ padding: "8px 14px", borderRadius: 8 }}>
          BUY を送信
        </button>
      </div>

      <h3>イベント（最新が上）</h3>
      <div style={{ background: "#f7f7f7", padding: 12, borderRadius: 8 }}>
        {events.length === 0 ? "まだイベントがありません" : (
          <ul>{events.map((t, i) => <li key={i}>{t}</li>)}</ul>
        )}
      </div>
    </main>
  );
}
