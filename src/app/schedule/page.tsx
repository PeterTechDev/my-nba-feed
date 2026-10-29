"use client";
import { useRemoteData, useRemoteDataAll } from "@/hooks/useRemoteData";
import DataError from "@/components/DataError";
import TeamSelector from "@/components/TeamSelector";
import GoogleCalendarLink from "@/components/GoogleCalendarLink";
import GameRecapLink from "@/components/GameRecapLink";
import { useState } from "react";
import { useTeam } from "@/hooks/useTeam";
import { useSpoilerContext } from "@/components/SpoilerModeProvider";
import { formatTipoff, formatNBADate } from "@/lib/nbaDate";
import type { HighlightsResponse } from "@/lib/api";
import { isFinalStatus, isLiveStatus } from "@/lib/gameStatus";

interface ScheduleGame {
  id: number;
  date: string;
  status: string;
  startTime?: string | null;
  homeTeam: { id: number; name: string; abbreviation: string };
  awayTeam: { id: number; name: string; abbreviation: string };
  homeScore: number;
  awayScore: number;
}

function gameStatus(game: ScheduleGame): string {
  if (isFinalStatus(game.status)) return game.status;
  if (isLiveStatus(game.status)) return `Live · ${game.status}`;
  if (/^(postponed|cancell?ed)\b/i.test(game.status.trim())) return game.status;
  return formatTipoff(game.startTime, game.status);
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function SchedulePage() {
  const { selectedTeam } = useTeam();
  const { hideScores, hideHeadlines } = useSpoilerContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"calendar" | "list">("calendar");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
  const { data, loading, error, retry } = useRemoteData<{ games: ScheduleGame[] }>(
    `/api/schedule?teamId=${selectedTeam.id}&start=${start}&end=${end}`, 60000
  );
  const games = data?.games || [];
  const oldest = formatNBADate(new Date(Date.now() - 30 * 86400000));
  const leagueToday = formatNBADate();
  const dates = [...new Set(games.filter((game) => isFinalStatus(game.status)).map((game) => game.date.slice(0, 10)))]
    .filter((date) => date >= oldest && date <= leagueToday).sort();
  const highlightPages = useRemoteDataAll<HighlightsResponse>(Array.from({ length: Math.ceil(dates.length / 15) }, (_, i) =>
    `/api/highlights?teamId=${selectedTeam.id}&dates=${dates.slice(i * 15, i * 15 + 15).join(",")}`));
  const highlights = Object.assign({}, ...highlightPages.map((page) => page.data?.videos)) as HighlightsResponse["videos"];

  const getGameForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return games.find((g) => g.date.startsWith(dateStr));
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthLabel = currentDate.toLocaleString("en-US", { month: "long", year: "numeric" });
  const today = new Date();
  const currentMonth = year === today.getFullYear() && month === today.getMonth();

  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={selectedTeam.logo} alt="" className="w-10 h-10 shrink-0" />
        <div>
          <h1 className="text-2xl font-bold">{selectedTeam.name} Schedule</h1>
          <p className="text-sm text-white/70">Season games calendar</p>
        </div>
        </div>
        <TeamSelector />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 aria-live="polite" className="w-full text-lg font-bold mb-1">{monthLabel}</h2>
        <button aria-label="Previous month" onClick={prevMonth} className="min-h-11 flex-1 sm:flex-none px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition text-sm">
          Prev
        </button>
        <button type="button" disabled={currentMonth} onClick={() => setCurrentDate(new Date())} className="min-h-11 flex-1 sm:flex-none px-4 py-2 rounded-lg border border-white/15 text-sm hover:bg-white/10 disabled:opacity-50 disabled:cursor-default">Today</button>
        <button aria-label="Next month" onClick={nextMonth} className="min-h-11 flex-1 sm:flex-none px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition text-sm">
          Next
        </button>
        <div role="group" aria-label="Schedule view" className="hidden md:flex gap-1 ml-auto">
          {(["calendar", "list"] as const).map((option) => <button key={option} type="button" aria-pressed={view === option} onClick={() => setView(option)} className={`min-h-11 px-4 rounded-lg text-sm ${view === option ? "bg-white/15" : "text-white/70 hover:bg-white/10"}`}>{option === "calendar" ? "Calendar" : "Agenda"}</button>)}
        </div>
      </div>

      {error ? <DataError subject="the schedule" retry={retry} /> : <>
      {(hideScores || hideHeadlines) && games.some((game) => isFinalStatus(game.status)) && <p className="mb-4 text-xs text-white/70">YouTube recaps may contain spoilers.</p>}
      {/* Desktop: Calendar grid */}
      {!loading && games.length === 0 && view === "calendar" && <p role="status" className="hidden md:block mb-4 text-sm text-white/70">No games scheduled this month. Choose another month or focus team.</p>}
      <div className={`${view === "calendar" ? "hidden md:block" : "hidden"} rounded-xl bg-[#161616] border border-[#2a2a2a] overflow-hidden`}>
        <div className="grid grid-cols-7 text-center text-xs text-white/70 font-medium border-b border-white/5">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-2">{d}</div>
          ))}
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div role="status" className="text-white/70 animate-pulse">Loading schedule…</div>
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {[...Array(firstDay)].map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-white/5 bg-white/[0.01]" />
            ))}
            {[...Array(daysInMonth)].map((_, i) => {
              const day = i + 1;
              const game = getGameForDay(day);
              const isHome = game ? game.homeTeam.id === selectedTeam.id : false;
              const opponent = game ? (isHome ? game.awayTeam : game.homeTeam) : null;
              const isFinal = game ? isFinalStatus(game.status) : false;
              let won = false;
              if (game && isFinal) {
                const teamScore = isHome ? game.homeScore : game.awayScore;
                const oppScore = isHome ? game.awayScore : game.homeScore;
                won = teamScore > oppScore;
              }
              const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

              return (
                <div
                  key={day}
                  className={`min-h-[110px] border-b border-r border-white/5 p-2 ${isToday ? "team-surface" : ""}`}
                >
                  <span aria-current={isToday ? "date" : undefined} className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full text-xs tabular-nums ${isToday ? "team-action font-semibold" : game ? "team-text font-semibold" : "text-white/70"}`}>{day}</span>
                  {game && opponent && (
                    <div className={`mt-2 rounded p-1.5 text-xs lg:text-sm ${
                      isFinal && !hideScores
                        ? won
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-red-500/10 text-red-400"
                        : "team-surface team-text"
                    }`}>
                      <div className="font-medium">
                        {isHome ? "vs" : "@"} {opponent.abbreviation}
                      </div>
                      {isFinal && !hideScores && (
                        <div className="font-bold">
                          {won ? "W" : "L"} {isHome ? game.homeScore : game.awayScore}-{isHome ? game.awayScore : game.homeScore}
                        </div>
                      )}
                      {isFinal && hideScores && (
                        <div className="text-white/70">{game.status}</div>
                      )}
                      {!isFinal && <div className="text-white/70 break-words">{gameStatus(game)}</div>}
                      <GoogleCalendarLink game={game} compact />
                      {isFinal && <GameRecapLink video={highlights[game.date.slice(0, 10)]} date={game.date} homeTeam={game.homeTeam.name} awayTeam={game.awayTeam.name} />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile: List view */}
      <div className={`${view === "list" ? "block" : "md:hidden"} rounded-xl bg-[#161616] border border-[#2a2a2a] overflow-hidden`}>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div role="status" className="text-white/70 animate-pulse">Loading schedule…</div>
          </div>
        ) : (() => {
          const gamesThisMonth = [...Array(daysInMonth)].map((_, i) => {
            const day = i + 1;
            const game = getGameForDay(day);
            if (!game) return null;
            const isHome = game.homeTeam.id === selectedTeam.id;
            const opponent = isHome ? game.awayTeam : game.homeTeam;
            const isFinal = isFinalStatus(game.status);
            let won = false;
            if (isFinal) {
              const teamScore = isHome ? game.homeScore : game.awayScore;
              const oppScore = isHome ? game.awayScore : game.homeScore;
              won = teamScore > oppScore;
            }
            const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
            return { day, game, isHome, opponent, isFinal, won, isToday };
          }).filter(Boolean) as { day: number; game: ScheduleGame; isHome: boolean; opponent: { id: number; name: string; abbreviation: string }; isFinal: boolean; won: boolean; isToday: boolean }[];

          return gamesThisMonth.length === 0 ? (
            <p className="text-white/70 text-center py-8 px-4 text-sm">No games scheduled this month. Choose another month or focus team.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {gamesThisMonth.map(({ day, game, isHome, opponent, isFinal, won, isToday }) => (
                <div key={day} className={`flex items-center justify-between gap-3 px-4 py-4 ${isToday ? "team-surface" : ""}`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span aria-current={isToday ? "date" : undefined} className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm tabular-nums ${isToday ? "team-action font-semibold" : "text-white/70"}`}>
                      {day}
                    </span>
                    <div className="min-w-0">
                      <p className="text-base font-medium">
                        {isHome ? "vs" : "@"} {opponent.name}
                      </p>
                      <p className="text-xs text-white/70">
                        {new Date(year, month, day).toLocaleDateString("en-US", { weekday: "short" })}
                      </p>
                      <GoogleCalendarLink game={game} compact />
                      {isFinal && <GameRecapLink video={highlights[game.date.slice(0, 10)]} date={game.date} homeTeam={game.homeTeam.name} awayTeam={game.awayTeam.name} />}
                    </div>
                  </div>
                  {isFinal ? (
                    hideScores ? (
                      <span className="text-sm text-white/70 shrink-0">{game.status}</span>
                    ) : (
                      <span className={`text-sm shrink-0 font-bold ${won ? "text-emerald-300" : "text-red-300"}`}>
                        {won ? "W" : "L"} {isHome ? game.homeScore : game.awayScore}-{isHome ? game.awayScore : game.homeScore}
                      </span>
                    )
                  ) : (
                    <span className="text-sm text-white/70 text-right max-w-[45%] shrink-0">{gameStatus(game)}</span>
                  )}
                </div>
              ))}
            </div>
          );
        })()}
      </div>
      </>}
    </main>
  );
}
