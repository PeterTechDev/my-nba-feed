"use client";
import { useState } from "react";
import { useRemoteData } from "@/hooks/useRemoteData";
import DataError from "@/components/DataError";
import TeamSelector from "@/components/TeamSelector";
import { ExternalLink, EyeOff, Play, Youtube } from "lucide-react";
import { useTeam } from "@/hooks/useTeam";
import { useSpoilerContext } from "@/components/SpoilerModeProvider";
import { formatGameDate } from "@/lib/nbaDate";
import { isFinalStatus } from "@/lib/gameStatus";
import type { HighlightVideo, HighlightsResponse } from "@/lib/api";

interface HighlightGame {
  id: number;
  date: string;
  opponent: string;
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

function HighlightCard({ game, video, loading, failed }: { game: HighlightGame; video?: HighlightVideo; loading: boolean; failed: boolean }) {
  const { hideScores, hideHeadlines } = useSpoilerContext();
  const { selectedTeam } = useTeam();
  const [revealed, setRevealed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const protectedPreview = (hideScores || hideHeadlines) && !revealed;
  const matchup = `${game.isHome ? "vs" : "at"} ${game.opponent}`;

  return <article className="overflow-hidden rounded-xl border border-white/10 bg-[#161616]">
    <div className="relative aspect-video min-h-[200px] bg-[#202020]">
      {loading ? <div role="status" aria-label={`Loading highlights ${matchup}`} className="h-full animate-pulse bg-white/5" /> : video ? (
        protectedPreview ? <button type="button" onClick={() => setRevealed(true)} aria-label={`Reveal video preview ${matchup}`}
          className="flex h-full w-full flex-col items-center justify-center gap-3 p-5 text-white/80 hover:bg-white/5">
          <EyeOff aria-hidden="true" className="h-7 w-7" /><span className="font-medium">Reveal video preview</span><span className="text-xs text-white/70">The thumbnail may reveal the result</span>
        </button> : playing ? <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&playsinline=1&rel=0`}
          title={`Full game highlights ${matchup}`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin" className="absolute inset-0 h-full w-full border-0" />
        : <button type="button" onClick={() => setPlaying(true)} aria-label={`Play highlights ${matchup}`}
          aria-describedby="video-warning" className="group relative flex h-full min-h-[200px] w-full items-center justify-center hover:bg-white/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {!imageFailed && <img src={video.thumbnail} alt="" width={640} height={360} loading="lazy" onError={() => setImageFailed(true)} className="absolute inset-0 h-full w-full object-cover" />}
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-black/80 text-white transition-transform duration-200 group-hover:scale-110"><Play aria-hidden="true" className="h-6 w-6 fill-current" /></span>
          {video.duration && <span className="absolute bottom-3 right-3 rounded bg-black/80 px-2 py-1 text-xs font-medium tabular-nums text-white">{Math.floor(video.duration / 60)}:{String(Math.floor(video.duration % 60)).padStart(2, "0")}</span>}
          {imageFailed && <span className="absolute bottom-3 left-3 text-xs text-white/70">Preview unavailable · Play video</span>}
        </button>
      ) : <div className="flex h-full flex-col items-center justify-center gap-3 p-5 text-center text-white/70">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={selectedTeam.logo} alt="" width={64} height={64} className="h-16 w-16 object-contain" />
        <p className="text-sm">{failed ? "Video could not be loaded" : "Video not available yet"}</p>
      </div>}
    </div>
    <div className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{matchup}</h2>
        {!hideScores && <span className={`text-sm font-medium tabular-nums ${game.won ? "text-emerald-300" : "text-red-300"}`}>{game.won ? "W" : "L"} {game.teamScore}-{game.oppScore}</span>}
      </div>
      <p className="mt-1 text-sm text-white/70">{formatGameDate(game.date, { weekday: "short", month: "short", day: "numeric" })}</p>
      {video ? <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {protectedPreview ? <span className="text-sm text-white/70">NBA · YouTube</span> : <a href={video.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/70 hover:text-white">
          NBA · YouTube<ExternalLink aria-hidden="true" className="h-4 w-4" /><span className="sr-only">(opens in a new tab)</span>
        </a>}
        {playing && <button type="button" onClick={() => setPlaying(false)} className="min-h-11 rounded-lg border border-white/20 px-3 text-sm text-white/80 hover:bg-white/10">Close player</button>}
        {(hideScores || hideHeadlines) && revealed && <button type="button" onClick={() => { setPlaying(false); setRevealed(false); }} className="min-h-11 rounded-lg border border-white/20 px-3 text-sm text-white/80 hover:bg-white/10">Hide video preview</button>}
      </div> : !loading && <a href={game.youtubeUrl} target="_blank" rel="noopener noreferrer" aria-describedby="video-warning"
        className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm text-white/80 hover:text-white"><Youtube aria-hidden="true" className="h-4 w-4" />Search on YouTube<ExternalLink aria-hidden="true" className="h-4 w-4" /><span className="sr-only">(opens in a new tab)</span></a>}
    </div>
  </article>;
}

export default function HighlightsPage() {
  const { selectedTeam } = useTeam();
  const { hideScores, hideHeadlines } = useSpoilerContext();
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
        id: game.id, date: game.date, opponent: opponent.name,
        isHome, teamScore, oppScore, won: teamScore > oppScore,
        youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${selectedTeam.city} ${selectedTeam.name} vs ${opponent.name} ${date} highlights`)}`,
      };
    });
  const dates = highlights.map((game) => game.date.slice(0, 10)).join(",");
  const videos = useRemoteData<HighlightsResponse>(dates ? `/api/highlights?teamId=${selectedTeam.id}&dates=${encodeURIComponent(dates)}` : null);

  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={selectedTeam.logo} alt="" className="w-10 h-10 shrink-0" />
        <div>
          <h1 className="text-2xl font-bold">{selectedTeam.name} Highlights</h1>
          <p className="text-sm text-white/70">Full game highlights from the NBA YouTube channel</p>
        </div>
        </div>
        <TeamSelector />
      </div>
      <p id="video-warning" className="text-sm text-white/70 mb-6">Play here or open on YouTube. Video previews and the player may reveal results.</p>
      {(videos.error || Boolean(videos.data?.failedDates.length)) && <div className="mb-6"><DataError subject="highlight videos" retry={videos.retry} /></div>}

      {error ? (
        <DataError subject="recent games" retry={retry} />
      ) : loading ? (
        <div role="status" aria-label="Loading recent games" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl bg-[#161616] border border-[#2a2a2a] animate-pulse">
              <div className="aspect-video bg-white/5" />
              <div className="p-5"><div className="h-5 w-48 bg-white/10 rounded mb-3" /><div className="h-4 w-32 bg-white/10 rounded" /></div>
            </div>
          ))}
        </div>
      ) : highlights.length === 0 ? (
        <p className="text-white/70 text-center py-16">No recent games found</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {highlights.map((game) => <HighlightCard key={`${selectedTeam.id}:${game.id}:${hideScores}:${hideHeadlines}`} game={game}
            video={videos.data?.videos[game.date.slice(0, 10)]} loading={videos.loading} failed={videos.error || Boolean(videos.data?.failedDates.includes(game.date.slice(0, 10)))} />)}
        </div>
      )}

      <div className="mt-8 text-center">
        <a
          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(selectedTeam.city + " " + selectedTeam.name + " highlights " + new Date().getFullYear())}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-describedby="video-warning"
          className="inline-flex min-h-11 items-center gap-2 px-4 py-2 rounded-lg bg-red-600/20 text-red-300 hover:bg-red-600/30 transition text-sm font-medium"
        >
          <Youtube aria-hidden="true" className="w-4 h-4" />
          Search more highlights
        </a>
      </div>
    </main>
  );
}
