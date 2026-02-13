"use client";
import { useEffect, useState } from "react";
import { useTeam } from "@/hooks/useTeam";
import { GameInfo, getLastGame, getHighlightUrl, getOpponent, getTeamScore, getOpponentScore } from "@/lib/api";

export default function LastGame() {
  const { selectedTeam } = useTeam();
  const [game, setGame] = useState<GameInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getLastGame(selectedTeam.id).then((g) => { setGame(g); setLoading(false); });
  }, [selectedTeam.id]);

  if (loading) return <Card><p className="text-white/40 animate-pulse">Loading last game...</p></Card>;
  if (!game) return <Card><p className="text-white/40">No recent game found</p></Card>;

  const teamScore = getTeamScore(game);
  const oppScore = getOpponentScore(game);
  const opponent = getOpponent(game);
  const won = game.won;
  const date = new Date(game.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Last Game</h3>
        <span className={`text-sm font-bold px-2 py-0.5 rounded ${won ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
          {won ? "W" : "L"}
        </span>
      </div>
      <p className="text-2xl font-bold">
        {teamScore} – {oppScore}
      </p>
      <p className="text-white/60 text-sm mt-1">
        vs {opponent.name} · {date}
      </p>
      <a
        href={getHighlightUrl(selectedTeam.name, opponent.name, date)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block mt-3 text-sm hover:underline"
        style={{ color: "var(--team-primary)" }}
      >
        Watch Highlights →
      </a>
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
