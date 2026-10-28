"use client";
import { useEffect, useState } from "react";
import { formatGameDate, formatTipoff, gameDaysAgo, parseGameDate } from "@/lib/nbaDate";
import { useGameData } from "@/hooks/useGameData";
import { useTeam } from "@/hooks/useTeam";
import { useSpoilerContext } from "./SpoilerModeProvider";
import { getHighlightUrl, getOpponent, getTeamScore, getOpponentScore, type GameInfo } from "@/lib/api";
import ScoreReveal from "./ScoreReveal";
import Link from "next/link";
import { Play, ArrowUpRight } from "lucide-react";
import { getTeamById, teamByAbbreviation, type Team } from "@/lib/teams";
import { isDigestDate, parseCoveredGames, readDigestLeagueDate, type CoveredGame, type DigestEntry } from "@/lib/digest";
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

function summaryTeams(focus: Team, favorites: Team[]): Team[] {
  const rest = favorites.filter((team, index) => team.id !== focus.id && favorites.findIndex((item) => item.id === team.id) === index);
  return [focus, ...rest];
}

function teamSide(game: CoveredGame, team: Team): "home" | "away" | null {
  if (teamByAbbreviation(game.homeAbbr)?.id === team.id) return "home";
  if (teamByAbbreviation(game.awayAbbr)?.id === team.id) return "away";
  return null;
}

function teamLabel(team: Team): string {
  return `${team.city} ${team.name}`;
}

function opponentLabel(abbreviation: string): string {
  const team = teamByAbbreviation(abbreviation);
  return team ? teamLabel(team) : abbreviation;
}

function resultLine(team: Team, game: CoveredGame, side: "home" | "away"): string {
  const teamScore = side === "home" ? game.homeScore : game.awayScore;
  const opponentScore = side === "home" ? game.awayScore : game.homeScore;
  const opponent = opponentLabel(side === "home" ? game.awayAbbr : game.homeAbbr);
  const label = teamLabel(team);
  return teamScore > opponentScore
    ? `O ${label} venceu o ${opponent} por ${teamScore} a ${opponentScore}.`
    : `O ${label} perdeu para o ${opponent} por ${opponentScore} a ${teamScore}.`;
}

function leagueLine(game: CoveredGame): string {
  const homeWon = game.homeScore > game.awayScore;
  const winner = opponentLabel(homeWon ? game.homeAbbr : game.awayAbbr);
  const loser = opponentLabel(homeWon ? game.awayAbbr : game.homeAbbr);
  const winnerScore = homeWon ? game.homeScore : game.awayScore;
  const loserScore = homeWon ? game.awayScore : game.homeScore;
  return `O ${winner} venceu o ${loser} por ${winnerScore} a ${loserScore}.`;
}

function gameKey(game: CoveredGame): string {
  return `${game.awayAbbr}@${game.homeAbbr}`;
}

function coverageLabel(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("pt-BR", {
    day: "numeric", month: "short", timeZone: "UTC",
  }).replaceAll(".", "");
}

function formatPtWhen(value: string, withTime: boolean): string {
  const date = withTime ? new Date(value) : parseGameDate(value);
  const parts = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short", day: "numeric", month: "short",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" as const } : {}),
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  const day = `${part("weekday")}, ${part("day")} ${part("month")}`;
  if (!withTime) return day;
  return `${day}, ${part("hour")}h${part("minute")}`;
}

function nextGameLine(team: Team, game: GameInfo): string {
  const place = game.isHome ? "em casa" : "fora de casa";
  const opponent = game.isHome ? game.awayTeam : game.homeTeam;
  const known = getTeamById(opponent.id);
  const opponentName = known ? teamLabel(known) : opponentLabel(opponent.abbreviation);
  const when = game.startTime ? formatPtWhen(game.startTime, true) : formatPtWhen(game.date, false);
  return `Próximo jogo do ${teamLabel(team)}: ${place}, contra o ${opponentName}, ${when}.`;
}

const DIGEST_WORDS = {
  reveal: "Revelar resultados do digest",
  hide: "Ocultar resultados do digest",
  revealed: "Resultados do digest revelados",
};

function editionLink(className = "mt-2 inline-flex min-h-11 items-center text-sm text-white/70 underline decoration-white/20 underline-offset-4 hover:text-white") {
  return <Link href="/digest" className={className}>Edição completa, em inglês</Link>;
}

function readDigest(value: unknown): { digest: DigestEntry; isToday: boolean } | "empty" | null {
  if (!value || typeof value !== "object") return null;
  const body = value as { digest?: unknown; isToday?: unknown; error?: unknown };
  if (body.error) return null;
  if (!body.digest) return "empty";
  if (typeof body.digest !== "object") return null;
  const digest = body.digest as Partial<DigestEntry>;
  if (!isDigestDate(digest.date) || typeof digest.content !== "string" || !Array.isArray(digest.games_covered)) return null;
  if (digest.games_covered.some((item) => typeof item !== "string")) return null;
  return { digest: digest as DigestEntry, isToday: body.isToday !== false };
}

export function HomeDigestCard({ favoriteTeams }: { favoriteTeams: Team[] }) {
  const { selectedTeam } = useTeam();
  const { nextGame, loading: gamesLoading, error: gamesError } = useGameData();
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [failure, setFailure] = useState<"timeout" | "failed">("failed");
  const [edition, setEdition] = useState<{ digest: DigestEntry; isToday: boolean } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 8000);
    setPhase("loading");
    fetch("/api/digest", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("unavailable");
        const parsed = readDigest(await response.json());
        if (!parsed) throw new Error("unavailable");
        if (!active) return;
        if (parsed === "empty") {
          setEdition(null);
          setPhase("empty");
          return;
        }
        setEdition(parsed);
        setPhase("ready");
      })
      .catch(() => {
        if (!active) return;
        setFailure(timedOut ? "timeout" : "failed");
        setPhase("error");
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);

  if (phase === "loading") {
    return <section aria-label="Digest" lang="pt-BR" className={styles.digest}>
      <h2 className={styles.sectionHeading}>Digest</h2>
      <div role="status" aria-label="Carregando digest" className="space-y-3 animate-pulse">
        <div className="h-4 w-40 rounded bg-white/10" />
        <div className="h-4 w-64 rounded bg-white/10" />
      </div>
    </section>;
  }

  if (phase === "error") {
    return <section aria-label="Digest" lang="pt-BR" className={styles.digest}>
      <h2 className={styles.sectionHeading}>Digest</h2>
      <p role="alert" className="text-sm text-white/80">{failure === "timeout" ? "O digest não respondeu em 8 segundos." : "Não foi possível carregar o digest."}</p>
      <div className="mt-4 flex flex-col items-start gap-4">
        <button type="button" onClick={() => setAttempt((value) => value + 1)} className="min-h-11 rounded-lg bg-white/10 px-4 text-sm font-medium hover:bg-white/20">Tentar de novo</button>
        {editionLink("inline-flex min-h-11 items-center text-sm text-white/70 underline decoration-white/20 underline-offset-4 hover:text-white")}
      </div>
    </section>;
  }

  if (!edition) {
    return <section aria-label="Digest" lang="pt-BR" className={styles.digest}>
      <h2 className={styles.sectionHeading}>Digest</h2>
      <p className="text-sm text-white/70">Nenhum digest publicado ainda.</p>
      {editionLink()}
    </section>;
  }

  const games = parseCoveredGames(edition.digest.games_covered);
  const subjects = summaryTeams(selectedTeam, favoriteTeams);
  const subjectIds = new Set(subjects.map((team) => team.id));
  const seenGames = new Set<string>();
  const openers: { text: string; spoiler: boolean }[] = [];
  for (const team of subjects) {
    const game = games.find((item) => teamSide(item, team));
    const side = game ? teamSide(game, team) : null;
    if (!game || !side) {
      openers.push({ text: `O ${teamLabel(team)} não jogou nesta rodada.`, spoiler: false });
      continue;
    }
    const key = gameKey(game);
    if (seenGames.has(key)) continue;
    seenGames.add(key);
    openers.push({ text: resultLine(team, game, side), spoiler: true });
  }
  const league = games.filter((game) => ![game.awayAbbr, game.homeAbbr].some((abbr) => {
    const team = teamByAbbreviation(abbr);
    return team ? subjectIds.has(team.id) : false;
  })).map(leagueLine);
  const coveredOn = readDigestLeagueDate(edition.digest.content);
  const results = openers.filter((line) => line.spoiler);
  const quiet = openers.filter((line) => !line.spoiler);
  const hasScores = results.length > 0 || league.length > 0;

  return <section aria-label="Digest" lang="pt-BR" className={styles.digest}>
    <h2 className={styles.sectionHeading}>Digest</h2>
    <p className="mb-3 text-sm text-white/70">{coveredOn ? `Jogos de ${coverageLabel(coveredOn)}.` : `Edição de ${coverageLabel(edition.digest.date)}.`}</p>
    {!edition.isToday && <p className="mb-3 text-sm text-white/70">Não há digest de hoje. Esta é a edição mais recente.</p>}
    {quiet.length > 0 && <ul className="space-y-1 text-sm leading-6">
      {quiet.map((line) => <li key={line.text}>{line.text}</li>)}
    </ul>}
    {hasScores && <div className="mt-3">
      <ScoreReveal scope={`digest:${edition.digest.date}:${selectedTeam.id}`} label="digest results" wording={DIGEST_WORDS}>
        {results.length > 0 && <ul className="space-y-1 text-sm leading-6">
          {results.map((line) => <li key={line.text}>{line.text}</li>)}
        </ul>}
        {league.length > 0 && <>
          <h3 className="mb-1 mt-3 text-sm font-semibold">Pelo resto da liga</h3>
          <ul className="space-y-1 text-sm leading-6">
            {league.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </>}
      </ScoreReveal>
    </div>}
    {!gamesLoading && !gamesError && nextGame && <p className="mt-3 text-sm text-white/80">{nextGameLine(selectedTeam, nextGame)}</p>}
    {editionLink()}
  </section>;
}
