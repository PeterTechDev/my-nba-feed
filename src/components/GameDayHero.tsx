"use client";
import Link from "next/link";
import { getContrastColor } from "@/lib/teams";
import { formatTipoff, gameDaysAgo } from "@/lib/nbaDate";
import DataError from "./DataError";
import ScoreReveal from "./ScoreReveal";
import { useGameData } from "@/hooks/useGameData";
import { useTeam } from "@/hooks/useTeam";
import { useSpoilerContext } from "./SpoilerModeProvider";
import { getOpponent, getOpponentScore, getTeamScore } from "@/lib/api";

function getCountdown(dateStr?: string | null): string {
  if (!dateStr) return "Tipoff time TBD";
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return "Starting soon";

  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  if (hours > 0) return `${hours}h ${minutes}m to tipoff`;
  if (minutes > 0) return `${minutes}m to tipoff`;
  return "Tipoff soon";
}

export default function GameDayHero() {
  const { selectedTeam } = useTeam();
  const { currentGame, nextGame, loading, error, retry } = useGameData();
  const { hideScores, hideHeadlines } = useSpoilerContext();

  if (error) return <DataError subject="game data" retry={retry} />;
  if (loading) return null;

  const heroGame = currentGame ?? nextGame;
  if (!heroGame || (!currentGame && gameDaysAgo(heroGame.startTime || heroGame.date) !== 0)) return null;

  const opponent = getOpponent(heroGame);
  const isLive = Boolean(currentGame);
  const matchupLabel = heroGame.isHome ? `vs ${opponent.name}` : `at ${opponent.name}`;
  const teamScore = getTeamScore(heroGame);
  const opponentScore = getOpponentScore(heroGame);
  const statusLabel = isLive ? heroGame.status || "Live" : formatTipoff(heroGame.startTime, heroGame.status);
  const searchContext = `${selectedTeam.city} ${selectedTeam.name} vs ${opponent.name}`;

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-white/10 px-4 py-4 sm:px-7 sm:py-6"
      style={{
        background: `radial-gradient(circle at top left, ${selectedTeam.primaryColor}20, transparent 40%), linear-gradient(135deg, #171717, #101010)`,
      }}
    >
      <div className="absolute inset-y-0 right-0 w-40 opacity-20 blur-3xl" style={{ background: selectedTeam.secondaryColor }} />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold sm:text-3xl">{matchupLabel}</h2>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
              isLive
                ? "border-red-400/30 bg-red-500/10 text-red-300"
                : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
            }`}>
              {isLive ? "Live Now" : "Game Day"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-white/60">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {statusLabel}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {heroGame.isHome ? "Home game" : "Road game"}
            </span>
            {isLive ? (
              <ScoreReveal scope={`live:${selectedTeam.id}:${heroGame.id}`} label={`${selectedTeam.name} live score`}>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{selectedTeam.abbreviation} {teamScore} - {opponent.abbreviation} {opponentScore}</span>
              </ScoreReveal>
            ) : (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                {getCountdown(heroGame.startTime)}
              </span>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/schedule"
              className="inline-flex min-h-11 items-center rounded-lg px-4 py-2 text-sm font-medium transition hover:brightness-110"
              style={{ background: selectedTeam.secondaryColor, color: getContrastColor(selectedTeam.secondaryColor) }}
            >
              Open schedule
            </Link>
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(searchContext)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center text-sm text-white/70 underline underline-offset-4 transition hover:text-white"
            >
              Search matchup on Google ↗
            </a>
          </div>
          {(hideScores || hideHeadlines) && <p className="text-xs text-white/70">Google results may contain spoilers.</p>}
        </div>
      </div>
    </section>
  );
}
