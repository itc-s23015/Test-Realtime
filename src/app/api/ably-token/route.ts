// app/api/ably-token/route.ts
import { NextResponse } from "next/server";
import Ably from "ably/promises";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId") ?? "anonymous";
  const roomRaw = url.searchParams.get("room") ?? "*";

  // ★ クライアントで toUpperCase しているならサーバも合わせる
  const room = roomRaw.toUpperCase();

  const rest = new Ably.Rest(process.env.ABLY_API_KEY!);

 const capabilityObj = { "rooms:*": ["publish", "subscribe", "presence"] }; // ← presence を忘れずに

  const tokenRequest = await rest.auth.createTokenRequest({
    clientId,
    capability: JSON.stringify(capabilityObj), // ← JSON文字列で渡す
  });

  return NextResponse.json(tokenRequest);
}
