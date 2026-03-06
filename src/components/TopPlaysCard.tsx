"use client";
import Link from "next/link";

function getChannelSearchUrl(query: string): string {
  return `https://www.youtube.com/@NBA/search?query=${encodeURIComponent(query)}`;
}

const NBA_CHANNEL_VIDEOS_URL = "https://www.youtube.com/@NBA/videos";

export default function TopPlaysCard() {
  return (
    <div className="rounded-xl overflow-hidden bg-[#161616] border border-[#2a2a2a]">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest">Top Plays</h3>
            <p className="text-sm text-white/40 mt-2">Fast links to the official NBA top plays without relying on noisy generic search terms.</p>
          </div>
          <Link href="/highlights" className="text-sm text-white/45 transition hover:text-white/75 shrink-0">
            Highlights →
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <a
            href={getChannelSearchUrl("Top 10 Plays of the Night")}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-white/8 bg-white/[0.03] px-4 py-3 transition hover:bg-white/[0.06]"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">Latest Top 10</p>
            <p className="mt-2 text-lg font-bold">Top 10 of the Night</p>
            <p className="text-xs text-white/40 mt-1">Search only inside the official NBA channel</p>
          </a>
          <a
            href={NBA_CHANNEL_VIDEOS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-white/8 bg-white/[0.03] px-4 py-3 transition hover:bg-white/[0.06]"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">Official feed</p>
            <p className="mt-2 text-lg font-bold">NBA Uploads</p>
            <p className="text-xs text-white/40 mt-1">Open the latest NBA channel uploads directly</p>
          </a>
        </div>
      </div>
    </div>
  );
}
