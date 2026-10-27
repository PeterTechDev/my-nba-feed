"use client";
import { fetchRemoteData, useRemoteData } from "@/hooks/useRemoteData";
import { useEffect, useState } from "react";
import { useGameData } from "@/hooks/useGameData";
import { useTeam } from "@/hooks/useTeam";
import { useSpoilerContext } from "./SpoilerModeProvider";
import { NewsItem, getOpponent, getTeamScore, getOpponentScore, GamesResponse, GameInfo } from "@/lib/api";
import { useFavoriteTeams } from "@/hooks/useFavoriteTeams";
import { teams } from "@/lib/teams";

function isSameLocalDay(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function isYesterday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  );
}

function formatTipoff(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function MorningBriefingCard() {
  const { selectedTeam } = useTeam();
  const { lastGame, currentGame, nextGame, loading, error } = useGameData();
  const { hideScores, hideHeadlines } = useSpoilerContext();
  const { favoriteTeamIds } = useFavoriteTeams();
  const { data: news, loading: newsLoading, error: newsError } = useRemoteData<NewsItem[]>(`/api/news?team=${encodeURIComponent(selectedTeam.name)}`);
  const topStory = news?.[0] || null;
  const favoriteKey = favoriteTeamIds.join(",");
  const [favoriteGames, setFavoriteGames] = useState<{
    key: string; game: GameInfo | null; teamId: number | null; loading: boolean; error: boolean;
  }>({ key: "", game: null, teamId: null, loading: false, error: false });
  const currentFavorites = favoriteGames.key === favoriteKey;
  const favGamesLoading = favoriteTeamIds.length > 0 && (!currentFavorites || favoriteGames.loading);
  const favLastNightGame = currentFavorites && favoriteGames.game && favoriteGames.teamId
    ? { game: favoriteGames.game, teamId: favoriteGames.teamId } : null;

  useEffect(() => {
    if (favoriteTeamIds.length === 0) return;
    const key = favoriteTeamIds.join(",");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    let cancelled = false;
    setFavoriteGames({ key, game: null, teamId: null, loading: true, error: false });
    Promise.allSettled(favoriteTeamIds.map(async (teamId) => ({
      teamId, data: await fetchRemoteData<GamesResponse>(`/api/games?teamId=${teamId}`, controller.signal),
    }))).then((results) => {
      if (cancelled) return;
      const hit = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : [])
        .find((result) => result.data.lastGame && isYesterday(result.data.lastGame.date));
      setFavoriteGames({ key, game: hit?.data.lastGame || null, teamId: hit?.teamId || null,
        loading: false, error: results.some((result) => result.status === "rejected") });
    }).finally(() => clearTimeout(timer));
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, [favoriteTeamIds]);

  if (error) return null;

  if (loading) {
    return (
      <div className="rounded-xl overflow-hidden bg-[#161616] border border-[#2a2a2a] animate-pulse">
        <div className="p-5 space-y-4">
          <div className="h-3 w-32 bg-white/10 rounded" />
          <div className="h-5 w-48 bg-white/10 rounded" />
          <div className="h-4 w-full bg-white/10 rounded" />
          <div className="h-4 w-3/4 bg-white/10 rounded" />
        </div>
      </div>
    );
  }

  const todayGame =
    currentGame ??
    (nextGame && isSameLocalDay(nextGame.date) ? nextGame : null);

  // If a favorite team played last night, prioritize that over the default selectedTeam game
  const lastNightGame: GameInfo | null = (() => {
    if (favoriteTeamIds.length > 0) {
      if (favLastNightGame) return favLastNightGame.game;
      return null; // favorites selected but none played last night
    }
    return lastGame && isYesterday(lastGame.date) ? lastGame : null;
  })();

  // Which team do we treat as "ours" for the last-night display?
  const lastNightTeamId: number = (() => {
    if (favLastNightGame) return favLastNightGame.teamId;
    return selectedTeam.id;
  })();
  const lastNightTeam = teams.find((t) => t.id === lastNightTeamId) ?? selectedTeam;

  const hasContent = todayGame || lastNightGame || topStory;
  if (!hasContent && !newsLoading) return null;

  return (
    <section className="rounded-xl overflow-hidden bg-[#161616] border border-[#2a2a2a]">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-5">
          <span className="text-base">☀️</span>
          <h2 className="text-xs font-bold text-white/60 uppercase tracking-widest">
            Morning Briefing
          </h2>
          <span className="text-xs text-white/70 ml-auto">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>

        <div className="space-y-5">
          {/* TODAY'S GAME */}
          <div>
            <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1.5">
              Today&apos;s Game
            </p>
            {todayGame ? (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">
                    {selectedTeam.abbreviation}{" "}
                    <span className="text-white/70">
                      {todayGame.isHome ? "vs" : "@"}
                    </span>{" "}
                    {getOpponent(todayGame).abbreviation}
                  </p>
                  <p className="text-xs text-white/70 mt-0.5">
                    {currentGame
                      ? currentGame.status || "In progress"
                      : formatTipoff(todayGame.date)}
                    {" · "}
                    {todayGame.isHome ? "Home" : "Away"}
                  </p>
                </div>
                {currentGame && !hideScores && (
                  <div className="text-right">
                    <p className="text-lg font-extrabold tabular-nums tracking-tight text-white">
                      {getTeamScore(currentGame)}
                      <span className="text-white/70 mx-1">–</span>
                      {getOpponentScore(currentGame)}
                    </p>
                    <p className="text-[10px] text-red-400 font-bold uppercase tracking-wide">
                      Live
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-white/70 italic">No games today</p>
            )}
          </div>

          <div className="border-t border-white/[0.06]" />

          {/* LAST NIGHT */}
          <div>
            <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1.5">
              Last Night
            </p>
            {lastNightGame ? (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  {/* Show which favorite team if different from selectedTeam */}
                  {favLastNightGame && lastNightTeam.id !== selectedTeam.id && (
                    <div className="flex items-center gap-1.5 mb-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={lastNightTeam.logo} alt={lastNightTeam.name} className="w-4 h-4 object-contain" />
                      <span className="text-[10px] text-white/70 uppercase tracking-widest">
                        {lastNightTeam.city} {lastNightTeam.name}
                      </span>
                    </div>
                  )}
                  {hideScores ? (
                    <p className="text-sm text-white/60 italic">
                      Score hidden · {formatDate(lastNightGame.date)} vs{" "}
                      {(() => {
                        const isHome = lastNightGame.homeTeam.id === lastNightTeam.id;
                        return isHome ? lastNightGame.awayTeam.name : lastNightGame.homeTeam.name;
                      })()}
                    </p>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-white">
                        {lastNightTeam.abbreviation}{" "}
                        <span className="text-lg font-extrabold tabular-nums">
                          {lastNightGame.homeTeam.id === lastNightTeam.id
                            ? lastNightGame.homeScore
                            : lastNightGame.awayScore}
                        </span>
                        <span className="text-white/70 mx-1.5">–</span>
                        <span className="text-lg font-extrabold tabular-nums">
                          {lastNightGame.homeTeam.id === lastNightTeam.id
                            ? lastNightGame.awayScore
                            : lastNightGame.homeScore}
                        </span>{" "}
                        {lastNightGame.homeTeam.id === lastNightTeam.id
                          ? lastNightGame.awayTeam.abbreviation
                          : lastNightGame.homeTeam.abbreviation}
                      </p>
                      <p className="text-xs text-white/70 mt-0.5">
                        {lastNightGame.won !== undefined && (
                          <span
                            className={
                              (lastNightGame.homeTeam.id === lastNightTeam.id
                                ? lastNightGame.homeScore > lastNightGame.awayScore
                                : lastNightGame.awayScore > lastNightGame.homeScore)
                                ? "text-emerald-400 font-semibold"
                                : "text-red-400 font-semibold"
                            }
                          >
                            {(lastNightGame.homeTeam.id === lastNightTeam.id
                              ? lastNightGame.homeScore > lastNightGame.awayScore
                              : lastNightGame.awayScore > lastNightGame.homeScore)
                              ? "Win"
                              : "Loss"}
                            {" · "}
                          </span>
                        )}
                        {formatDate(lastNightGame.date)}
                      </p>
                    </>
                  )}
                </div>
              </div>
            ) : favGamesLoading ? (
              <p className="text-sm text-white/70">Loading favorite games…</p>
            ) : favoriteTeamIds.length > 0 && favoriteGames.error ? (
              <p className="text-sm text-white/70">Favorite game data is unavailable.</p>
            ) : lastGame ? (
              <p className="text-sm text-white/70 italic">
                Last game was{" "}
                {formatDate(lastGame.date)} —{" "}
                {Math.floor(
                  (Date.now() - new Date(lastGame.date).getTime()) /
                    86400000
                )}{" "}
                days ago
              </p>
            ) : (
              <p className="text-sm text-white/70 italic">No recent games</p>
            )}
          </div>

          <div className="border-t border-white/[0.06]" />

          {/* HOT TAKE */}
          <div>
            <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1.5">
              🔥 Hot Take
            </p>
            {newsLoading ? (
              <div className="h-4 w-3/4 bg-white/10 rounded animate-pulse" />
            ) : topStory ? (
              <a
                href={topStory.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group block"
              >
                <p className="text-sm font-medium text-white/85 group-hover:text-white transition-colors line-clamp-2">
                  {hideHeadlines && topStory.isSpoiler
                    ? topStory.safeTitle
                    : topStory.title}
                </p>
                <p className="text-xs text-white/70 mt-1">
                  {topStory.source && (
                    <span className="text-white/70">{topStory.source}</span>
                  )}
                  {topStory.source && topStory.pubDate && (
                    <span> · </span>
                  )}
                  {topStory.pubDate && (
                    <span>
                      {(() => {
                        const diff =
                          Date.now() -
                          new Date(topStory.pubDate).getTime();
                        const mins = Math.floor(diff / 60000);
                        if (mins < 60) return `${mins}m ago`;
                        const hrs = Math.floor(mins / 60);
                        if (hrs < 24) return `${hrs}h ago`;
                        return `${Math.floor(hrs / 24)}d ago`;
                      })()}
                    </span>
                  )}
                </p>
              </a>
            ) : (
              <p className="text-sm text-white/70 italic">{newsError ? "Top story unavailable" : "No stories right now"}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
