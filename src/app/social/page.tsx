"use client";
import { useEffect, useState } from "react";
import { useTeam } from "@/hooks/useTeam";
import { teamSubreddits } from "@/lib/reddit";

interface RedditPost {
  id: string;
  title: string;
  score: number;
  comments: number;
  created: number;
  url: string;
  subreddit: string;
  author: string;
  thumbnail: string | null;
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() / 1000 - timestamp;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function SocialPage() {
  const { selectedTeam } = useTeam();
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

  const teamSub = teamSubreddits[selectedTeam.name] || "";

  useEffect(() => {
    setLoading(true);
    setFilter(null);
    fetch(`/api/social?team=${encodeURIComponent(selectedTeam.name)}&subreddit=${encodeURIComponent(teamSub)}`)
      .then((r) => r.json())
      .then((d) => { setPosts(d.posts || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedTeam.name, teamSub]);

  const subreddits = [...new Set(posts.map((p) => p.subreddit))];
  const filtered = filter ? posts.filter((p) => p.subreddit === filter) : posts;

  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={selectedTeam.logo} alt="" className="w-10 h-10" />
        <div>
          <h1 className="text-2xl font-bold">{selectedTeam.name} Social Feed</h1>
          <p className="text-sm text-white/40 italic">&quot;No algorithms. Just your team.&quot;</p>
        </div>
      </div>

      {/* Source filter */}
      <div className="flex gap-2 mt-4 mb-6 overflow-x-auto">
        <button
          onClick={() => setFilter(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
            !filter ? "bg-white/15 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"
          }`}
        >
          All
        </button>
        {subreddits.map((sub) => (
          <button
            key={sub}
            onClick={() => setFilter(sub)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
              filter === sub ? "bg-white/15 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"
            }`}
          >
            r/{sub}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-20 bg-white/5 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-white/40 text-center py-16">No posts found</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((post) => (
            <a
              key={post.id}
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl bg-[#161616] border border-[#2a2a2a] hover:border-white/20 transition overflow-hidden"
            >
              <div className="h-0.5" style={{ background: `linear-gradient(90deg, var(--team-primary), transparent)` }} />
              <div className="p-4 flex gap-3">
                {post.thumbnail && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={post.thumbnail} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm line-clamp-2">{post.title}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
                    <span className="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 font-medium">
                      r/{post.subreddit}
                    </span>
                    <span>↑ {post.score}</span>
                    <span>💬 {post.comments}</span>
                    <span>{timeAgo(post.created)}</span>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
