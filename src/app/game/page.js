'use client';

import { useEffect, useRef, useState } from 'react';
import { createRealtime } from '@/lib/realtime';

export default function GamePage() {
  // roomId は ?room=xxxx から取得（未指定なら test）
  const roomId =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('room') || 'test'
      : 'test';

  const r = useRef(null);
  const [status, setStatus] = useState('connecting');
  const [events, setEvents] = useState([]); // 画面に出すイベントログ

  useEffect(() => {
    // Realtime 初期化
    r.current = createRealtime(roomId);
    const { client, channel } = r.current;

    // 接続状態
    client.connection.on('connected', () => setStatus('connected'));
    client.connection.on('failed', () => setStatus('failed'));
    client.connection.on('disconnected', () => setStatus('disconnected'));

    // 受信: 全イベントを一覧に積む（price_tick も card_played も拾う）
    const handler = (msg) => {
      setEvents((prev) => [
        {
          at: new Date(msg.timestamp || Date.now()).toLocaleTimeString(),
          name: msg.name,
          data: msg.data,
        },
        ...prev,
      ].slice(0, 50)); // 直近50件だけ保持
    };
    channel.subscribe(handler);

    // お試しで price_tick も購読名を明示したい場合は↓でもOK
    // channel.subscribe('price_tick', handler);
    // channel.subscribe('card_played', handler);

    return () => {
      channel.unsubscribe(handler);
      client.close();
    };
  }, [roomId]);

  // 送信（BUY）
  async function sendBuy() {
    const ch = r.current?.channel;
    if (!ch) return;
    await ch.publish('card_played', { id: 'BUY' });
  }

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Room: {roomId}</h1>

      <div style={{ margin: '12px 0' }}>
        <StatusBadge status={status} />
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <button
          onClick={sendBuy}
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            border: '1px solid #ddd',
            cursor: 'pointer',
          }}
        >
          BUY を送信
        </button>
      </div>

      <div
        style={{
          border: '1px solid #eee',
          borderRadius: 12,
          padding: 12,
          background: '#fafafa',
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>イベント（最新が上）</div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {events.length === 0 && (
            <li style={{ color: '#666' }}>まだイベントがありません</li>
          )}
          {events.map((e, i) => (
            <li
              key={i}
              style={{
                padding: '8px 10px',
                background: '#fff',
                border: '1px solid #eee',
                borderRadius: 8,
                marginBottom: 6,
                display: 'flex',
                gap: 10,
              }}
            >
              <span style={{ minWidth: 82, fontFamily: 'monospace' }}>{e.at}</span>
              <span style={{ minWidth: 110, fontWeight: 600 }}>{e.name}</span>
              <code style={{ whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(e.data)}
              </code>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const color =
    status === 'connected'
      ? '#10b981'
      : status === 'failed'
      ? '#ef4444'
      : status === 'disconnected'
      ? '#f59e0b'
      : '#3b82f6';
  const label =
    status === 'connected'
      ? 'Connected'
      : status === 'failed'
      ? 'Failed'
      : status === 'disconnected'
      ? 'Disconnected'
      : 'Connecting…';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: 999,
        background: color,
        color: '#fff',
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {label}
    </span>
  );
}
