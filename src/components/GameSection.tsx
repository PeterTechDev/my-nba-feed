"use client";
import { formatGameDate, formatTipoff, gameDaysAgo } from "@/lib/nbaDate";
import { useGameData } from "@/hooks/useGameData";
import { useTeam } from "@/hooks/useTeam";
import { useSpoilerContext } from "./SpoilerModeProvider";
import { getHighlightUrl, getOpponent, getTeamScore, getOpponentScore } from "@/lib/api";
import ScoreReveal from "./ScoreReveal";
import Link from "next/link";
import { Play, ArrowUpRight } from "lucide-react";
import { getTeamById } from "@/lib/teams";

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col rounded-xl bg-[#161616] border border-[#2a2a2a] p-5 sm:p-6">
      {children}
    </div>
  );
}

function SkeletonCard({ label }: { label: string }) {
  return (
    <Card>
      <h2 className="text-base font-semibold mb-5">{label}</h2>
      <div role="status" aria-label={`Loading ${label.toLowerCase()}`} className="space-y-3 animate-pulse">
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
      <h2 className="text-base font-semibold mb-3">Last Game</h2>
      <p className="text-white/70 text-sm">No recent game found</p>
    </Card>
  );

  const teamScore = getTeamScore(lastGame);
  const oppScore = getOpponentScore(lastGame);
  const opponent = getOpponent(lastGame);
  const opponentTeam = getTeamById((lastGame.isHome ? lastGame.awayTeam : lastGame.homeTeam).id);
  const won = teamScore > oppScore;
  const date = formatGameDate(lastGame.date, { month: "short", day: "numeric", year: "numeric" });

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
        <h2 className="text-base font-semibold">Last Game</h2>
        <span className="text-xs text-white/70">{formatGameDate(lastGame.date, { month: "short", day: "numeric" })}</span>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={selectedTeam.logo} alt="" width={40} height={40} className="h-10 w-10 object-contain" />
          <span className="font-semibold">{selectedTeam.abbreviation}</span>
        </div>
        <div className="flex items-center justify-end gap-2">
          <span className="font-semibold">{opponent.abbreviation}</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {opponentTeam && <img src={opponentTeam.logo} alt="" width={40} height={40} className="h-10 w-10 object-contain" />}
        </div>
      </div>
      <div className="min-h-11 sm:min-h-24 mb-3">
        <ScoreReveal scope={`${selectedTeam.id}:${lastGame.id}`} label={`${selectedTeam.name} result`}>
          <p className="flex items-center justify-between gap-2 text-5xl font-bold tabular-nums tracking-tight">
            <span>{teamScore}</span><span className="text-2xl text-white/40">–</span><span>{oppScore}</span>
          </p>
          <p className={`mt-2 text-sm font-semibold ${won ? "text-emerald-300" : "text-red-300"}`}>{won ? "Win" : "Loss"} · Final</p>
        </ScoreReveal>
      </div>
      <a
        href={getHighlightUrl(selectedTeam.name, opponent.name, date)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center justify-between gap-2 mt-auto border-t border-white/10 pt-3 text-sm font-semibold text-amber-200 transition-colors hover:text-white"
      >
        <span className="inline-flex items-center gap-2"><Play aria-hidden="true" className="h-4 w-4" />Find game highlights</span><ArrowUpRight aria-hidden="true" className="h-4 w-4" /><span className="sr-only">on YouTube (opens in a new tab)</span>
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
      <h2 className="text-base font-semibold mb-3">Next Game</h2>
      <p className="text-white/70 text-sm">No upcoming game found</p>
    </Card>
  );

  const opponent = getOpponent(nextGame);
  const opponentTeam = getTeamById((nextGame.isHome ? nextGame.awayTeam : nextGame.homeTeam).id);
  const date = formatGameDate(nextGame.startTime || nextGame.date, { weekday: "short", month: "short", day: "numeric" });
  const time = formatTipoff(nextGame.startTime, nextGame.status);

  return (
    <Card>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold">Next Game</h2>
      </div>
      <div className="mb-3 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {opponentTeam && <img src={opponentTeam.logo} alt="" width={48} height={48} className="h-12 w-12 shrink-0 object-contain" />}
        <p className="text-2xl font-bold [text-wrap:balance]">{nextGame.isHome ? "vs" : "at"} {opponent.name}</p>
      </div>
      <p className="text-white/70 text-sm">{date} · {nextGame.isHome ? "Home" : "Away"}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums">{time}</p>
      <p className="text-sm mt-2 mb-5 font-medium text-white/70">
        {timeUntil(nextGame.startTime)}
      </p>
      <Link href="/schedule" className="mt-auto inline-flex min-h-11 items-center justify-between gap-2 border-t border-white/10 pt-3 text-sm font-medium text-white/80 hover:text-white">Full schedule<ArrowUpRight aria-hidden="true" className="h-4 w-4" /></Link>
    </Card>
  );
}
