"use client";
import TeamHeader from "@/components/TeamHeader";
import GameDayHero from "@/components/GameDayHero";
import { LastGameCard, NextGameCard } from "@/components/GameSection";
import NewsFeed from "@/components/NewsFeed";
import GameDataProvider from "@/components/GameDataProvider";
import TopPlaysCard from "@/components/TopPlaysCard";
import MorningBriefingCard from "@/components/MorningBriefingCard";
import PersonalizedFeed, { LeagueNewsSection } from "@/components/PersonalizedFeed";
import { useFavoriteTeams } from "@/hooks/useFavoriteTeams";
import { useTeam } from "@/hooks/useTeam";

function FeedContent() {
  const { favoriteTeamIds } = useFavoriteTeams();
  const { selectedTeam } = useTeam();
  const hasPersonalized = favoriteTeamIds.length > 0;

  return (
    <>
      <TeamHeader />
      {hasPersonalized && <PersonalizedFeed />}
      <GameDayHero />
      {!favoriteTeamIds.includes(selectedTeam.id) && <MorningBriefingCard />}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8">
        <div className="space-y-5 sm:space-y-8">
          <NextGameCard />
          <LastGameCard />
        </div>
        <div className="space-y-5 sm:space-y-8">
          {!hasPersonalized && <NewsFeed limit={2} />}
          <TopPlaysCard />
        </div>
      </div>
      {hasPersonalized && <LeagueNewsSection />}
    </>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-6xl mx-auto space-y-5 sm:space-y-8">
      <GameDataProvider>
        <FeedContent />
      </GameDataProvider>
    </main>
  );
}
