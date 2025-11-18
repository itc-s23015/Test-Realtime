import LobbyClient from "./LobbyClient";

export const runtime = "nodejs";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>;
}) {
  const sp = await searchParams;
  const room = typeof sp.room === "string" ? sp.room : "lobby";
  return <LobbyClient room={room} />;
}
