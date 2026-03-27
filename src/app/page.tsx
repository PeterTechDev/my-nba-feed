"use client";
import TeamHeader from "@/components/TeamHeader";
import GameDayHero from "@/components/GameDayHero";
import { LastGameCard, NextGameCard } from "@/components/GameSection";
import NewsFeed from "@/components/NewsFeed";
import GameDataProvider from "@/components/GameDataProvider";
import TopPlaysCard from "@/components/TopPlaysCard";
import MorningBriefingCard from "@/components/MorningBriefingCard";

export default function Home() {
  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-6xl mx-auto space-y-8">
      <GameDataProvider>
        <TeamHeader />
        <MorningBriefingCard />
        <GameDayHero />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-8">
            <NextGameCard />
            <LastGameCard />
          </div>
          <div className="space-y-8">
            <TopPlaysCard />
            <NewsFeed limit={2} />
          </div>
        </div>
      </GameDataProvider>
    </main>
  );
}
