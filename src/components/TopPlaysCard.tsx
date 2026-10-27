"use client";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Play } from "lucide-react";
import { useSpoilerContext } from "./SpoilerModeProvider";
import { useTeam } from "@/hooks/useTeam";
import { getContrastColor } from "@/lib/teams";

export default function TopPlaysCard() {
  const { selectedTeam } = useTeam();
  const { hideScores, hideHeadlines } = useSpoilerContext();
  return (
    <section className="flex min-w-0 flex-col rounded-xl p-5 sm:p-6 md:col-span-2 lg:col-span-1"
      style={{ background: selectedTeam.secondaryColor, color: getContrastColor(selectedTeam.secondaryColor) }}>
      <Link href="/highlights" className="group flex flex-1 flex-col items-start">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-current">
          <Play aria-hidden="true" className="h-5 w-5 fill-current transition-transform duration-200 group-hover:scale-110" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Highlights</h2>
        <p className="mt-1 text-sm">Recent {selectedTeam.name} games</p>
        <span className="mt-4 flex min-h-11 w-full items-center justify-between gap-2 text-sm font-semibold">Browse game highlights<ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" /></span>
      </Link>
      <details className="mt-2 border-t border-current">
        <summary className="min-h-11 cursor-pointer py-3 text-xs font-medium">More from the NBA</summary>
        <a href={`https://www.youtube.com/@NBA/search?query=${encodeURIComponent("Top 10 Plays of the Night")}`} target="_blank" rel="noopener noreferrer"
          className="flex min-h-11 items-center justify-between gap-2 text-sm underline underline-offset-4">Top 10 plays<ArrowUpRight aria-hidden="true" className="h-4 w-4" /><span className="sr-only">on YouTube (opens in a new tab)</span></a>
        <a href="https://www.youtube.com/@NBA/videos" target="_blank" rel="noopener noreferrer"
          className="flex min-h-11 items-center justify-between gap-2 text-sm underline underline-offset-4">NBA uploads<ArrowUpRight aria-hidden="true" className="h-4 w-4" /><span className="sr-only">on YouTube (opens in a new tab)</span></a>
        {(hideScores || hideHeadlines) && <p className="mt-2 text-xs">YouTube results may contain spoilers.</p>}
      </details>
    </section>
  );
}
