"use client";
import { useEffect, useState } from "react";

interface LiveGame {
  id: number;
  status: string;
  period: number;
  time: string;
  homeTeam: { id: number; name: string; abbreviation: string };
  awayTeam: { id: number; name: string; abbreviation: string };
  homeScore: number;
  awayScore: number;
}

export default function LiveScores() {
  const [games, setGames] = useState<LiveGame[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLive = async () => {
    try {
      const res = await fetch("/api/games/live");
      if (!res.ok) return;
      const data = await res.json();
      setGames(data.games || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLive();
    const interval = setInterval(fetchLive, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return null;
  if (games.length === 0) return null;

  const liveGames = games.filter((g) => g.status !== "Final" && g.status !== "" && g.homeScore + g.awayScore > 0);
  const finalGames = games.filter((g) => g.status === "Final");
  const scheduledGames = games.filter((g) => g.status !== "Final" && (g.homeScore + g.awayScore === 0));

  return (
    <div className="rounded-xl overflow-hidden bg-[#161616] border border-[#2a2a2a]">
      <div className="h-0.5 bg-gradient-to-r from-red-500 to-orange-500" />
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest">Today&apos;s Games</h3>
          {liveGames.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-red-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...liveGames, ...finalGames, ...scheduledGames].map((game) => {
            const isLive = game.status !== "Final" && game.homeScore + game.awayScore > 0;
            const isFinal = game.status === "Final";
            return (
              <div
                key={game.id}
                className={`rounded-lg p-3 border ${isLive ? "border-red-500/30 bg-red-500/5" : "border-white/5 bg-white/[0.02]"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isLive ? "text-red-400" : isFinal ? "text-white/40" : "text-emerald-400"}`}>
                    {isLive ? `Q${game.period} ${game.time || ""}` : isFinal ? "Final" : game.status || "Scheduled"}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{game.awayTeam.abbreviation}</span>
                    <span className="text-sm font-bold tabular-nums">{game.awayScore}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{game.homeTeam.abbreviation}</span>
                    <span className="text-sm font-bold tabular-nums">{game.homeScore}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
