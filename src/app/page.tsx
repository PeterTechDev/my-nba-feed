"use client";
import TeamHeader from "@/components/TeamHeader";
import GameDayHero from "@/components/GameDayHero";
import { LastGameCard, NextGameCard } from "@/components/GameSection";
import NewsFeed from "@/components/NewsFeed";
import GameDataProvider from "@/components/GameDataProvider";
import TopPlaysCard from "@/components/TopPlaysCard";
import MorningBriefingCard from "@/components/MorningBriefingCard";
import PersonalizedFeed, { LeagueNewsSection } from "@/components/PersonalizedFeed";
import { useFavoriteTeamObjects } from "@/hooks/useFavoriteTeams";
import { useTeam } from "@/hooks/useTeam";
import { useRemoteData } from "@/hooks/useRemoteData";
import { selectHomepageNews } from "@/lib/news";
import type { NewsFeeds } from "@/lib/api";

function FeedContent() {
  const favoriteTeams = useFavoriteTeamObjects();
  const { selectedTeam } = useTeam();
  const hasPersonalized = favoriteTeams.length > 0;
  const followedFocus = favoriteTeams.some((team) => team.id === selectedTeam.id);
  const order = [...new Set([...favoriteTeams.map((team) => team.name), ...(!followedFocus ? [selectedTeam.name] : []), ...(hasPersonalized ? ["NBA"] : [])])];
  const { data, loading, error, retry } = useRemoteData<{ feeds: NewsFeeds }>(`/api/news?teams=${encodeURIComponent(order.join(","))}`);
  const feeds = selectHomepageNews(data?.feeds ?? {}, order, hasPersonalized && !followedFocus ? selectedTeam.name : undefined);
  const newsState = (name: string) => ({ news: feeds[name]?.items ?? [], loading, error: error || Boolean(feeds[name]?.error), retry });
  const focus = newsState(selectedTeam.name);

  return (
    <>
      <TeamHeader />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-[1.1fr_1.1fr_0.9fr]">
        <LastGameCard />
        <GameDayHero />
        <NextGameCard />
        <TopPlaysCard />
      </div>
      {hasPersonalized && <PersonalizedFeed feeds={feeds} loading={loading} error={error} retry={retry} />}
      {!followedFocus && <MorningBriefingCard {...focus} news={focus.news.slice(0, 1)} />}
      {!hasPersonalized && <NewsFeed {...focus} news={focus.news.slice(1)} />}
      {hasPersonalized && <details className="border-t border-white/10 pt-2">
        <summary className="min-h-11 cursor-pointer py-3 font-medium text-white/70 hover:text-white">Around the League</summary>
        <LeagueNewsSection {...newsState("NBA")} />
      </details>}
    </>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-6xl mx-auto space-y-6 sm:space-y-8">
      <GameDataProvider>
        <FeedContent />
      </GameDataProvider>
    </main>
  );
}
