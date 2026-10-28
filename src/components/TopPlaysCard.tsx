"use client";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Play } from "lucide-react";
import { useSpoilerContext } from "./SpoilerModeProvider";
import { useTeam } from "@/hooks/useTeam";

export default function TopPlaysCard() {
  const { selectedTeam } = useTeam();
  const { hideScores, hideHeadlines } = useSpoilerContext();
  return (
    <section aria-label="Game highlights" className="flex min-w-0 flex-col items-start gap-2">
      <Link href="/highlights" className="flex min-h-14 items-center gap-3 rounded-lg text-white/80 hover:text-white">
        <Play aria-hidden="true" className="h-4 w-4 shrink-0" />
        <span><span className="block text-base font-semibold">Browse game highlights</span><span className="mt-1 block text-sm text-white/70">Recent {selectedTeam.name} games</span></span>
        <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4 shrink-0" />
      </Link>
      <details className="text-white/70">
        <summary className="min-h-11 cursor-pointer py-3 text-sm hover:text-white">More from the NBA</summary>
        <a href={`https://www.youtube.com/@NBA/search?query=${encodeURIComponent("Top 10 Plays of the Night")}`} target="_blank" rel="noopener noreferrer"
          className="flex min-h-11 items-center justify-between gap-2 text-sm underline underline-offset-4">Top 10 plays<ArrowUpRight aria-hidden="true" className="h-4 w-4" /><span className="sr-only">on YouTube (opens in a new tab)</span></a>
        <a href="https://www.youtube.com/@NBA/videos" target="_blank" rel="noopener noreferrer"
          className="flex min-h-11 items-center justify-between gap-2 text-sm underline underline-offset-4">NBA uploads<ArrowUpRight aria-hidden="true" className="h-4 w-4" /><span className="sr-only">on YouTube (opens in a new tab)</span></a>
        {(hideScores || hideHeadlines) && <p className="mt-2 text-xs">YouTube results may contain spoilers.</p>}
      </details>
    </section>
  );
}
