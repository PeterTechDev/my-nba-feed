"use client";

import { useEffect, useState } from "react";
import { useFavoriteTeamObjects, useFavoriteTeams } from "@/hooks/useFavoriteTeams";
import { useGameData } from "@/hooks/useGameData";
import { useRemoteData } from "@/hooks/useRemoteData";
import { useTeam } from "@/hooks/useTeam";
import type { NewsFeeds } from "@/lib/api";
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
  const games = useGameData();
  const hasPersonalized = favoriteTeams.length > 0;
  const followedFocus = favoriteTeams.some((team) => team.id === selectedTeam.id);
  const order = [...new Set([...favoriteTeams.map((team) => team.name), ...(!followedFocus ? [selectedTeam.name] : []), ...(hasPersonalized ? ["NBA"] : [])])];
  const news = useRemoteData<{ feeds: NewsFeeds }>(`/api/news?teams=${encodeURIComponent(order.join(","))}`);
  const feeds = selectHomepageNews(news.data?.feeds ?? {}, order, hasPersonalized && !followedFocus ? selectedTeam.name : undefined);
  const newsFailed = news.error || order.some((name) => Boolean(feeds[name]?.error));
  if (!hydrated || games.loading || news.loading || games.error || newsFailed) return null;

  const coveredTeams = [...new Map([selectedTeam, ...favoriteTeams].map((team) => [team.id, team])).values()];
  const hasGames = Boolean(games.lastGame || games.currentGame || games.nextGame);
  const hasTeamNews = coveredTeams.some((team) => (feeds[team.name]?.items.length ?? 0) > 0);
  const severalTeams = coveredTeams.length > 1;
  const teamName = coveredTeams[0].name;
  const message = !hasGames && !hasTeamNews
    ? severalTeams ? "Nothing new for your teams. You can head out." : `Nothing new for the ${teamName}. You can head out.`
    : severalTeams ? "You’re up to date with your teams." : `You’re up to date with the ${teamName}. You can head out.`;

  return (
    <section aria-label="End of session" className="mt-2 border-t border-white/10 py-8 text-center">
      <p className="text-sm leading-6 text-white/80">{message}</p>
    </section>
  );
}
