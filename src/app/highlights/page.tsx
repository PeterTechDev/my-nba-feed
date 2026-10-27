"use client";
import { useRemoteData } from "@/hooks/useRemoteData";
import DataError from "@/components/DataError";
import TeamSelector from "@/components/TeamSelector";
import { ExternalLink, Youtube } from "lucide-react";
import { useTeam } from "@/hooks/useTeam";
import { useSpoilerContext } from "@/components/SpoilerModeProvider";
import { formatGameDate } from "@/lib/nbaDate";
import { isFinalStatus } from "@/lib/gameStatus";

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

interface ScheduleGame {
  id: number;
  date: string;
  status: string;
  homeTeam: { id: number; name: string; abbreviation: string };
  awayTeam: { id: number; name: string; abbreviation: string };
  homeScore: number;
  awayScore: number;
}

export default function HighlightsPage() {
  const { selectedTeam } = useTeam();
  const { hideScores } = useSpoilerContext();
  const now = new Date();
  const start = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
  const end = now.toISOString().slice(0, 10);
  const { data, loading, error, retry } = useRemoteData<{ games: ScheduleGame[] }>(
    `/api/schedule?teamId=${selectedTeam.id}&start=${start}&end=${end}`
  );
  const highlights: HighlightGame[] = (data?.games || [])
    .filter((game) => isFinalStatus(game.status))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 15)
    .map((game) => {
      const isHome = game.homeTeam.id === selectedTeam.id;
      const opponent = isHome ? game.awayTeam : game.homeTeam;
      const teamScore = isHome ? game.homeScore : game.awayScore;
      const oppScore = isHome ? game.awayScore : game.homeScore;
      const date = formatGameDate(game.date, { month: "short", day: "numeric", year: "numeric" });
      return {
        id: game.id, date: game.date, opponent: opponent.name, opponentAbbr: opponent.abbreviation,
        isHome, teamScore, oppScore, won: teamScore > oppScore,
        youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${selectedTeam.city} ${selectedTeam.name} vs ${opponent.name} ${date} highlights`)}`,
      };
    });

  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={selectedTeam.logo} alt="" className="w-10 h-10 shrink-0" />
        <div>
          <h1 className="text-2xl font-bold">{selectedTeam.name} Highlights</h1>
          <p className="text-sm text-white/70">Find highlights from recent games</p>
        </div>
        </div>
        <TeamSelector />
      </div>
      <p id="youtube-warning" className="text-sm text-white/70 mb-6">Links open YouTube search in a new tab. Search titles and thumbnails may reveal results.</p>

      {error ? (
        <DataError subject="recent games" retry={retry} />
      ) : loading ? (
        <div role="status" aria-label="Loading recent games" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl bg-[#161616] border border-[#2a2a2a] p-5 animate-pulse">
              <div className="h-5 w-48 bg-white/10 rounded mb-3" />
              <div className="h-4 w-32 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      ) : highlights.length === 0 ? (
        <p className="text-white/70 text-center py-16">No recent games found</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {highlights.map((h) => {
            const date = formatGameDate(h.date, { weekday: "short", month: "short", day: "numeric" });
            return (
              <a
                key={h.id}
                href={h.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-describedby="youtube-warning"
                className="group rounded-xl bg-[#161616] border border-[#2a2a2a] p-4 hover:bg-white/5 transition"
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="font-semibold">{h.isHome ? "vs" : "@"} {h.opponent}</p>
                  {!hideScores && (
                      <span className={`text-sm font-medium shrink-0 ${h.won ? "text-emerald-300" : "text-red-300"}`}>
                        {h.won ? "W" : "L"} {h.teamScore}-{h.oppScore}
                      </span>
                  )}
                </div>
                <p className="text-sm text-white/70 mb-3">{date}</p>
                <span className="flex items-center gap-2 text-sm text-red-300"><Youtube aria-hidden="true" className="h-5 w-5 shrink-0" />Search highlights on YouTube<ExternalLink aria-hidden="true" className="h-4 w-4 shrink-0" /></span>
              </a>
            );
          })}
        </div>
      )}

      <div className="mt-8 text-center">
        <a
          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(selectedTeam.city + " " + selectedTeam.name + " highlights " + new Date().getFullYear())}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-describedby="youtube-warning"
          className="inline-flex min-h-11 items-center gap-2 px-4 py-2 rounded-lg bg-red-600/20 text-red-300 hover:bg-red-600/30 transition text-sm font-medium"
        >
          <Youtube aria-hidden="true" className="w-4 h-4" />
          Search more highlights
        </a>
      </div>
    </main>
  );
}
