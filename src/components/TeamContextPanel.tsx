"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useTeam } from "@/hooks/useTeam";
import { useGameData } from "@/hooks/useGameData";

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
  standingsLoading: boolean;
  gamesLoading: boolean;
  gamesError: string | null;
}

async function fetchJsonWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response.json();
  } finally {
    clearTimeout(timer);
  }
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
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">{label}</p>
      <p className={`mt-1.5 text-xl font-bold ${tone === "accent" ? "text-emerald-400" : "text-white"}`}>{value}</p>
    </div>
  );
}

export default function TeamContextPanel() {
  const { selectedTeam } = useTeam();
  const { record } = useGameData();
  const [state, setState] = useState<ContextState>({
    standings: [],
    games: [],
    standingsLoading: true,
    gamesLoading: true,
    gamesError: null,
  });

  useEffect(() => {
    let cancelled = false;
    const today = new Date();
    const seasonStart = new Date(today.getFullYear() - (today.getMonth() < 9 ? 1 : 0), 9, 1);
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + 21);

    setState({
      standings: [],
      games: [],
      standingsLoading: true,
      gamesLoading: true,
      gamesError: null,
    });

    fetch(
      `/api/schedule?teamId=${selectedTeam.id}&start=${formatDate(seasonStart)}&end=${formatDate(horizon)}`
    )
      .then((response) => response.json())
      .then((scheduleData) => {
        if (cancelled) return;
        setState({
          standings: [],
          games: scheduleData.games || [],
          standingsLoading: true,
          gamesLoading: false,
          gamesError: scheduleData.error || null,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState((current) => ({
          ...current,
          gamesLoading: false,
          gamesError: "Unable to load team context",
        }));
      });

    fetchJsonWithTimeout("/api/standings", 8000)
      .then((standingsData) => {
        if (cancelled) return;
        setState((current) => ({
          ...current,
          standings: standingsData.standings || [],
          standingsLoading: false,
        }));
      })
      .catch(() => {
        if (cancelled) return;
        setState((current) => ({
          ...current,
          standingsLoading: false,
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTeam.id]);

  if (state.gamesLoading) {
    return (
      <section className="rounded-2xl border border-[#2a2a2a] bg-[#161616] p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="h-20 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (state.gamesError) {
    return (
      <section className="rounded-2xl border border-[#2a2a2a] bg-[#161616] p-4 sm:p-5">
        <p className="text-sm text-red-400">{state.gamesError}</p>
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
    <section className="rounded-2xl border border-[#2a2a2a] bg-[#161616] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">Quick context</p>
        <Link href="/standings" className="text-sm text-white/45 transition hover:text-white/75">
          Standings →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Rank"
          value={state.standingsLoading ? "..." : rank > 0 ? `#${rank}` : "—"}
        />
        <StatTile label="Streak" value={getStreak(completedGames, selectedTeam.id)} tone="accent" />
        <StatTile label="Last 10" value={getLastTen(completedGames, selectedTeam.id)} />
        <StatTile label="Record" value={record.wins + record.losses > 0 ? `${record.wins}-${record.losses}` : "—"} />
      </div>
      {hasBackToBack(nextFive) && (
        <p className="mt-3 text-xs text-white/35">Back-to-back coming up in the next two games.</p>
      )}
    </section>
  );
}
