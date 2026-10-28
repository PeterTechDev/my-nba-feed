"use client";

import { useFavoriteTeamObjects } from "@/hooks/useFavoriteTeams";
import { useGameData } from "@/hooks/useGameData";
import { useRemoteData } from "@/hooks/useRemoteData";
import { useTeam } from "@/hooks/useTeam";
import type { NewsFeeds } from "@/lib/api";
import { selectHomepageNews } from "@/lib/news";

export default function EndOfSession() {
  const favoriteTeams = useFavoriteTeamObjects();
  const { selectedTeam } = useTeam();
  const games = useGameData();
  const hasPersonalized = favoriteTeams.length > 0;
  const followedFocus = favoriteTeams.some((team) => team.id === selectedTeam.id);
  const order = [...new Set([...favoriteTeams.map((team) => team.name), ...(!followedFocus ? [selectedTeam.name] : []), ...(hasPersonalized ? ["NBA"] : [])])];
  const news = useRemoteData<{ feeds: NewsFeeds }>(`/api/news?teams=${encodeURIComponent(order.join(","))}`);
  const feeds = selectHomepageNews(news.data?.feeds ?? {}, order, hasPersonalized && !followedFocus ? selectedTeam.name : undefined);
  const newsFailed = news.error || order.some((name) => Boolean(feeds[name]?.error));
  if (games.loading || news.loading || games.error || newsFailed) return null;

  const hasGames = Boolean(games.lastGame || games.currentGame || games.nextGame);
  const hasNews = order.some((name) => (feeds[name]?.items.length ?? 0) > 0);
  const severalTeams = favoriteTeams.length > 1;
  const teamName = (favoriteTeams.length === 1 ? favoriteTeams[0] : selectedTeam).name;
  const message = !hasGames && !hasNews
    ? severalTeams ? "Nothing new for your teams. You can head out." : `Nothing new for the ${teamName}. You can head out.`
    : severalTeams ? "You’re up to date with your teams." : `You’re up to date with the ${teamName}. You can head out.`;

  return (
    <section aria-label="End of session" className="mt-2 border-t border-white/10 py-8 text-center">
      <p className="text-sm leading-6 text-white/80">{message}</p>
    </section>
  );
}
