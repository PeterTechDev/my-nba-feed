"use client";
import Link from "next/link";

function getTodayLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getYouTubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

export default function TopPlaysCard() {
  const todayLabel = getTodayLabel();

  return (
    <div className="rounded-xl overflow-hidden bg-[#161616] border border-[#2a2a2a]">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest">Top Plays</h3>
            <p className="text-sm text-white/40 mt-2">Quick access to the latest NBA top 10 and tonight&apos;s best clips.</p>
          </div>
          <Link href="/highlights" className="text-sm text-white/45 transition hover:text-white/75 shrink-0">
            Highlights →
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <a
            href={getYouTubeSearchUrl(`NBA Top 10 plays ${todayLabel}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-white/8 bg-white/[0.03] px-4 py-3 transition hover:bg-white/[0.06]"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">Latest Top 10</p>
            <p className="mt-2 text-lg font-bold">NBA Top 10</p>
            <p className="text-xs text-white/40 mt-1">{todayLabel}</p>
          </a>
          <a
            href={getYouTubeSearchUrl(`NBA best plays tonight ${todayLabel}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-white/8 bg-white/[0.03] px-4 py-3 transition hover:bg-white/[0.06]"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">Tonight</p>
            <p className="mt-2 text-lg font-bold">Best Plays</p>
            <p className="text-xs text-white/40 mt-1">League-wide check-in without the feed clutter</p>
          </a>
        </div>
      </div>
    </div>
  );
}
