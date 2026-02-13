"use client";
import { useEffect, useState } from "react";
import { useTeam } from "@/hooks/useTeam";
import { NewsItem, getNews } from "@/lib/api";

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NewsFeed() {
  const { selectedTeam } = useTeam();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getNews(selectedTeam.name).then((n) => { setNews(n); setLoading(false); });
  }, [selectedTeam.name]);

  return (
    <div className="rounded-xl overflow-hidden bg-[#161616] border border-[#2a2a2a]">
      <div className="h-0.5" style={{ background: "linear-gradient(90deg, var(--team-primary), transparent)" }} />
      <div className="p-5">
        <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest mb-4">News</h3>
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[...Array(5)].map((_, i) => (
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
          <ul className="divide-y divide-white/5">
            {news.map((item, i) => (
              <li key={i} className="group py-3 -mx-2 px-2 rounded-lg hover:bg-white/5 transition-colors first:pt-0">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium group-hover:text-white transition-colors line-clamp-2"
                >
                  {item.title}
                </a>
                <p className="text-xs text-white/40 mt-1">
                  {item.source && <span className="text-white/50">{item.source}</span>}
                  {item.source && item.pubDate && <span> · </span>}
                  {item.pubDate && relativeTime(item.pubDate)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
