"use client";
import { useRemoteData } from "@/hooks/useRemoteData";
import DataError from "@/components/DataError";
import TeamSelector from "@/components/TeamSelector";
import { ArrowUp, MessageCircle } from "lucide-react";
import { useSpoilerContext } from "@/components/SpoilerModeProvider";
import { useEffect, useState } from "react";
import { useTeam } from "@/hooks/useTeam";
import { teamSubreddits } from "@/lib/reddit";

interface RedditPost {
  id: string;
  title: string;
  score: number | null;
  comments: number | null;
  created: number;
  url: string;
  subreddit: string;
  author: string;
  thumbnail: string | null;
  category: "game-thread" | "postgame" | "injury" | "news" | "discussion" | "general";
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() / 1000 - timestamp;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function categoryLabel(category: RedditPost["category"]): string | null {
  switch (category) {
    case "game-thread":
      return "Game thread";
    case "postgame":
      return "Postgame";
    case "injury":
      return "Injury";
    case "news":
      return "News";
    case "discussion":
      return "Discussion";
    default:
      return null;
  }
}

export default function SocialPage() {
  const { selectedTeam } = useTeam();
  const { hideHeadlines } = useSpoilerContext();
  const [revealedPosts, setRevealedPosts] = useState<string[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  useEffect(() => { setRevealedPosts([]); setFilter(null); }, [selectedTeam.id, hideHeadlines]);
  const teamSub = teamSubreddits[selectedTeam.name] || "";
  const { data, loading, error, retry } = useRemoteData<{ posts: RedditPost[]; source?: string; partial?: boolean }>(`/api/social?team=${encodeURIComponent(selectedTeam.name)}&subreddit=${encodeURIComponent(teamSub)}`);
  const posts = data?.posts || [];

  const subreddits = [...new Set(posts.map((p) => p.subreddit))];
  const activeFilter = filter && subreddits.includes(filter) ? filter : null;
  const filtered = activeFilter ? posts.filter((p) => p.subreddit === activeFilter) : posts;

  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={selectedTeam.logo} alt="" className="w-10 h-10 shrink-0" />
        <div>
          <h1 className="text-2xl font-bold">{selectedTeam.name} Social Feed</h1>
          <p className="text-sm text-white/70">Team discussions from the past 7 days · Newest first</p>
        </div>
        </div>
        <TeamSelector />
      </div>

      {/* Source filter */}
      <div className="flex gap-2 mt-4 mb-6 overflow-x-auto">
        <button
          onClick={() => setFilter(null)}
          aria-pressed={!activeFilter}
          className={`min-h-11 min-w-11 px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
            !activeFilter ? "bg-white/15 text-white" : "bg-white/5 text-white/70 hover:bg-white/10"
          }`}
        >
          All sources
        </button>
        {subreddits.map((sub) => (
          <button
            key={sub}
            aria-pressed={activeFilter === sub}
            onClick={() => setFilter(sub)}
            className={`min-h-11 px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
              activeFilter === sub ? "bg-white/15 text-white" : "bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            r/{sub}
          </button>
        ))}
      </div>
      {data?.source === "news-index" && <p role="status" className="mb-4 text-sm text-white/70">Direct community feeds are unavailable. Showing Reddit discussions found through a news index.</p>}
      {data?.partial && <p role="status" className="mb-4 text-sm text-white/70">Some community feeds are unavailable. Showing available posts.</p>}
      {hideHeadlines && <p className="mb-4 text-sm text-white/70">Reveal a post before opening it. External discussions may contain spoilers.</p>}

      {error ? (
        <DataError subject="social posts" retry={retry} />
      ) : loading ? (
        <div role="status" aria-label="Loading social posts" className="space-y-3 animate-pulse">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-20 bg-white/5 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center"><p className="text-white/80">No discussions from the past 7 days{activeFilter ? ` in r/${activeFilter}` : ""}.</p><button type="button" onClick={retry} className="min-h-11 mt-3 rounded-lg border border-white/15 px-4 text-sm hover:bg-white/10">Check again</button></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((post) => {
            const key = `${selectedTeam.id}:${post.id}`;
            const hidden = hideHeadlines && !revealedPosts.includes(key);
            return (
              <article key={post.id} className="rounded-xl bg-[#161616] border border-[#2a2a2a] overflow-hidden">
                <a
                  href={hidden ? undefined : post.url}
                  target={hidden ? undefined : "_blank"}
                  rel={hidden ? undefined : "noopener noreferrer"}
                  className="block hover:bg-white/5 transition"
                >
                  <div className="h-0.5" style={{ background: `linear-gradient(90deg, var(--team-primary), transparent)` }} />
                  <div className="p-4 flex gap-3">
                    {!hidden && post.thumbnail && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={post.thumbnail} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-base line-clamp-2">{hidden ? `Spoiler-protected post from r/${post.subreddit}` : post.title.replace(/\s+[-–—]\s+Reddit$/i, "")}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-2 text-xs text-white/70">
                        {!hidden && categoryLabel(post.category) && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">
                            {categoryLabel(post.category)}
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 font-medium">
                          r/{post.subreddit}
                        </span>
                        {!hidden && post.score !== null && <span className="inline-flex items-center gap-1"><ArrowUp aria-hidden="true" className="h-3.5 w-3.5" /><span className="sr-only">Score: </span>{post.score}</span>}
                        {!hidden && post.comments !== null && <span className="inline-flex items-center gap-1"><MessageCircle aria-hidden="true" className="h-3.5 w-3.5" /><span className="sr-only">Comments: </span>{post.comments}</span>}
                        <time dateTime={new Date(post.created * 1000).toISOString()} title={new Date(post.created * 1000).toLocaleString()}>{timeAgo(post.created)}</time>
                      </div>
                    </div>
                  </div>
                </a>
                {hideHeadlines && (
                  <button type="button" className="mx-4 mb-3 min-h-11 rounded-lg border border-white/15 px-3 text-sm text-white/80 hover:bg-white/10"
                    onClick={() => setRevealedPosts((posts) => hidden ? [...posts, key] : posts.filter((id) => id !== key))}>
                    {hidden ? "Reveal post and image" : "Hide spoilers"}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
