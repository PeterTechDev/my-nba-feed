"use client";
import { formatGameDate, formatTipoff, gameDaysAgo } from "@/lib/nbaDate";
import { useGameData } from "@/hooks/useGameData";
import { useTeam } from "@/hooks/useTeam";
import { useSpoilerContext } from "./SpoilerModeProvider";
import { getHighlightUrl, getOpponent, getTeamScore, getOpponentScore } from "@/lib/api";
import ScoreReveal from "./ScoreReveal";

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden bg-[#161616] border border-[#2a2a2a]">
      <div className="p-6">{children}</div>
    </div>
  );
}

function SkeletonCard({ label }: { label: string }) {
  return (
    <Card>
      <h2 className="text-xs font-bold text-white/60 uppercase tracking-widest mb-3">{label}</h2>
      <div className="space-y-3 animate-pulse">
        <div className="h-8 w-32 bg-white/10 rounded" />
        <div className="h-4 w-40 bg-white/10 rounded" />
        <div className="h-3 w-24 bg-white/10 rounded" />
      </div>
    </Card>
  );
}

function timeUntil(dateStr?: string | null): string {
  if (!dateStr) return "Tipoff time TBD";
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff < 0) return "Starting soon";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `in ${days} day${days > 1 ? "s" : ""}`;
  if (hours > 0) return `in ${hours} hour${hours > 1 ? "s" : ""}`;
  return "Soon";
}

export function LastGameCard() {
  const { selectedTeam } = useTeam();
  const { lastGame, loading, error } = useGameData();
  const { hideScores, hideHeadlines } = useSpoilerContext();

  if (loading) return <SkeletonCard label="Last Game" />;
  if (error) return null;
  if (!lastGame) return (
    <Card>
      <h2 className="text-xs font-bold text-white/60 uppercase tracking-widest mb-3">Last Game</h2>
      <p className="text-white/70 text-sm">No recent game found</p>
    </Card>
  );

  const teamScore = getTeamScore(lastGame);
  const oppScore = getOpponentScore(lastGame);
  const opponent = getOpponent(lastGame);
  const won = teamScore > oppScore;
  const date = formatGameDate(lastGame.date, { month: "short", day: "numeric", year: "numeric" });

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold text-white/60 uppercase tracking-widest">Last Game</h2>
      </div>
      <p className="mb-3 text-lg font-semibold text-white/80">vs {opponent.name} · {date}</p>
      <ScoreReveal scope={`${selectedTeam.id}:${lastGame.id}`} label={`${selectedTeam.name} result`}>
        <p className="text-2xl font-extrabold tabular-nums tracking-tight">{teamScore} – {oppScore}</p>
        <p className={`text-sm font-semibold ${won ? "text-green-400" : "text-red-400"}`}>{won ? "Win" : "Loss"}</p>
      </ScoreReveal>
      <a
        href={getHighlightUrl(selectedTeam.name, opponent.name, date)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center mt-3 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
      >
        Find highlights on YouTube ↗
      </a>
      {(hideScores || hideHeadlines) && <p className="text-xs text-white/70">YouTube results may contain spoilers.</p>}
    </Card>
  );
}

export function NextGameCard() {
  const { currentGame, nextGame, loading, error } = useGameData();

  if (loading) return <SkeletonCard label="Next Game" />;
  if (error) return null;
  if (currentGame || (nextGame && gameDaysAgo(nextGame.startTime || nextGame.date) === 0)) return null;
  if (!nextGame) return (
    <Card>
      <h2 className="text-xs font-bold text-white/60 uppercase tracking-widest mb-3">Next Game</h2>
      <p className="text-white/70 text-sm">No upcoming game found</p>
    </Card>
  );

  const opponent = getOpponent(nextGame);
  const date = formatGameDate(nextGame.date, { weekday: "short", month: "short", day: "numeric" });
  const time = formatTipoff(nextGame.startTime, nextGame.status);

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold text-white/60 uppercase tracking-widest">Next Game</h2>
      </div>
      <p className="text-2xl font-bold">{nextGame.isHome ? "vs" : "at"} {opponent.name}</p>
      <p className="text-white/60 text-sm mt-1">
        {date} · {time} · {nextGame.isHome ? "Home" : "Away"}
      </p>
      <p className="text-sm mt-2 font-medium text-emerald-400">
        {timeUntil(nextGame.startTime)}
      </p>
    </Card>
  );
}
