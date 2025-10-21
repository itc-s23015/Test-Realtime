import LobbyClient from "./LobbyClient";

export default async function Page({
  searchParams,
}: { searchParams: Promise<{ room?: string }> }) {
  const sp = await searchParams;
  const room = typeof sp.room === "string" ? sp.room.toUpperCase() : "LOBBY";
  return <LobbyClient room={room} />;
}
