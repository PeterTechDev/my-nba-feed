"use client";
import { useEffect, useState } from "react";
import { useGameData } from "@/hooks/useGameData";
import { useTeam } from "@/hooks/useTeam";
import { useSpoilerContext } from "./SpoilerModeProvider";
import { NewsItem, getNews, getOpponent, getTeamScore, getOpponentScore } from "@/lib/api";

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
  const { lastGame, currentGame, nextGame, loading } = useGameData();
  const { hideScores, hideHeadlines } = useSpoilerContext();
  const [topStory, setTopStory] = useState<NewsItem | null>(null);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    setNewsLoading(true);
    getNews(selectedTeam.name).then((news) => {
      setTopStory(news[0] || null);
      setNewsLoading(false);
    });
  }, [selectedTeam.name]);

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
  const lastNightGame =
    lastGame && isYesterday(lastGame.date) ? lastGame : null;

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
          <span className="text-xs text-white/30 ml-auto">
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
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
              Today&apos;s Game
            </p>
            {todayGame ? (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">
                    {selectedTeam.abbreviation}{" "}
                    <span className="text-white/50">
                      {todayGame.isHome ? "vs" : "@"}
                    </span>{" "}
                    {getOpponent(todayGame).abbreviation}
                  </p>
                  <p className="text-xs text-white/50 mt-0.5">
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
                      <span className="text-white/40 mx-1">–</span>
                      {getOpponentScore(currentGame)}
                    </p>
                    <p className="text-[10px] text-red-400 font-bold uppercase tracking-wide">
                      Live
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-white/35 italic">No games today</p>
            )}
          </div>

          <div className="border-t border-white/[0.06]" />

          {/* LAST NIGHT */}
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
              Last Night
            </p>
            {lastNightGame ? (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  {hideScores ? (
                    <p className="text-sm text-white/60 italic">
                      Score hidden · {formatDate(lastNightGame.date)} vs{" "}
                      {getOpponent(lastNightGame).name}
                    </p>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-white">
                        {selectedTeam.abbreviation}{" "}
                        <span className="text-lg font-extrabold tabular-nums">
                          {getTeamScore(lastNightGame)}
                        </span>
                        <span className="text-white/40 mx-1.5">–</span>
                        <span className="text-lg font-extrabold tabular-nums">
                          {getOpponentScore(lastNightGame)}
                        </span>{" "}
                        {getOpponent(lastNightGame).abbreviation}
                      </p>
                      <p className="text-xs text-white/50 mt-0.5">
                        {lastNightGame.won !== undefined && (
                          <span
                            className={
                              lastNightGame.won
                                ? "text-emerald-400 font-semibold"
                                : "text-red-400 font-semibold"
                            }
                          >
                            {lastNightGame.won ? "Win" : "Loss"}
                            {" · "}
                          </span>
                        )}
                        {formatDate(lastNightGame.date)}
                      </p>
                    </>
                  )}
                </div>
              </div>
            ) : lastGame ? (
              <p className="text-sm text-white/35 italic">
                Last game was{" "}
                {formatDate(lastGame.date)} —{" "}
                {Math.floor(
                  (Date.now() - new Date(lastGame.date).getTime()) /
                    86400000
                )}{" "}
                days ago
              </p>
            ) : (
              <p className="text-sm text-white/35 italic">No recent games</p>
            )}
          </div>

          <div className="border-t border-white/[0.06]" />

          {/* HOT TAKE */}
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
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
                <p className="text-xs text-white/35 mt-1">
                  {topStory.source && (
                    <span className="text-white/50">{topStory.source}</span>
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
              <p className="text-sm text-white/35 italic">No stories right now</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
