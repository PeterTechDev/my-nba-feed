"use client";
import Link from "next/link";
import { getTeamById } from "@/lib/teams";
import { NBA_TIME_ZONE, formatGameDate, formatTipoff, gameDaysAgo } from "@/lib/nbaDate";
import { ArrowUpRight } from "lucide-react";
import DataError from "./DataError";
import ScoreReveal from "./ScoreReveal";
import { useGameData } from "@/hooks/useGameData";
import { useTeam } from "@/hooks/useTeam";
import { useSpoilerContext } from "./SpoilerModeProvider";
import { getOpponent, getOpponentScore, getTeamScore } from "@/lib/api";
import styles from "./Home.module.css";
import GoogleCalendarLink from "./GoogleCalendarLink";

function easternDay(value: string): string {
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) options.timeZone = NBA_TIME_ZONE;
  return formatGameDate(value, options);
}

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
  const opponentTeam = getTeamById((heroGame.isHome ? heroGame.awayTeam : heroGame.homeTeam).id);
  const isLive = Boolean(currentGame);
  const matchupLabel = heroGame.isHome ? `vs ${opponent.name}` : `at ${opponent.name}`;
  const teamScore = getTeamScore(heroGame);
  const opponentScore = getOpponentScore(heroGame);
  const statusLabel = isLive ? heroGame.status || "Live" : formatTipoff(heroGame.startTime, heroGame.status);
  const searchContext = `${selectedTeam.city} ${selectedTeam.name} vs ${opponent.name}`;

  return (
    <section className={styles.game}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{isLive ? "Live Now" : "Next Game"}</h3>
        <span className={`text-xs font-semibold ${isLive ? "text-red-300" : "text-emerald-300"}`}>{isLive ? statusLabel : "Today"}</span>
      </div>
      <div className={styles.gamePair}>
      <div>
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {opponentTeam && <img src={opponentTeam.logo} alt="" width={40} height={40} className="h-10 w-10 shrink-0 object-contain" />}
        <p className="text-2xl font-bold [text-wrap:balance]">{matchupLabel}</p>
      </div>
      <p className="mt-2 text-sm text-white/70">{easternDay(heroGame.startTime || heroGame.date)} · {heroGame.isHome ? "Home" : "Away"}</p>
      </div>
      {isLive ? (
        <div>
          <ScoreReveal scope={`live:${selectedTeam.id}:${heroGame.id}`} label={`${selectedTeam.name} live score`}>
            {typeof teamScore === "number" && typeof opponentScore === "number"
              ? <p className="text-xl font-bold tabular-nums">{selectedTeam.abbreviation} {teamScore} – {opponent.abbreviation} {opponentScore}</p>
              : <p className="text-sm text-white/70">Score unavailable</p>}
          </ScoreReveal>
        </div>
      ) : <div>
        <p className="text-xl font-bold tabular-nums">{statusLabel}</p>
        <p className="mt-1 text-sm text-white/70">{getCountdown(heroGame.startTime)}</p>
      </div>}
      </div>
      <div className={styles.gameFooter}>
      {!isLive && <GoogleCalendarLink game={heroGame} />}
      <div className="flex items-center justify-between gap-3">
        <Link href="/schedule" className="inline-flex min-h-11 flex-1 items-center text-sm font-medium text-white/80 hover:text-white">Full schedule</Link>
        <a href={`https://www.google.com/search?q=${encodeURIComponent(searchContext)}`} target="_blank" rel="noopener noreferrer"
          aria-label="Search matchup on Google (opens in a new tab)" title="Search matchup on Google"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white">
          <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
        </a>
      </div>
      {(hideScores || hideHeadlines) && <p className="text-xs text-white/70">Google results may contain spoilers.</p>}
      </div>
    </section>
  );
}
