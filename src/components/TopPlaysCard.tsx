"use client";
import Link from "next/link";
import { useSpoilerContext } from "./SpoilerModeProvider";

function getChannelSearchUrl(query: string): string {
  return `https://www.youtube.com/@NBA/search?query=${encodeURIComponent(query)}`;
}

const NBA_CHANNEL_VIDEOS_URL = "https://www.youtube.com/@NBA/videos";

export default function TopPlaysCard() {
  const { hideScores, hideHeadlines } = useSpoilerContext();
  return (
    <div className="rounded-xl overflow-hidden bg-[#161616] border border-[#2a2a2a]">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xs font-bold text-white/60 uppercase tracking-widest">Top Plays</h2>
          <Link href="/highlights" className="inline-flex min-h-11 items-center text-sm text-white/70 transition hover:text-white/75 shrink-0">
            Highlights →
          </Link>
        </div>
        <p className="text-sm text-white/70 mt-2 [text-wrap:pretty]">Explore top plays on the NBA YouTube channel.</p>
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          <a
            href={getChannelSearchUrl("Top 10 Plays of the Night")}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3 transition hover:bg-white/[0.06]"
          >
            <p className="text-base font-bold">Find Top 10 plays ↗</p>
            <p className="text-xs text-white/70 mt-1">Search the NBA channel on YouTube</p>
          </a>
          <a
            href={NBA_CHANNEL_VIDEOS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3 transition hover:bg-white/[0.06]"
          >
            <p className="text-base font-bold">Browse NBA uploads ↗</p>
            <p className="text-xs text-white/70 mt-1">Open the NBA channel on YouTube</p>
          </a>
        </div>
        {(hideScores || hideHeadlines) && <p className="mt-3 text-sm text-white/70 [text-wrap:pretty]">YouTube results may contain spoilers.</p>}
      </div>
    </div>
  );
}
