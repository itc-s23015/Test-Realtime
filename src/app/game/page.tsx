// ✅ サーバーで searchParams を await してから渡す
import GameClient from "./GameClient";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>;
}) {
  const sp = await searchParams;
  const room = typeof sp.room === "string" ? sp.room : "lobby";
  return <GameClient room={room} />;
}
