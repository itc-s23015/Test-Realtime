"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Ably from "ably";

export type LobbyMember = { id: string; name: string; ready: boolean };
export type LobbyState = {
  status: Ably.Types.ConnectionState;
  room: string;
  meId: string;
  isHost: boolean;
  isFull: boolean;
  members: LobbyMember[];
  toggleReady: () => Promise<void>;
  start: () => Promise<void>;
  leave: () => Promise<void>;
  onStarted?: (room: string) => void; // 任意: 開始通知
};

export function useLobbySync(room: string, capacity = 4, onStarted?: (r: string)=>void): LobbyState {
  const [status, setStatus] = useState<Ably.Types.ConnectionState>("closed");
  const [members, setMembers] = useState<LobbyMember[]>([]);
  const [isFull, setIsFull] = useState(false);

  const meId = useMemo(() => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem("playerName") || `player-${crypto.randomUUID().slice(0, 6)}`;
  }, []);

  const clientRef = useRef<Ably.Types.RealtimePromise | null>(null);
  const chRef = useRef<Ably.Types.RealtimeChannelPromise | null>(null);
  const enteredRef = useRef(false);

  const isHost = useMemo(() => {
    const ids = members.map(m => m.id).sort();
    return ids[0] === meId;
  }, [members, meId]);

  useEffect(() => {
    const client = new Ably.Realtime.Promise({
      authUrl: `/api/ably-token?clientId=${encodeURIComponent(meId)}&room=${encodeURIComponent(room)}`,
    });
    clientRef.current = client;
    client.connection.on(({ current }) => setStatus(current));

    client.connection.once("connected", async () => {
      const ch = client.channels.get(`rooms:${room}`);
      chRef.current = ch;
      await ch.attach();

      // 入室前に満員チェック
      const mem0 = await ch.presence.get();
      if (!mem0.some(m => m.clientId === meId) && mem0.length >= capacity) {
        setIsFull(true);
        setMembers(format(mem0));
        return;
      }

      await ch.presence.enter({ name: meId, ready: false });
      enteredRef.current = true;
      await refresh();

      ch.presence.subscribe(["enter","leave","update"], refresh);
      ch.subscribe("event", (msg) => {
        if (msg.data?.type === "START") {
          try { sessionStorage.setItem(`lobby-ok:${room}`, "1"); } catch {}
          onStarted?.(room);
        }
      });

      async function refresh() {
        const mem = await ch.presence.get();
        setMembers(format(mem));
        const inside = mem.some(m => m.clientId === meId);
        setIsFull(!inside && mem.length >= capacity);
      }
    });

    return () => {
      try { chRef.current?.unsubscribe(); } catch {}
      try { if (enteredRef.current) chRef.current?.presence.leave(); } catch {}
      try { clientRef.current?.close(); } catch {}
    };
  }, [room, meId, capacity, onStarted]);

  const toggleReady = async () => {
    if (!chRef.current) return;
    const me = members.find(m => m.id === meId);
    await chRef.current.presence.update({ name: meId, ready: !me?.ready });
  };

  const start = async () => {
    if (!chRef.current) return;
    if (!isHost || members.length < 2 || !members.every(m => m.ready)) return;
    await chRef.current.publish("event", { type: "START", by: meId, ts: Date.now() });
  };

  const leave = async () => {
    try { await chRef.current?.presence.leave(); } catch {}
  };

  return { status, room, meId, isHost, isFull, members, toggleReady, start, leave, onStarted };
}

function format(mem: Ably.Types.PresenceMessage[]): LobbyMember[] {
  return mem
    .map(m => ({ id: m.clientId, name: m.data?.name || m.clientId, ready: !!m.data?.ready }))
    .sort((a,b) => a.id.localeCompare(b.id));
}
