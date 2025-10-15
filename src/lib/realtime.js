import * as Ably from 'ably';

export function createRealtime(roomId) {
  const client = new Ably.Realtime({
    // サーバレスAPIにトークンを取りに行く（鍵は露出しない）
    authUrl: `/api/ably-token?room=${encodeURIComponent(roomId)}`
  });
  const channel = client.channels.get(`rooms:${roomId}`);
  return { client, channel };
}
