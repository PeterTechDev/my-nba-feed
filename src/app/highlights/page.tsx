"use client";
import { useEffect, useState } from "react";
import { useTeam } from "@/hooks/useTeam";

interface HighlightGame {
  id: number;
  date: string;
  opponent: string;
  opponentAbbr: string;
  isHome: boolean;
  teamScore: number;
  oppScore: number;
  won: boolean;
  youtubeUrl: string;
}

export default function HighlightsPage() {
  const { selectedTeam } = useTeam();
  const [highlights, setHighlights] = useState<HighlightGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/games?teamId=${selectedTeam.id}`)
      .then((r) => r.json())
      .then((data) => {
        // We'll use the games API to build highlight links
        // Since we don't have YouTube API, we link to YouTube search
        const games = [];
        const allGames = data.lastGame ? [data.lastGame] : [];

        // Fetch more games from schedule
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
        const start = thirtyDaysAgo.toISOString().slice(0, 10);
        const end = now.toISOString().slice(0, 10);

        fetch(`/api/schedule?teamId=${selectedTeam.id}&start=${start}&end=${end}`)
          .then((r) => r.json())
          .then((d) => {
            const finishedGames = (d.games || [])
              .filter((g: any) => g.status === "Final")
              .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 15);

            const items = finishedGames.map((g: any) => {
              const isHome = g.homeTeam.id === selectedTeam.id;
              const opp = isHome ? g.awayTeam : g.homeTeam;
              const teamScore = isHome ? g.homeScore : g.awayScore;
              const oppScore = isHome ? g.awayScore : g.homeScore;
              const dateFormatted = new Date(g.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
              const q = encodeURIComponent(`${selectedTeam.city} ${selectedTeam.name} vs ${opp.name} ${dateFormatted} highlights`);

              return {
                id: g.id,
                date: g.date,
                opponent: opp.name,
                opponentAbbr: opp.abbreviation,
                isHome,
                teamScore,
                oppScore,
                won: teamScore > oppScore,
                youtubeUrl: `https://www.youtube.com/results?search_query=${q}`,
              };
            });

            setHighlights(items);
            setLoading(false);
          })
          .catch(() => setLoading(false));
      })
      .catch(() => setLoading(false));
  }, [selectedTeam]);

  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={selectedTeam.logo} alt="" className="w-10 h-10" />
        <div>
          <h1 className="text-2xl font-bold">{selectedTeam.name} Highlights</h1>
          <p className="text-sm text-white/40">Recent game highlights on YouTube</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl bg-[#161616] border border-[#2a2a2a] p-5 animate-pulse">
              <div className="aspect-video bg-white/10 rounded-lg mb-3" />
              <div className="h-4 w-32 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      ) : highlights.length === 0 ? (
        <p className="text-white/40 text-center py-16">No recent games found</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {highlights.map((h) => {
            const date = new Date(h.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
            return (
              <a
                key={h.id}
                href={h.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-xl bg-[#161616] border border-[#2a2a2a] overflow-hidden hover:border-white/20 transition"
              >
                <div className="h-0.5" style={{ background: `linear-gradient(90deg, var(--team-primary), transparent)` }} />
                <div className="aspect-video bg-gradient-to-br from-white/5 to-black flex items-center justify-center relative">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 group-hover:bg-white/20 transition">
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                    <span className="text-sm font-medium text-white/80">Watch on YouTube</span>
                    <svg className="w-3.5 h-3.5 text-white/40" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" /></svg>
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${h.won ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                      {h.won ? "W" : "L"} {h.teamScore}-{h.oppScore}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <p className="font-medium text-sm group-hover:text-white transition">
                    {h.isHome ? "vs" : "@"} {h.opponent}
                  </p>
                  <p className="text-xs text-white/40 mt-1">{date}</p>
                </div>
              </a>
            );
          })}
        </div>
      )}

      <div className="mt-8 text-center">
        <a
          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(selectedTeam.city + " " + selectedTeam.name + " highlights 2025")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
          More on YouTube
        </a>
      </div>
    </main>
  );
}
