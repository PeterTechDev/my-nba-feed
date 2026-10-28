"use client";
import { ChevronDown } from "lucide-react";
import TeamHeader from "@/components/TeamHeader";
import GameDayHero from "@/components/GameDayHero";
import { HomeDigestCard, LastGameCard, NextGameCard } from "@/components/GameSection";
import NewsFeed from "@/components/NewsFeed";
import GameDataProvider from "@/components/GameDataProvider";
import TopPlaysCard from "@/components/TopPlaysCard";
import MorningBriefingCard from "@/components/MorningBriefingCard";
import PersonalizedFeed, { LeagueNewsSection } from "@/components/PersonalizedFeed";
import EndOfSession from "@/components/EndOfSession";
import { useFavoriteTeamObjects } from "@/hooks/useFavoriteTeams";
import { useTeam } from "@/hooks/useTeam";
import { useRemoteData } from "@/hooks/useRemoteData";
import { selectHomepageNews } from "@/lib/news";
import { headlineIsAboutTeam } from "@/lib/teams";
import type { NewsFeeds } from "@/lib/api";
import styles from "@/components/Home.module.css";

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
      <div className={styles.content}>
      <HomeDigestCard favoriteTeams={favoriteTeams} />
      <section aria-label={`${selectedTeam.name} games`} className={styles.games}>
        <h2 className={styles.sectionHeading}>Games</h2>
        <div className={styles.gameGrid}>
          <LastGameCard />
          <GameDayHero />
          <NextGameCard />
        </div>
      </section>
      <section aria-label="Highlights and news" className={styles.catchUp}>
      <TopPlaysCard />
      <details className={`group ${styles.newsDetails}`}>
        <summary className={styles.newsSummary}>
          <span><span className="block text-base font-semibold">{hasPersonalized ? "Your teams, latest news" : `${selectedTeam.name}, latest news`}</span><span className="mt-1 block text-sm text-white/70">A few stories, when you’re ready.</span></span>
          <ChevronDown aria-hidden="true" className="h-5 w-5 shrink-0 group-open:rotate-180" />
        </summary>
        <div className="space-y-6 pt-5">
          {hasPersonalized && <PersonalizedFeed feeds={feeds} loading={loading} error={error} retry={retry} />}
          {!followedFocus && <MorningBriefingCard {...focus} news={focus.news.slice(0, 1)} />}
          {!hasPersonalized && <NewsFeed {...focus} news={focus.news.slice(1)} />}
          {hasPersonalized && <details className="border-t border-white/10 pt-2">
            <summary className="min-h-11 cursor-pointer py-3 font-medium text-white/70 hover:text-white">Around the League</summary>
            <LeagueNewsSection {...newsState("NBA")} news={newsState("NBA").news.filter((item) => !headlineIsAboutTeam(item.title, selectedTeam)).slice(0, 6)} />
          </details>}
        </div>
      </details>
      </section>
      <EndOfSession />
      </div>
    </>
  );
}

export default function Home() {
  return (
    <main className={styles.home}>
      <GameDataProvider>
        <FeedContent />
      </GameDataProvider>
    </main>
  );
}
