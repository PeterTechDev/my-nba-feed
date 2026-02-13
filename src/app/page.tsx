"use client";
import TeamHeader from "@/components/TeamHeader";
import LastGame from "@/components/LastGame";
import NextGame from "@/components/NextGame";
import NewsFeed from "@/components/NewsFeed";

export default function Home() {
  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      <TeamHeader />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <LastGame />
          <NextGame />
        </div>
        <NewsFeed />
      </div>
    </main>
  );
}
