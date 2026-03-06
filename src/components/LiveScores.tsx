"use client";
import { useEffect, useState } from "react";
import { useSpoilerContext } from "./SpoilerModeProvider";

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

function isFinalStatus(status: string): boolean {
  return status.trim().toLowerCase().startsWith("final");
}

function isLiveStatus(game: LiveGame): boolean {
  if (isFinalStatus(game.status)) return false;

  const normalizedStatus = game.status.trim().toLowerCase();
  if (!normalizedStatus) return false;

  if (normalizedStatus === "scheduled" || normalizedStatus === "postponed") return false;
  if (normalizedStatus === "halftime") return true;
  if (normalizedStatus.includes("qtr") || normalizedStatus.startsWith("q") || normalizedStatus.includes("ot")) {
    return true;
  }

  return game.homeScore + game.awayScore > 0;
}

export default function LiveScores() {
  const [games, setGames] = useState<LiveGame[]>([]);
  const [loading, setLoading] = useState(true);
  const { hideScores } = useSpoilerContext();

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

  const liveGames = games.filter(isLiveStatus);
  const scheduledGames = games.filter((g) => !isFinalStatus(g.status) && !isLiveStatus(g));

  // Only show if there are live or scheduled games — hide if all are Final
  if (liveGames.length === 0 && scheduledGames.length === 0) return null;

  const displayGames = [...liveGames, ...scheduledGames];

  return (
    <div className="rounded-xl overflow-hidden bg-[#161616] border border-[#2a2a2a]">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest">Live Games</h3>
          {liveGames.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-red-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {liveGames.length} LIVE
            </span>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {displayGames.map((game) => {
            const isLive = isLiveStatus(game);
            return (
              <div
                key={game.id}
                className={`shrink-0 rounded-lg px-3 py-2 border text-sm font-medium ${
                  isLive ? "border-red-500/30 bg-red-500/5" : "border-white/5 bg-white/[0.02]"
                }`}
              >
                {hideScores ? (
                  <span className="text-white/60">
                    {game.awayTeam.abbreviation} vs {game.homeTeam.abbreviation}
                  </span>
                ) : (
                  <span className="tabular-nums">
                    {game.awayTeam.abbreviation} {game.awayScore} - {game.homeTeam.abbreviation} {game.homeScore}
                  </span>
                )}
                {isLive && (
                  <span className="ml-2 text-[10px] text-red-400 font-bold">Q{game.period}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
