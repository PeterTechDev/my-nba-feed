"use client";
import TeamHeader from "@/components/TeamHeader";
import { LastGameCard, NextGameCard } from "@/components/GameSection";
import NewsFeed from "@/components/NewsFeed";
import GameDataProvider from "@/components/GameDataProvider";
import RecordBadge from "@/components/RecordBadge";

export default function Home() {
  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      <GameDataProvider>
        <TeamHeader />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <LastGameCard />
            <NextGameCard />
          </div>
          <NewsFeed />
        </div>
      </GameDataProvider>
    </main>
  );
}
