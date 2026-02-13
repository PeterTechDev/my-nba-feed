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
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
      <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">News</h3>
      {loading ? (
        <p className="text-white/40">Loading news...</p>
      ) : news.length === 0 ? (
        <p className="text-white/40">No news found</p>
      ) : (
        <ul className="space-y-4">
          {news.map((item, i) => (
            <li key={i}>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium hover:underline line-clamp-2"
              >
                {item.title}
              </a>
              <p className="text-xs text-white/40 mt-0.5">
                {item.source && <span>{item.source} · </span>}
                {item.pubDate && relativeTime(item.pubDate)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
