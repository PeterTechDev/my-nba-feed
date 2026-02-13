"use client";
import { useEffect, useState } from "react";
import { useTeam } from "@/hooks/useTeam";
import { GameInfo, getNextGame, getOpponent } from "@/lib/api";

function timeUntil(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff < 0) return "Starting soon";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `in ${days} day${days > 1 ? "s" : ""}`;
  if (hours > 0) return `in ${hours} hour${hours > 1 ? "s" : ""}`;
  return "Soon";
}

export default function NextGame() {
  const { selectedTeam } = useTeam();
  const [game, setGame] = useState<GameInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getNextGame(selectedTeam.id).then((g) => { setGame(g); setLoading(false); });
  }, [selectedTeam.id]);

  if (loading) return <Card><p className="text-white/40 animate-pulse">Loading next game...</p></Card>;
  if (!game) return <Card><h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Next Game</h3><p className="text-white/40 mt-2">No upcoming game found</p></Card>;

  const opponent = getOpponent(game);
  const date = new Date(game.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <Card>
      <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Next Game</h3>
      <p className="text-2xl font-bold">vs {opponent.name}</p>
      <p className="text-white/60 text-sm mt-1">{date} · {game.isHome ? "Home" : "Away"}</p>
      <p className="text-sm mt-2 font-medium" style={{ color: "var(--team-primary)" }}>
        {timeUntil(game.date)}
      </p>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
      {children}
    </div>
  );
}
