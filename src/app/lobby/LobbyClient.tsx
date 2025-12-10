"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Ably from "ably";
import LobbyToast from "../components/LobbyToast";

type Member = {
  id: string;
  connectionId: string;
  name: string;
  ready: boolean;
};

type Props = { room: string };

/** ===== Create と同じ世界観のスタイル ===== */
const cardWrap: React.CSSProperties = {
  maxWidth: 800,
  margin: "32px auto",
  padding: 16,
};

const card: React.CSSProperties = {
  padding: 20,
  borderRadius: 18,
  background: "rgba(0,0,0,0.35)",
  border: "1px solid rgba(255,255,255,0.18)",
  boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
};

const panel: React.CSSProperties = {
  background: "rgba(0,0,0,0.28)",
  border: "1px solid rgba(255,255,255,0.16)",
  borderRadius: 14,
  padding: 14,
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
};

const btnBase: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 12,
  cursor: "pointer",
  backgroundColor: "transparent",
  color: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(255,255,255,0.25)",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
  transition: "transform .12s ease, border-color .12s ease, opacity .12s ease",
};

const btnPrimary: React.CSSProperties = {
  ...btnBase,
  border: "1px solid rgba(255, 215, 0, 0.7)",
  color: "#FFD54A",
  fontWeight: 800,
};

const btnGhost: React.CSSProperties = {
  ...btnBase,
};

const btnDanger: React.CSSProperties = {
  ...btnBase,
  border: "1px solid rgba(239, 68, 68, 0.65)",
  color: "rgba(255,255,255,0.95)",
};

const input: React.CSSProperties = {
  flex: 1,
  minWidth: 160,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.22)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  outline: "none",
};

const memberItem: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.16)",
  borderRadius: 12,
  padding: 10,
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
};

const announceBar: React.CSSProperties = {
  marginBottom: 12,
  padding: "10px 12px",
  borderRadius: 12,
  background: "rgba(0,0,0,0.55)",
  color: "#fff",
  fontWeight: 800,
  textAlign: "center",
  border: "1px solid rgba(255,255,255,0.16)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
};

export default function LobbyClient({ room }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [status, setStatus] = useState<Ably.Types.ConnectionState>("closed");
  const [members, setMembers] = useState<Member[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [nameConflict, setNameConflict] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const startedRef = useRef(false);
  const closingRef = useRef(false);

  // トースト
  const [toastMessage, setToastMessage] = useState("");
  const toastTimerRef = useRef<number | null>(null);

  const showToast = (message: string, duration: number = 3000) => {
    setToastMessage(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMessage(""), duration);
  };

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

      // clientIdごとの最新だけ残す
      const latest = new Map<string, Ably.Types.PresenceMessage>();
      mem.forEach((m) => {
        const prev = latest.get(m.clientId);
        if (!prev || (m.timestamp ?? 0) > (prev.timestamp ?? 0)) {
          latest.set(m.clientId, m);
        }
      });

      const list: Member[] = Array.from(latest.values())
        .map((m) => ({
          id: m.clientId,
          connectionId: m.connectionId,
          name: m.data?.name || m.clientId,
          ready: Boolean(m.data?.ready),
        }))
        .sort((a, b) => a.id.localeCompare(b.id));

      setMembers(list);

      const me = list.find((m) => m.id === clientId);
      if (me?.name) {
        setDisplayName((prev) => (prev === me.name ? prev : me.name));
      }

      const myName = me?.name || "";
      const conflict = list.some((m) => m.id !== clientId && m.name === myName);
      setNameConflict(conflict);
    }

    return () => {
      if (closingRef.current) return;
      closingRef.current = true;

      (async () => {
        try {
          if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
        } catch {}

        try {
          await chRef.current?.presence.leave();
        } catch {}
        try {
          chRef.current?.unsubscribe();
        } catch {}
        try {
          await clientRef.current?.close();
        } catch {}
      })();
    };
  }, [channelName, clientId, room, router]);

  const me = members.find((m) => m.id === clientId);
  const idsSorted = useMemo(() => members.map((m) => m.id).sort(), [members]);
  const isHost = idsSorted[0] === clientId;
  const allReady = members.length >= 2 && members.every((m) => m.ready);

  // ホストが自動で開始
  useEffect(() => {
    if (!isHost) return;
    if (members.length < 2) return;
    if (!allReady) return;
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
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

  useEffect(() => {
    if (!allReady) startedRef.current = false;
  }, [allReady]);

  const toggleReady = async () => {
    if (nameConflict) {
      if (pathname.startsWith("/lobby")) {
        showToast("❌ 名前が重複しています。変更しないと準備完了にできません");
      }
      return;
    }
    if (!chRef.current) return;

    const ch = chRef.current;
    const next = !me?.ready;
    await ch.presence.update({ name: displayName || clientId, ready: next });

    showToast(next ? "✅ 準備完了しました" : "準備を解除しました");
  };

  const updateMyName = async () => {
    const name = (displayName || "").trim();
    if (!name) {
      showToast("❌ 名前を入力してください");
      return;
    }

    const conflict = members
      .filter((m) => m.id !== clientId)
      .some((m) => m.name === name);

    setNameConflict(conflict);

    if (conflict) {
      showToast("❌ この名前は使用されています");
      return;
    }

    sessionStorage.setItem("playerName", name);
    await chRef.current?.presence.update({ name, ready: Boolean(me?.ready) });
    showToast("✅ 名前を更新しました");
  };

  const leaveLobby = async () => {
    try {
      await chRef.current?.presence.leave();
    } catch {}
    try {
      chRef.current?.unsubscribe();
    } catch {}
    try {
      await clientRef.current?.close();
    } catch {}

    router.push("/");
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
      showToast("✅ 招待リンクをコピーしました");
    } catch {
      showToast("❌ コピーに失敗しました");
    }
  };

  const badge =
    status === "connected"
      ? { text: "Connected", bg: "#10b981" }
      : status === "connecting"
      ? { text: "Connecting…", bg: "#f59e0b" }
      : { text: "Disconnected", bg: "#ef4444" };

  return (
    <div className="homeBackground">
      <main style={cardWrap}>
        {/* トースト通知 */}
        <LobbyToast message={toastMessage} />

        <div style={card}>
          <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 22, margin: 0, color: "#fff", fontWeight: 900 }}>
              Lobby — Room: {room}
            </h1>

            <span
              style={{
                display: "inline-block",
                background: badge.bg,
                color: "#fff",
                padding: "4px 10px",
                borderRadius: 12,
                fontWeight: 800,
              }}
            >
              {badge.text}
            </span>

            <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={copy} style={btnPrimary}>
                招待リンクをコピー
              </button>
              <button onClick={leaveLobby} style={btnDanger}>
                退室
              </button>
            </div>

            {nameConflict && (
              <div style={{ width: "100%", color: "#ef4444", fontWeight: 800 }}>
                ※ この名前は使用されています
              </div>
            )}
          </header>

          {announcement && <div style={announceBar}>{announcement}</div>}

          <section style={panel}>
            {/* 名前変更 */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <label style={{ fontWeight: 800, minWidth: 92, color: "rgba(255,255,255,0.9)" }}>
                あなたの名前
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="表示名（ロビー内での名前）"
                onKeyDown={(e) => {
                  if (e.key === "Enter") updateMyName();
                }}
                style={input}
              />
              <button onClick={updateMyName} style={btnPrimary}>
                更新
              </button>
            </div>

            {/* 参加者一覧 */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 900, color: "#fff" }}>参加者</div>
              {isHost && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>(あなたがホスト)</span>}
              <span style={{ marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                準備OK: {members.filter((m) => m.ready).length}/{members.length}
              </span>
            </div>

            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
              {members.map((m) => (
                <li key={m.id} style={memberItem}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 9999,
                      background: m.ready ? "#10b981" : "transparent",
                      border: "1px solid rgba(255,255,255,0.25)",
                    }}
                  />
                  <div style={{ fontWeight: 900, color: "#fff" }}>{m.name}</div>
                  <div style={{ marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
                    {m.ready ? "Ready" : "Not ready"}
                  </div>
                </li>
              ))}
            </ul>

            {/* 操作 */}
            <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
              <button
                onClick={toggleReady}
                disabled={nameConflict}
                style={{
                  ...(me?.ready ? btnGhost : btnPrimary),
                  ...(nameConflict
                    ? {
                        border: "1px solid rgba(255,255,255,0.18)",
                        color: "rgba(255,255,255,0.55)",
                        cursor: "not-allowed",
                        opacity: 0.8,
                      }
                    : {}),
                }}
              >
                {me?.ready ? "準備解除" : "準備OK"}
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
