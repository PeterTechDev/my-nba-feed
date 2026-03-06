import { NextRequest, NextResponse } from "next/server";
import { teams } from "@/lib/teams";

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

interface RedditListingChild {
  data: {
    id: string;
    title: string;
    score: number;
    num_comments: number;
    created_utc: number;
    permalink: string;
    subreddit: string;
    author: string;
    thumbnail: string;
  };
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function getTeamKeywords(teamName: string): string[] {
  const team = teams.find((entry) => entry.name === teamName);
  if (!team) return [teamName];

  const keywords = new Set<string>([
    team.name,
    team.abbreviation,
    `${team.city} ${team.name}`,
  ]);

  if (team.name === "76ers") {
    keywords.add("Sixers");
    keywords.add("Philadelphia 76ers");
    keywords.add("Philly");
  }

  if (team.name === "Trail Blazers") {
    keywords.add("Blazers");
    keywords.add("Portland Trail Blazers");
    keywords.add("Rip City");
  }

  return [...keywords].map(normalizeText);
}

function isRelevantToTeam(title: string, keywords: string[]): boolean {
  const normalizedTitle = normalizeText(title);
  return keywords.some((keyword) => normalizedTitle.includes(keyword));
}

export async function GET(req: NextRequest) {
  const team = req.nextUrl.searchParams.get("team");
  const subreddit = req.nextUrl.searchParams.get("subreddit");

  if (!team) return NextResponse.json({ posts: [], error: "team required" }, { status: 400 });

  try {
    const subs = ["nba"];
    if (subreddit) subs.push(subreddit);
    const keywords = getTeamKeywords(team);

    const allPosts: RedditPost[] = [];

    for (const sub of subs) {
      try {
        const res = await fetch(`https://www.reddit.com/r/${sub}/new.json?limit=25`, {
          headers: { "User-Agent": "NBA-Feed/1.0" },
          next: { revalidate: 120 },
        });

        if (!res.ok) continue;
        const json = await res.json();
        const posts = ((json.data?.children || []) as RedditListingChild[]).map((c) => ({
          id: c.data.id,
          title: c.data.title,
          score: c.data.score,
          comments: c.data.num_comments,
          created: c.data.created_utc,
          url: `https://reddit.com${c.data.permalink}`,
          subreddit: c.data.subreddit,
          author: c.data.author,
          thumbnail: c.data.thumbnail !== "self" && c.data.thumbnail !== "default" && c.data.thumbnail !== "nsfw" ? c.data.thumbnail : null,
        }));

        const filteredPosts = sub === "nba"
          ? posts.filter((post) => isRelevantToTeam(post.title, keywords))
          : posts;

        allPosts.push(...filteredPosts);
      } catch {
        // Skip failed subreddit
      }
    }

    const dedupedPosts = Array.from(new Map(allPosts.map((post) => [post.id, post])).values());

    // Sort chronologically (newest first)
    dedupedPosts.sort((a, b) => b.created - a.created);

    return NextResponse.json({ posts: dedupedPosts.slice(0, 50), error: null });
  } catch {
    return NextResponse.json({ posts: [], error: "Failed to fetch" }, { status: 500 });
  }
}
