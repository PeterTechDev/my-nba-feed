"use client";
import { useEffect, useState } from "react";
import { useTeam } from "@/hooks/useTeam";

interface ScheduleGame {
  id: number;
  date: string;
  status: string;
  homeTeam: { id: number; name: string; abbreviation: string };
  awayTeam: { id: number; name: string; abbreviation: string };
  homeScore: number;
  awayScore: number;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function SchedulePage() {
  const { selectedTeam } = useTeam();
  const [games, setGames] = useState<ScheduleGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  useEffect(() => {
    setLoading(true);
    const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

    fetch(`/api/schedule?teamId=${selectedTeam.id}&start=${start}&end=${end}`)
      .then((r) => r.json())
      .then((d) => { setGames(d.games || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedTeam.id, year, month, daysInMonth]);

  const getGameForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return games.find((g) => g.date.startsWith(dateStr));
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthLabel = currentDate.toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={selectedTeam.logo} alt="" className="w-10 h-10" />
        <div>
          <h1 className="text-2xl font-bold">{selectedTeam.name} Schedule</h1>
          <p className="text-sm text-white/40">Season games calendar</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition text-sm">
          ← Prev
        </button>
        <h2 className="text-lg font-bold">{monthLabel}</h2>
        <button onClick={nextMonth} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition text-sm">
          Next →
        </button>
      </div>

      {/* Desktop: Calendar grid */}
      <div className="hidden sm:block rounded-xl bg-[#161616] border border-[#2a2a2a] overflow-hidden">
        <div className="h-0.5" style={{ background: `linear-gradient(90deg, var(--team-primary), transparent)` }} />
        <div className="grid grid-cols-7 text-center text-xs text-white/40 font-medium border-b border-white/5">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-2">{d}</div>
          ))}
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-white/20 animate-pulse">Loading...</div>
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
              const isFinal = game?.status === "Final";
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
                  className={`min-h-[80px] border-b border-r border-white/5 p-1.5 ${isToday ? "bg-white/5" : ""}`}
                >
                  <span className={`text-xs ${isToday ? "text-white font-bold" : "text-white/30"}`}>{day}</span>
                  {game && opponent && (
                    <div className={`mt-1 rounded p-1 text-[10px] ${
                      isFinal
                        ? won
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-red-500/10 text-red-400"
                        : "bg-white/5 text-white/60"
                    }`}>
                      <div className="font-medium">
                        {isHome ? "vs" : "@"} {opponent.abbreviation}
                      </div>
                      {isFinal && (
                        <div className="font-bold">
                          {won ? "W" : "L"} {isHome ? game.homeScore : game.awayScore}-{isHome ? game.awayScore : game.homeScore}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile: List view */}
      <div className="sm:hidden rounded-xl bg-[#161616] border border-[#2a2a2a] overflow-hidden">
        <div className="h-0.5" style={{ background: `linear-gradient(90deg, var(--team-primary), transparent)` }} />
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-white/20 animate-pulse">Loading...</div>
          </div>
        ) : (() => {
          const gamesThisMonth = [...Array(daysInMonth)].map((_, i) => {
            const day = i + 1;
            const game = getGameForDay(day);
            if (!game) return null;
            const isHome = game.homeTeam.id === selectedTeam.id;
            const opponent = isHome ? game.awayTeam : game.homeTeam;
            const isFinal = game.status === "Final";
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
            <p className="text-white/40 text-center py-8 text-sm">No games this month</p>
          ) : (
            <div className="divide-y divide-white/5">
              {gamesThisMonth.map(({ day, game, isHome, opponent, isFinal, won, isToday }) => (
                <div key={day} className={`flex items-center justify-between px-4 py-3 ${isToday ? "bg-white/5" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-mono w-6 text-center ${isToday ? "text-white font-bold" : "text-white/40"}`}>
                      {day}
                    </span>
                    <div>
                      <p className="text-sm font-medium">
                        {isHome ? "vs" : "@"} {opponent.name}
                      </p>
                      <p className="text-xs text-white/40">
                        {new Date(year, month, day).toLocaleDateString("en-US", { weekday: "short" })}
                      </p>
                    </div>
                  </div>
                  {isFinal ? (
                    <span className={`text-sm font-bold ${won ? "text-emerald-400" : "text-red-400"}`}>
                      {won ? "W" : "L"} {isHome ? game.homeScore : game.awayScore}-{isHome ? game.awayScore : game.homeScore}
                    </span>
                  ) : (
                    <span className="text-xs text-white/30">Scheduled</span>
                  )}
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </main>
  );
}
