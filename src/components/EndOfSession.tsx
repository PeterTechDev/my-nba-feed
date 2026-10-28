"use client";

import { useEffect, useState } from "react";
import { useFavoriteTeamObjects, useFavoriteTeams } from "@/hooks/useFavoriteTeams";
import { useRemoteData, useRemoteDataAll } from "@/hooks/useRemoteData";
import { useTeam } from "@/hooks/useTeam";
import type { GamesResponse, NewsFeeds } from "@/lib/api";
import { gameDaysAgo } from "@/lib/nbaDate";
import { selectHomepageNews } from "@/lib/news";

function usePreferencesHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const stores = [useTeam, useFavoriteTeams];
    const update = () => {
      if (stores.every((store) => store.persist.hasHydrated())) setHydrated(true);
    };
    const unsubs = stores.map((store) => store.persist.onFinishHydration(update));
    update();
    return () => { unsubs.forEach((unsub) => unsub()); };
  }, []);
  return hydrated;
}

export default function EndOfSession() {
  const hydrated = usePreferencesHydrated();
  const favoriteTeams = useFavoriteTeamObjects();
  const { selectedTeam } = useTeam();
  const coveredTeams = [...new Map([selectedTeam, ...favoriteTeams].map((team) => [team.id, team])).values()];
  const coveredGames = useRemoteDataAll<GamesResponse>(coveredTeams.map((team) => `/api/games?teamId=${team.id}`));
  const hasPersonalized = favoriteTeams.length > 0;
  const followedFocus = favoriteTeams.some((team) => team.id === selectedTeam.id);
  const order = [...new Set([...favoriteTeams.map((team) => team.name), ...(!followedFocus ? [selectedTeam.name] : []), ...(hasPersonalized ? ["NBA"] : [])])];
  const news = useRemoteData<{ feeds: NewsFeeds }>(`/api/news?teams=${encodeURIComponent(order.join(","))}`);
  const feeds = selectHomepageNews(news.data?.feeds ?? {}, order, hasPersonalized && !followedFocus ? selectedTeam.name : undefined);
  const newsFailed = news.error || order.some((name) => Boolean(feeds[name]?.error));
  const gamesLoading = coveredGames.some((game) => game.loading);
  const gamesFailed = coveredGames.some((game) => game.error);
  if (!hydrated || gamesLoading || news.loading || gamesFailed || newsFailed) return null;

  const live = coveredGames.some((game) => Boolean(game.data?.currentGame));
  const hasGames = live || coveredTeams.some((team, index) => {
    const data = coveredGames[index].data;
    if (!data) return false;
    if (team.id === selectedTeam.id) return Boolean(data.lastGame || data.nextGame);
    return Boolean(data.lastGame && gameDaysAgo(data.lastGame.date) === 1);
  });
  const hasTeamNews = coveredTeams.some((team) => (feeds[team.name]?.items.length ?? 0) > 0);
  const severalTeams = coveredTeams.length > 1;
  const teamName = coveredTeams[0].name;
  const message = !hasGames && !hasTeamNews
    ? severalTeams ? "Nothing new for your teams. You can head out." : `Nothing new for the ${teamName}. You can head out.`
    : severalTeams ? "You’re up to date with your teams." : live ? `You’re up to date with the ${teamName}.` : `You’re up to date with the ${teamName}. You can head out.`;

  return (
    <section aria-label="End of session" className="mt-2 border-t border-white/10 py-8 text-center">
      <p className="text-sm leading-6 text-white/80">{message}</p>
    </section>
  );
}
