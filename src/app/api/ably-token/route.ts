import { NextResponse } from "next/server";
import * as Ably from "ably/promises";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId") ?? "anonymous";
  const roomRaw = url.searchParams.get("room") ?? "*";

  // クライアントで toUpperCase しているならサーバも合わせる
  const room = roomRaw.toUpperCase();

  // 環境変数チェック
  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    console.error("❌ ABLY_API_KEY が設定されていません！");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  console.log("🔑 Ably Token Request:", { clientId, room });

  try {
    // ✅ Promises版を使用
    const rest = new Ably.Rest({ key: apiKey });

    const capabilityObj = { 
      [`rooms:${room}`]: ["publish", "subscribe", "presence"],
      "rooms:*": ["publish", "subscribe", "presence"] 
    };

    // await で直接使える
    const tokenRequest = await rest.auth.createTokenRequest({
      clientId,
      capability: JSON.stringify(capabilityObj),
    });

    console.log("✅ Token生成成功");
    return NextResponse.json(tokenRequest);
  } catch (error) {
    console.error("❌ Token生成エラー:", error);
    return NextResponse.json(
      { 
        error: "Token generation failed", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}