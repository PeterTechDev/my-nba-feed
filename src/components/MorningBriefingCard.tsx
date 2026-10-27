"use client";
import { Sun } from "lucide-react";
import { useRemoteData } from "@/hooks/useRemoteData";
import { useTeam } from "@/hooks/useTeam";
import { useSpoilerContext } from "./SpoilerModeProvider";
import DataError from "./DataError";
import { NewsItem, getNewsTitle, formatNewsAge } from "@/lib/api";

export default function MorningBriefingCard() {
  const { selectedTeam } = useTeam();
  const { hideHeadlines, hideScores } = useSpoilerContext();
  const { data: news, loading, error, retry } = useRemoteData<NewsItem[]>(`/api/news?team=${encodeURIComponent(selectedTeam.name)}`);
  const topStory = news?.[0];

  return (
    <section className="rounded-xl bg-[#161616] border border-[#2a2a2a] p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Sun aria-hidden="true" className="h-4 w-4 text-amber-300" />
        <h2 className="text-sm font-semibold">Morning Briefing</h2>
        <span className="ml-auto text-xs text-white/70">
          {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
        </span>
      </div>
      {error ? (
        <DataError subject="top story" retry={retry} />
      ) : loading ? (
        <p role="status" className="text-sm text-white/70">Loading {selectedTeam.name} news…</p>
      ) : topStory ? (
        <>
          <p className="mb-1 text-xs font-medium text-white/70">Top story · {selectedTeam.city} {selectedTeam.name}</p>
          <a href={topStory.link} target="_blank" rel="noopener noreferrer"
            className="block rounded-lg hover:bg-white/5 transition-colors">
            <p className="text-base font-medium leading-relaxed text-white/90">
              {getNewsTitle(topStory, hideHeadlines)}
            </p>
            <p className="mt-2 text-xs text-white/70">{formatNewsAge(topStory.pubDate)}</p>
            <span className="inline-flex min-h-11 items-center text-sm text-emerald-400">
              Read on {topStory.source || "source site"} ↗
            </span>
          </a>
          {(hideHeadlines || hideScores) && <p className="text-xs text-white/70">The source site may contain spoilers.</p>}
        </>
      ) : (
        <p className="text-sm text-white/70">No recent {selectedTeam.name} stories. Check back later.</p>
      )}
    </section>
  );
}
