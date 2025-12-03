"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Ably from "ably";
// import { connection } from "next/server";
import { usePathname } from "next/navigation";

type Member = { 
  id: string;
  //新規追加 
  connectionId: string; 
  name: string; 
  ready: boolean 
};
type Props = { room: string };

const btn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #333",
  background: "#15c057ff",
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

const btnDanger: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #7f1d1d",
  background: "#991b1b",
  color: "#fff",
  cursor: "pointer",
};

const input: React.CSSProperties = {
  flex: 1,
  minWidth: 160,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #333",
  background: "#ffffffff",
  color: "#000000ff",
};

export default function LobbyClient({ room }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<Ably.Types.ConnectionState>("closed");
  const [members, setMembers] = useState<Member[]>([]);
  const [displayName, setDisplayName] = useState("");
  const pathname = usePathname();
  
// 新規追加
const [nameConflict, setNameConflict] = useState(false);

//　新規追加
const [announcement, setAnnouncement] = useState("");
const startedRef = useRef(false);

  const clientId = useMemo(() => {
    if (typeof window === "undefined") return "";
    let id = sessionStorage.getItem("clientUUID");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("clientUUID", id);
    }
    return id;
  }, []);
  
  const clientRef = useRef<Ably.Types.RealtimePromise | null>(null);
  const chRef = useRef<Ably.Types.RealtimeChannelPromise | null>(null);

  const closingRef = useRef(false);
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

      const initialName =
        (typeof window !== "undefined" && sessionStorage.getItem("playerName")) || clientId;
      await ch.presence.enter({ name: initialName, ready: false });
      setDisplayName(initialName);

      await refreshMembers();
      ch.presence.subscribe(["enter", "leave", "update"], refreshMembers);
      ch.subscribe("event", async (msg) => {
        if (msg.data?.type === "START") {
          router.push(`/game?room=${encodeURIComponent(room)}`);
        }
      });

      //新規追加
      ch.subscribe("announce", (msg) => {
        const text = msg.data?.text;
        if (!text) return;

        setAnnouncement(text);
        setTimeout(() => setAnnouncement(""), 1200);
      });
    });

    async function refreshMembers() {
      const ch = chRef.current!;
      const mem = await ch.presence.get();
//新規追加
      const latest = new Map<string, Ably.Types.PresenceMessage>();

      mem.forEach((m) => {
        const prev = latest.get(m.clientId);
        if (!prev || (m.timestamp ?? 0) > (prev.timestamp ?? 0)) {
          latest.set(m.clientId, m);
        }
      })

      const list: Member[] = Array.from(latest.values())
        .map((m) => ({
          id: m.clientId,
          //新規追加
          connectionId: m.connectionId,
          name: m.data?.name || m.clientId,
          ready: Boolean(m.data?.ready),
        }))
        .sort((a, b) => a.id.localeCompare(b.id));
      setMembers(list);

      // ★ displayName を参照せず、関数型 setState で同期（依存から外せる）
      const me = list.find((m) => m.id === clientId);
      if (me && me.name) {
        setDisplayName((prev) => (prev === me.name ? prev : me.name));
      }
      //  新規追加 //
      // const sameNameCount = list.filter((m) => m.name === me?.name).length

      // 新規追加 //
      const myName = me?.name || "";
      const conflict = list.some((m) => m.id !== clientId && m.name === myName);
      setNameConflict(conflict);
  } 
    
    return () => {
      if (closingRef.current) return;
      closingRef.current = true;

      (async () => {
        try { await chRef.current?.presence.leave(); } catch {}
        try { chRef.current?.unsubscribe(); } catch {}
        try { await clientRef.current?.close(); } catch {}
      })();
    };
    // ★ 依存から displayName を外した
    }, [channelName, clientId, room, router]);

  const me = members.find((m) => m.id === clientId);
  const idsSorted = useMemo(() => members.map((m) => m.id).sort(), [members]);
  const isHost = idsSorted[0] === clientId;
  const allReady = members.length >= 2 && members.every((m) => m.ready);

  //useeffect変更
  useEffect(() => {
    if (!isHost) return;
    if (members.length < 2) return;
    if (!allReady) return;
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      //アナウンス
      await chRef.current?.publish("announce", {
        text: "対戦を開始します",
        ts: Date.now(),
      });

      setTimeout(() => {
        chRef.current?.publish("event", {
          type: "START",
          by: clientId,
          ts: Date.now(),
        });
      }, 900);
    })();
  }, [isHost, allReady, members.length, clientId]);

  //新規追加
  useEffect(() => {
    if (!allReady) startedRef.current = false;
  }, [allReady]);

    

  const toggleReady = async () => {
    // 新規追加 //
    if (nameConflict) {
      if (pathname.startsWith("/lobby")) {
        alert("名前が重複しています。変更しないと準備完了にできません");
      }
      return;
    }

    if (!chRef.current) {
      return;
    }

    const ch = chRef.current!;
    const next = !me?.ready;
    await ch.presence.update({ name: displayName || clientId, ready: next });
  };

  const updateMyName = async () => {
    const name = (displayName || "").trim();
    if (!name) {
      alert("名前を入力してください");
      return;
    }

    //修正・追加
    const conflict = members
    .filter((m) => m.id !== clientId)
    .some((m) => m.name === name);
    setNameConflict(conflict)
    if (conflict) {
      alert("この名前は使用されています");
      return;
    }
    
    setNameConflict(false);

    sessionStorage.setItem("playerName",name);
    await chRef.current?.presence.update({ name, ready: Boolean(me?.ready) });
  };

  const leaveLobby = async () => {
    try { await chRef.current?.presence.leave(); } catch {}
    try { chRef.current?.unsubscribe(); } catch {}
    try { await clientRef.current?.close(); } catch {}
    router.push("/");
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
    try {
      await navigator.clipboard.writeText(inviteUrl);
      alert("招待リンクをコピーしました");
    } catch {
      alert("コピーに失敗しました");
    }
  };

  const badge =
    status === "connected"
      ? { text: "Connected", bg: "#10b981" }
      : status === "connecting"
      ? { text: "Connecting…", bg: "#f59e0b" }
      : { text: "Disconnected", bg: "#ef4444" };

  return (
    <main style={{ maxWidth: 800, margin: "32px auto", padding: 16 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>Lobby — Room: {room}</h1>
        <span style={{ display: "inline-block", background: badge.bg, color: "#ffffffff", padding: "4px 10px", borderRadius: 12 }}>{badge.text}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={copy} style={btn}>招待リンクをコピー</button>
          {/* ▼ スキップして入室 を削除 */}
          <button onClick={leaveLobby} style={btnDanger}>退室</button>
        </div>

        {nameConflict && (
          <div style={{ color: "red", marginBottom: 12}}>
            ※ この名前は使用されています
          </div>
        )}

      </header>

      {announcement && (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 12px",
            borderRadius: 10,
            background: "#111827",
            color: "#fff",
            fontWeight: 800,
            textAlign: "center",
            border: "1px solid #000",
          }}
          >
            {announcement}
          </div>
      )}

      <section style={{ background: "#ffffffff", border: "1px solid #000000ff", borderRadius: 12, padding: 12 }}>
        {/* 名前変更 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <label style={{ fontWeight: 700, minWidth: 72 }}>あなたの名前</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="表示名（ロビー内での名前）"
            onKeyDown={(e) => { if (e.key === "Enter") updateMyName(); }}
            style={input}
          />
          <button onClick={updateMyName} style={btn}>更新</button>
        </div>

        {/* 参加者一覧 */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ fontWeight: 700 }}>参加者</div>
          {isHost && <span style={{ fontSize: 12, opacity: 0.7 }}>(あなたがホスト)</span>}
          <span style={{ marginLeft: "auto", fontSize: 12, opacity: 0.7 }}>
            準備OK: {members.filter((m) => m.ready).length}/{members.length}
          </span>
        </div>
       

       
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
          {members.map((m) => (
            <li key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#ffffffff", border: "1px solid #5e2191ff", borderRadius: 10, padding: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: 9999, background: m.ready ? "#10b981" : "#ffffffff" }} />
              <div style={{ fontWeight: 700 }}>{m.name}</div>
              <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.8 }}>{m.ready ? "Ready" : "Not ready"}</div>
            </li>
          ))}
        </ul>

        {/* 操作 */}
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <button 
          onClick={toggleReady}
          disabled={nameConflict} //新規追加
          style={{
            ...btn,
            background: nameConflict ? "#aaa" : btn.background,
            cursor: nameConflict ? "not-allowed" : "pointer"
          }
        }
          >
            {me?.ready ? "準備解除" : "準備OK"}
          </button>

        </div>
      </section>
    </main>
  );
}