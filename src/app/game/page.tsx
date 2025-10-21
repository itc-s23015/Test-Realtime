import GameClient from "./GameClient";

export default async function Page({ searchParams }: { searchParams: Promise<{ room?: string }>}) {
  const sp = await searchParams;
  const room = (sp.room ?? "LOBBY").toUpperCase();
  return <GameClient room={room} />;
}
