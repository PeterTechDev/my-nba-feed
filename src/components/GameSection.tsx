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
import styles from "./Home.module.css";

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.game}>
      {children}
    </div>
  );
}

function SkeletonCard({ label }: { label: string }) {
  return (
    <Card>
      <h3 className="text-base font-semibold mb-5">{label}</h3>
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
      <h3 className="text-base font-semibold mb-3">Last Game</h3>
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
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-base font-semibold">Last Game</h3>
        <span className="text-xs text-white/70">{formatGameDate(lastGame.date, { month: "short", day: "numeric" })}</span>
      </div>
      <div className={styles.gamePair}>
        <div className={styles.matchup}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={selectedTeam.logo} alt="" width={40} height={40} className="h-10 w-10 shrink-0 object-contain" />
          <span className="font-semibold">{selectedTeam.abbreviation}</span>
          <span className="text-sm font-normal text-white/50">vs</span>
          <span className="font-semibold">{opponent.abbreviation}</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {opponentTeam && <img src={opponentTeam.logo} alt="" width={40} height={40} className="h-10 w-10 shrink-0 object-contain" />}
        </div>
        <ScoreReveal scope={`${selectedTeam.id}:${lastGame.id}`} label={`${selectedTeam.name} result`}>
          <p className="flex items-center gap-3 text-3xl font-bold tabular-nums tracking-tight">
            <span>{teamScore}</span><span className="text-xl text-white/50">–</span><span>{oppScore}</span>
          </p>
          <p className={`mt-2 text-sm font-semibold ${won ? "text-emerald-300" : "text-red-300"}`}>{won ? "Win" : "Loss"} · Final</p>
        </ScoreReveal>
      </div>
      <div className={styles.gameFooter}>
      <a
        href={getHighlightUrl(selectedTeam.name, opponent.name, date)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 w-full items-center justify-between gap-2 text-sm font-medium text-amber-200 hover:text-white"
      >
        <span className="inline-flex items-center gap-2"><Play aria-hidden="true" className="h-4 w-4" />Find game highlights</span><ArrowUpRight aria-hidden="true" className="h-4 w-4" /><span className="sr-only">on YouTube (opens in a new tab)</span>
      </a>
      {(hideScores || hideHeadlines) && <p className="text-xs text-white/70">YouTube results may contain spoilers.</p>}
      </div>
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
      <h3 className="text-base font-semibold mb-3">Next Game</h3>
      <p className="text-white/70 text-sm">No upcoming game found</p>
    </Card>
  );

  const opponent = getOpponent(nextGame);
  const opponentTeam = getTeamById((nextGame.isHome ? nextGame.awayTeam : nextGame.homeTeam).id);
  const date = formatGameDate(nextGame.startTime || nextGame.date, { weekday: "short", month: "short", day: "numeric" });
  const time = formatTipoff(nextGame.startTime, nextGame.status);

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold">Next Game</h3>
      </div>
      <div className={styles.gamePair}>
      <div>
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {opponentTeam && <img src={opponentTeam.logo} alt="" width={40} height={40} className="h-10 w-10 shrink-0 object-contain" />}
        <p className="text-2xl font-bold [text-wrap:balance]">{nextGame.isHome ? "vs" : "at"} {opponent.name}</p>
      </div>
      <p className="mt-2 text-white/70 text-sm">{date} · {nextGame.isHome ? "Home" : "Away"}</p>
      </div>
      <div>
      <p className="text-xl font-bold tabular-nums">{time}</p>
      <p className="text-sm mt-1 font-medium text-white/70">
        {timeUntil(nextGame.startTime)}
      </p>
      </div>
      </div>
      <div className={styles.gameFooter}>
        <Link href="/schedule" className="inline-flex min-h-11 w-full items-center justify-between gap-2 text-sm font-medium text-white/80 hover:text-white">Full schedule<ArrowUpRight aria-hidden="true" className="h-4 w-4" /></Link>
      </div>
    </Card>
  );
}
