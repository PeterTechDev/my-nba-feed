"use client";
import { Fragment } from "react";
import { useRemoteData } from "@/hooks/useRemoteData";
import DataError from "./DataError";
import { useFavoriteTeams, useFavoriteTeamObjects } from "@/hooks/useFavoriteTeams";
import { teams, Team } from "@/lib/teams";
import { NewsItem, GamesResponse } from "@/lib/api";
import { useSpoilerContext } from "./SpoilerModeProvider";
import { useLastVisit } from "@/hooks/useLastVisit";

// ---- Helpers ----

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
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

// ---- Per-team news section ----

interface TeamNewsSectionProps {
  team: Team;
}

function TeamNewsSection({ team }: TeamNewsSectionProps) {
  const { hideHeadlines, hideScores } = useSpoilerContext();
  const { lastVisitAt, ready: visitReady } = useLastVisit();
  const { data, loading, error, retry } = useRemoteData<NewsItem[]>(`/api/news?team=${encodeURIComponent(team.name)}`);
  const { data: gameData, error: gameError, retry: retryGame } = useRemoteData<GamesResponse>(`/api/games?teamId=${team.id}`);
  const news = (data || []).slice(0, 3);
  const lastGame = gameData?.lastGame;

  const lastNightGame = lastGame && isYesterday(lastGame.date) ? lastGame : null;

  // Determine new-since-last-visit separator
  const separatorIndex: number | null = (() => {
    if (!visitReady || !lastVisitAt || loading) return null;
    const lastVisitTime = new Date(lastVisitAt).getTime();
    const idx = news.findIndex(
      (item) => item.pubDate && new Date(item.pubDate).getTime() < lastVisitTime
    );
    return idx > 0 ? idx : null;
  })();

  return (
    <div
      className="rounded-xl overflow-hidden border"
      style={{ borderColor: `${team.primaryColor}30`, backgroundColor: `${team.primaryColor}08` }}
    >
      {/* Team header */}
      <div
        className="px-4 py-3 flex items-center gap-3 border-b"
        style={{ borderColor: `${team.primaryColor}20` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={team.logo} alt={team.name} className="w-8 h-8 object-contain" />
        <div>
          <p className="text-sm font-bold text-white">{team.city} {team.name}</p>
          {lastNightGame && (
            <p className="text-xs text-white/70">
              Played last night
            </p>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {gameError && <DataError subject={`${team.name} games`} retry={retryGame} />}
        {/* Last night result */}
        {lastNightGame && hideScores && <p className="text-sm text-white/70">Last night: score hidden · {formatDate(lastNightGame.date)}</p>}
        {lastNightGame && !hideScores && (
          <div
            className="rounded-lg px-3 py-2.5 border"
            style={{ backgroundColor: `${team.primaryColor}12`, borderColor: `${team.primaryColor}25` }}
          >
            <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1">Last Night</p>
            {(() => {
              const isHome = lastNightGame.homeTeam.id === team.id;
              const opponentTeam = isHome
                ? teams.find((t) => t.id === lastNightGame.awayTeam.id)
                : teams.find((t) => t.id === lastNightGame.homeTeam.id);
              const teamScore = isHome ? lastNightGame.homeScore : lastNightGame.awayScore;
              const oppScore = isHome ? lastNightGame.awayScore : lastNightGame.homeScore;
              const won = teamScore > oppScore;

              if (!opponentTeam) return null;

              return (
                <>
                  <p className="text-sm font-semibold text-white">
                    {team.abbreviation}{" "}
                    <span className="text-lg font-extrabold tabular-nums">{teamScore}</span>
                    <span className="text-white/70 mx-1.5">–</span>
                    <span className="text-lg font-extrabold tabular-nums">{oppScore}</span>{" "}
                    {opponentTeam.abbreviation}
                  </p>
                  <p className="text-xs mt-0.5">
                    <span className={won ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
                      {won ? "Win" : "Loss"}
                    </span>
                    <span className="text-white/70"> · {formatDate(lastNightGame.date)}</span>
                  </p>
                </>
              );
            })()}
          </div>
        )}

        {/* News */}
        {error ? (
          <DataError subject={`${team.name} news`} retry={retry} />
        ) : loading ? (
          <div className="space-y-3 animate-pulse">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3.5 w-full bg-white/10 rounded" />
                <div className="h-3 w-24 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        ) : news.length === 0 ? (
          <p className="text-sm text-white/70 italic">No recent news</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {news.map((item, i) => (
              <Fragment key={item.link}>
                {separatorIndex !== null && i === separatorIndex && (
                  <li key={`sep-${i}`} className="py-2 flex items-center gap-2">
                    <div className="flex-1 border-t border-dashed border-white/15" />
                    <span className="text-[10px] text-white/70 whitespace-nowrap shrink-0">Older</span>
                    <div className="flex-1 border-t border-dashed border-white/15" />
                  </li>
                )}
                <li key={i} className="py-2.5 first:pt-0">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-white/80 hover:text-white transition-colors line-clamp-2 font-medium"
                  >
                    {hideHeadlines && item.isSpoiler ? item.safeTitle : item.title}
                  </a>
                  <p className="text-xs text-white/70 mt-0.5">
                    {item.source && <span>{item.source} · </span>}
                    {item.pubDate && relativeTime(item.pubDate)}
                  </p>
                </li>
              </Fragment>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---- League-wide news (Around the League) ----

function LeagueNewsSection() {
  const { hideHeadlines } = useSpoilerContext();
  const { data, loading, error, retry } = useRemoteData<NewsItem[]>("/api/news?team=NBA");
  const news = (data || []).slice(0, 6);

  return (
    <div className="rounded-xl overflow-hidden bg-[#161616] border border-[#2a2a2a]">
      <div className="p-5">
        <h2 className="text-xs font-bold text-white/60 uppercase tracking-widest mb-4">
          🌐 Around the League
        </h2>
        {error ? (
          <DataError subject="league news" retry={retry} />
        ) : loading ? (
          <div className="space-y-4 animate-pulse">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-4 w-full bg-white/10 rounded" />
                <div className="h-3 w-24 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        ) : news.length === 0 ? (
          <p className="text-sm text-white/70 italic">No league news right now</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {news.map((item, i) => (
              <li key={i} className="py-3 first:pt-0">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-white/80 hover:text-white transition-colors line-clamp-2 font-medium"
                >
                  {hideHeadlines && item.isSpoiler ? item.safeTitle : item.title}
                </a>
                <p className="text-xs text-white/70 mt-0.5">
                  {item.source && <span>{item.source} · </span>}
                  {item.pubDate && relativeTime(item.pubDate)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---- Main component ----

export default function PersonalizedFeed() {
  const { favoriteTeamIds } = useFavoriteTeams();
  const favoriteTeams = useFavoriteTeamObjects();

  // No favorites → render nothing (caller renders the default feed)
  if (favoriteTeamIds.length === 0) return null;

  return (
    <div className="space-y-8">
      {/* MY TEAMS section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded-full bg-emerald-500" />
          <h2 className="text-sm font-bold text-white/70 uppercase tracking-widest">My Teams</h2>
          <span className="text-xs text-white/70">({favoriteTeamIds.length})</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {favoriteTeams.map((team) => (
            <TeamNewsSection key={team.id} team={team} />
          ))}
        </div>
      </section>

      {/* AROUND THE LEAGUE section */}
      <LeagueNewsSection />
    </div>
  );
}
