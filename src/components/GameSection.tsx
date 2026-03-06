"use client";
import { useGameData } from "@/hooks/useGameData";
import { useTeam } from "@/hooks/useTeam";
import { useSpoilerContext } from "./SpoilerModeProvider";
import { getHighlightUrl, getOpponent, getTeamScore, getOpponentScore } from "@/lib/api";

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
      <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest mb-3">{label}</h3>
      <div className="space-y-3 animate-pulse">
        <div className="h-8 w-32 bg-white/10 rounded" />
        <div className="h-4 w-40 bg-white/10 rounded" />
        <div className="h-3 w-24 bg-white/10 rounded" />
      </div>
    </Card>
  );
}

function ErrorCard({ label, error }: { label: string; error: string }) {
  return (
    <Card>
      <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest mb-3">{label}</h3>
      <div className="flex items-center gap-2 text-red-400 text-sm">
        <span>Error: {error}</span>
      </div>
    </Card>
  );
}

function timeUntil(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff < 0) return "Starting soon";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `in ${days} day${days > 1 ? "s" : ""}`;
  if (hours > 0) return `in ${hours} hour${hours > 1 ? "s" : ""}`;
  return "Soon";
}

function isSameLocalDay(dateStr: string, compareDate: Date = new Date()): boolean {
  const date = new Date(dateStr);
  return (
    date.getFullYear() === compareDate.getFullYear() &&
    date.getMonth() === compareDate.getMonth() &&
    date.getDate() === compareDate.getDate()
  );
}

export function LastGameCard() {
  const { selectedTeam } = useTeam();
  const { lastGame, loading, error } = useGameData();
  const { hideScores } = useSpoilerContext();

  if (loading) return <SkeletonCard label="Last Game" />;
  if (error) return <ErrorCard label="Last Game" error={error} />;
  if (!lastGame) return (
    <Card>
      <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest mb-3">Last Game</h3>
      <p className="text-white/30 text-sm">No recent game found</p>
    </Card>
  );

  const teamScore = getTeamScore(lastGame);
  const oppScore = getOpponentScore(lastGame);
  const opponent = getOpponent(lastGame);
  const won = lastGame.won;
  const date = new Date(lastGame.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest">Last Game</h3>
        {!hideScores && (
          <span className={`text-sm font-bold px-2 py-0.5 rounded ${won ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
            {won ? "W" : "L"}
          </span>
        )}
      </div>
      {hideScores ? (
        <>
          <p className="text-lg font-semibold text-white/80">
            vs {opponent.name} · {date}
          </p>
          <p className="text-xs text-white/40 mt-2">Score hidden — spoiler-free mode</p>
        </>
      ) : (
        <p className="text-2xl font-extrabold tabular-nums tracking-tight">
          {teamScore} – {oppScore}
        </p>
      )}
      <p className="text-white/60 text-sm mt-1">
        {!hideScores && <>vs {opponent.name} · {date}</>}
      </p>
      <a
        href={getHighlightUrl(selectedTeam.name, opponent.name, date)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block mt-3 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
      >
        Watch Highlights →
      </a>
    </Card>
  );
}

export function NextGameCard() {
  const { currentGame, nextGame, loading, error } = useGameData();

  if (loading) return <SkeletonCard label="Next Game" />;
  if (error) return <ErrorCard label="Next Game" error={error} />;
  if (currentGame) return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest">Current Game</h3>
        <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-red-400">
          Live
        </span>
      </div>
      <p className="text-2xl font-bold">{currentGame.isHome ? "vs" : "at"} {getOpponent(currentGame).name}</p>
      <p className="text-white/60 text-sm mt-1">{currentGame.status || "In progress"}</p>
      <p className="text-xs text-white/45 mt-3">
        The live game state has moved ahead of the next-game preview until the final buzzer.
      </p>
    </Card>
  );
  if (!nextGame) return (
    <Card>
      <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest mb-3">Next Game</h3>
      <p className="text-white/30 text-sm">No upcoming game found</p>
    </Card>
  );

  const opponent = getOpponent(nextGame);
  const isGameDay = isSameLocalDay(nextGame.date);
  const date = new Date(nextGame.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const time = new Date(nextGame.date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest">Next Game</h3>
        {isGameDay && (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
            Tonight
          </span>
        )}
      </div>
      <p className="text-2xl font-bold">{nextGame.isHome ? "vs" : "at"} {opponent.name}</p>
      <p className="text-white/60 text-sm mt-1">
        {date} · {time} · {nextGame.isHome ? "Home" : "Away"}
      </p>
      <p className={`text-sm mt-2 font-medium ${isGameDay ? "text-white" : "text-emerald-400"}`}>
        {timeUntil(nextGame.date)}
      </p>
      {isGameDay && (
        <p className="text-xs text-white/45 mt-3">
          The dashboard is in game day mode, so tonight&apos;s matchup is front and center.
        </p>
      )}
    </Card>
  );
}
