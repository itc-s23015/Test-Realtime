import Ably from 'ably/promises';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const room = searchParams.get('room') || 'lobby';

  // ここでログイン確認や入室可否チェックを行う（任意）
  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) return new Response('Missing ABLY_API_KEY', { status: 500 });

  const ably = new Ably.Rest(apiKey);
  const capability = JSON.stringify({ [`rooms:${room}`]: ['publish', 'subscribe'] });

  const token = await ably.auth.requestToken({
    clientId: 'player-' + Math.random().toString(36).slice(2, 8), // 実運用はユーザーID
    ttl: 60 * 60 * 1000, // 1時間
    capability
  });

  return new Response(JSON.stringify(token), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });
}
