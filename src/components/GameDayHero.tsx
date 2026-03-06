"use client";
import Link from "next/link";
import { useGameData } from "@/hooks/useGameData";
import { useTeam } from "@/hooks/useTeam";
import { useSpoilerContext } from "./SpoilerModeProvider";
import { getOpponent, getOpponentScore, getTeamScore } from "@/lib/api";

function isSameLocalDay(dateStr: string, compareDate: Date = new Date()): boolean {
  const date = new Date(dateStr);
  return (
    date.getFullYear() === compareDate.getFullYear() &&
    date.getMonth() === compareDate.getMonth() &&
    date.getDate() === compareDate.getDate()
  );
}

function formatTipoff(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getCountdown(dateStr: string): string {
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
  const { currentGame, nextGame, loading, error } = useGameData();
  const { hideScores } = useSpoilerContext();

  if (loading || error) return null;

  const heroGame = currentGame ?? nextGame;
  if (!heroGame || !isSameLocalDay(heroGame.date)) return null;

  const opponent = getOpponent(heroGame);
  const isLive = Boolean(currentGame);
  const matchupLabel = heroGame.isHome ? `vs ${opponent.name}` : `at ${opponent.name}`;
  const teamScore = getTeamScore(heroGame);
  const opponentScore = getOpponentScore(heroGame);
  const statusLabel = isLive ? heroGame.status || "Live" : formatTipoff(heroGame.date);
  const searchContext = `${selectedTeam.city} ${selectedTeam.name} vs ${opponent.name}`;

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-white/10 px-5 py-5 sm:px-7 sm:py-6"
      style={{
        background: `radial-gradient(circle at top left, ${selectedTeam.primaryColor}20, transparent 40%), linear-gradient(135deg, #171717, #101010)`,
      }}
    >
      <div className="absolute inset-y-0 right-0 w-40 opacity-20 blur-3xl" style={{ background: selectedTeam.secondaryColor }} />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] ${
            isLive
              ? "border-red-400/30 bg-red-500/10 text-red-300"
              : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
          }`}>
            {isLive ? "Live Now" : "Game Day"}
          </span>
          <div>
            <p className="text-sm text-white/45">{isLive ? "Live focus" : "Tonight&apos;s focus"}</p>
            <h2 className="text-2xl font-bold sm:text-3xl">{matchupLabel}</h2>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-white/60">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {statusLabel}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {heroGame.isHome ? "Home game" : "Road game"}
            </span>
            {isLive ? (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                {hideScores ? "Score hidden" : `${selectedTeam.abbreviation} ${teamScore} - ${opponent.abbreviation} ${opponentScore}`}
              </span>
            ) : (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                {getCountdown(heroGame.date)}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/schedule"
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Open schedule
          </Link>
          <a
            href={`https://www.google.com/search?q=${encodeURIComponent(searchContext)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg px-4 py-2 text-sm font-medium text-black transition"
            style={{ background: selectedTeam.secondaryColor }}
          >
            {isLive ? "Live context" : "Matchup context"}
          </a>
        </div>
      </div>
    </section>
  );
}
