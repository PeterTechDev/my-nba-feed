"use client";
import { useEffect, useState } from "react";
import { useTeam } from "@/hooks/useTeam";
import { NewsItem, getNews } from "@/lib/api";
import { useSpoilerContext } from "./SpoilerModeProvider";

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function categoryLabel(category: NewsItem["category"]): string | null {
  switch (category) {
    case "injury":
      return "Injury";
    case "lineup":
      return "Lineup";
    case "transaction":
      return "Transaction";
    case "analysis":
      return "Report";
    default:
      return null;
  }
}

export default function NewsFeed({ limit = 3 }: { limit?: number }) {
  const { selectedTeam } = useTeam();
  const { hideHeadlines } = useSpoilerContext();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setLoading(true);
    setRevealed(false);
    getNews(selectedTeam.name).then((n) => { setNews(n); setLoading(false); });
  }, [selectedTeam.name]);

  const displayNews = news.slice(0, limit);
  const hasMore = news.length > limit;
  const hiddenCount = displayNews.filter((item) => hideHeadlines && item.isSpoiler && !revealed).length;

  return (
    <div className="rounded-xl overflow-hidden bg-[#161616] border border-[#2a2a2a]">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest">News</h3>
            {hideHeadlines && hiddenCount > 0 && (
              <p className="text-[11px] text-amber-400/80 mt-1">
                {hiddenCount} headline{hiddenCount > 1 ? "s" : ""} hidden to avoid spoilers
              </p>
            )}
          </div>
          {hideHeadlines && displayNews.some((item) => item.isSpoiler) && (
            <button
              type="button"
              onClick={() => setRevealed((prev) => !prev)}
              className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white/60 hover:bg-white/5 hover:text-white/80 transition"
            >
              {revealed ? "Hide spoilers" : "Reveal headlines"}
            </button>
          )}
        </div>
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[...Array(limit)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-full bg-white/10 rounded" />
                <div className="h-3 w-24 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-white/30 text-sm">No news found</p>
            <p className="text-white/20 text-xs mt-1">Check back later</p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-white/5">
              {displayNews.map((item, i) => (
                <li key={i} className="group py-3 -mx-2 px-2 rounded-lg hover:bg-white/5 transition-colors first:pt-0">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-sm font-medium transition-colors line-clamp-2 ${
                      hideHeadlines && item.isSpoiler && !revealed
                        ? "text-white/60 group-hover:text-white/75"
                        : "group-hover:text-white"
                    }`}
                  >
                    {hideHeadlines && item.isSpoiler && !revealed ? item.safeTitle : item.title}
                  </a>
                  <p className="text-xs text-white/40 mt-1">
                    {categoryLabel(item.category) && (
                      <>
                        <span className="text-emerald-400/80">{categoryLabel(item.category)}</span>
                        <span> · </span>
                      </>
                    )}
                    {item.source && <span className="text-white/50">{item.source}</span>}
                    {item.source && item.pubDate && <span> · </span>}
                    {item.pubDate && relativeTime(item.pubDate)}
                  </p>
                  {hideHeadlines && item.isSpoiler && !revealed && (
                    <p className="text-[11px] text-white/25 mt-1">Tap reveal to view the original headline</p>
                  )}
                </li>
              ))}
            </ul>
            {hasMore && (
              <div className="mt-3 pt-3 border-t border-white/5">
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(selectedTeam.name + " NBA news")}&tbm=nws`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-white/50 hover:text-white/80 transition-colors"
                >
                  View all →
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
