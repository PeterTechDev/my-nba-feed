"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useTeam } from "@/hooks/useTeam";

interface Standing {
  id: number;
  name: string;
  abbreviation: string;
  conference: string;
  division: string;
  wins: number;
  losses: number;
}

interface ScheduleGame {
  id: number;
  date: string;
  status: string;
  homeTeam: { id: number; name: string; abbreviation: string };
  awayTeam: { id: number; name: string; abbreviation: string };
  homeScore: number;
  awayScore: number;
}

interface ContextState {
  standings: Standing[];
  games: ScheduleGame[];
  loading: boolean;
  error: string | null;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getOutcome(game: ScheduleGame, teamId: number): "W" | "L" {
  const isHome = game.homeTeam.id === teamId;
  const teamScore = isHome ? game.homeScore : game.awayScore;
  const opponentScore = isHome ? game.awayScore : game.homeScore;
  return teamScore > opponentScore ? "W" : "L";
}

function getOpponent(game: ScheduleGame, teamId: number) {
  return game.homeTeam.id === teamId ? game.awayTeam : game.homeTeam;
}

function getConferenceRank(standings: Standing[], conference: "East" | "West", teamId: number) {
  const conferenceTeams = standings
    .filter((team) => team.conference === conference)
    .sort((a, b) => {
      const pctA = a.wins / (a.wins + a.losses || 1);
      const pctB = b.wins / (b.wins + b.losses || 1);
      return pctB - pctA;
    });

  return conferenceTeams.findIndex((team) => team.id === teamId) + 1;
}

function getStreak(games: ScheduleGame[], teamId: number): string {
  if (games.length === 0) return "No trend";

  const recent = [...games]
    .filter((game) => game.status === "Final")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (recent.length === 0) return "No trend";

  const firstOutcome = getOutcome(recent[0], teamId);
  let count = 0;
  for (const game of recent) {
    if (getOutcome(game, teamId) !== firstOutcome) break;
    count++;
  }

  return `${firstOutcome}${count}`;
}

function getLastTen(games: ScheduleGame[], teamId: number): string {
  const recent = [...games]
    .filter((game) => game.status === "Final")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  const wins = recent.filter((game) => getOutcome(game, teamId) === "W").length;
  return `${wins}-${recent.length - wins}`;
}

function hasBackToBack(upcoming: ScheduleGame[]): boolean {
  if (upcoming.length < 2) return false;

  const first = new Date(upcoming[0].date);
  const second = new Date(upcoming[1].date);
  const dayMs = 86400000;
  const firstDay = new Date(first.getFullYear(), first.getMonth(), first.getDate()).getTime();
  const secondDay = new Date(second.getFullYear(), second.getMonth(), second.getDate()).getTime();

  return secondDay - firstDay === dayMs;
}

function StatTile({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "accent" }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${tone === "accent" ? "text-emerald-400" : "text-white"}`}>{value}</p>
    </div>
  );
}

export default function TeamContextPanel() {
  const { selectedTeam } = useTeam();
  const [state, setState] = useState<ContextState>({
    standings: [],
    games: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    const today = new Date();
    const seasonStart = new Date(today.getFullYear() - (today.getMonth() < 9 ? 1 : 0), 9, 1);
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + 21);

    setState((current) => ({ ...current, loading: true, error: null }));

    Promise.all([
      fetch("/api/standings").then((response) => response.json()),
      fetch(
        `/api/schedule?teamId=${selectedTeam.id}&start=${formatDate(seasonStart)}&end=${formatDate(horizon)}`
      ).then((response) => response.json()),
    ])
      .then(([standingsData, scheduleData]) => {
        if (cancelled) return;
        setState({
          standings: standingsData.standings || [],
          games: scheduleData.games || [],
          loading: false,
          error: standingsData.error || scheduleData.error || null,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState({
          standings: [],
          games: [],
          loading: false,
          error: "Unable to load team context",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTeam.id]);

  if (state.loading) {
    return (
      <section className="rounded-2xl border border-[#2a2a2a] bg-[#161616] p-5 sm:p-6">
        <div className="mb-5 space-y-2 animate-pulse">
          <div className="h-3 w-28 rounded bg-white/10" />
          <div className="h-8 w-56 rounded bg-white/10" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="h-24 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (state.error) {
    return (
      <section className="rounded-2xl border border-[#2a2a2a] bg-[#161616] p-5 sm:p-6">
        <p className="text-sm text-red-400">{state.error}</p>
      </section>
    );
  }

  const rank = getConferenceRank(state.standings, selectedTeam.conference, selectedTeam.id);
  const completedGames = state.games.filter((game) => game.status === "Final");
  const upcomingGames = [...state.games]
    .filter((game) => game.status !== "Final" && new Date(game.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const nextFive = upcomingGames.slice(0, 5);

  return (
    <section className="rounded-2xl border border-[#2a2a2a] bg-[#161616] p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">Team Context</p>
          <h2 className="mt-2 text-2xl font-bold">Where {selectedTeam.name} stand right now</h2>
        </div>
        <Link href="/standings" className="text-sm text-white/50 transition hover:text-white/80">
          Full standings →
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Conference rank" value={rank > 0 ? `#${rank}` : "—"} />
        <StatTile label="Streak" value={getStreak(completedGames, selectedTeam.id)} tone="accent" />
        <StatTile label="Last 10" value={getLastTen(completedGames, selectedTeam.id)} />
        <StatTile label="Back-to-back" value={hasBackToBack(nextFive) ? "Yes" : "No"} />
      </div>

      <div className="mt-6 rounded-xl border border-white/8 bg-black/20 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">Next five</p>
          <Link href="/schedule" className="text-sm text-white/45 transition hover:text-white/75">
            Open schedule →
          </Link>
        </div>
        {nextFive.length === 0 ? (
          <p className="mt-4 text-sm text-white/35">No upcoming games in the current window.</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            {nextFive.map((game) => {
              const opponent = getOpponent(game, selectedTeam.id);
              const isHome = game.homeTeam.id === selectedTeam.id;
              const date = new Date(game.date);

              return (
                <div key={game.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/30">
                    {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                  <p className="mt-2 text-lg font-bold">{isHome ? "vs" : "at"} {opponent.abbreviation}</p>
                  <p className="mt-1 text-xs text-white/45">
                    {date.toLocaleDateString("en-US", { weekday: "short" })} ·{" "}
                    {date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
