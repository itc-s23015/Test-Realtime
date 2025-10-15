// app/api/ably-token/route.ts でも route.js でもOK
import Ably from 'ably/promises';

export async function GET(req: Request) {
  const key = process.env.ABLY_API_KEY;
  if (!key) return new Response('ABLY_API_KEY is missing', { status: 500 });

  const client = new Ably.Rest(key);
  const { searchParams } = new URL(req.url);

  const clientId = searchParams.get('clientId') || 'anonymous';
  const room = searchParams.get('room') || 'lobby';

  // この部屋だけに publish/subscribe を許可
  const capability = JSON.stringify({ [`rooms:*`]: ['publish', 'subscribe'] });

  const tokenRequest = await client.auth.createTokenRequest({
    clientId,
    capability,
    ttl: 60 * 60 * 1000, // 任意: 1時間
  });

  return new Response(JSON.stringify(tokenRequest), {
    headers: { 'Content-Type': 'application/json' },
  });
}
