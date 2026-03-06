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
  category: "game-thread" | "postgame" | "injury" | "news" | "discussion" | "general";
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

function getCategory(title: string): RedditPost["category"] {
  const normalizedTitle = normalizeText(title);
  if (/\b(game thread|pregame|pre game)\b/.test(normalizedTitle)) return "game-thread";
  if (/\b(postgame|post game|post-game|serious post game thread)\b/.test(normalizedTitle)) return "postgame";
  if (/\b(injury|injured|questionable|probable|available|out|return|returns|status)\b/.test(normalizedTitle)) return "injury";
  if (/\b(report|reports|trade|signed|waived|lineup|rotation|coach|practice|update)\b/.test(normalizedTitle)) return "news";
  if (/\b(highlight|clip|discussion|thoughts|takeaways|what are your|how are we feeling)\b/.test(normalizedTitle)) return "discussion";
  return "general";
}

function getQualityScore(post: RedditPost, subreddit: string): number {
  let score = 0;

  switch (post.category) {
    case "game-thread":
      score += 50;
      break;
    case "postgame":
      score += 42;
      break;
    case "injury":
      score += 34;
      break;
    case "news":
      score += 24;
      break;
    case "discussion":
      score += 12;
      break;
    case "general":
      score += 4;
      break;
  }

  if (subreddit !== "nba") score += 10;

  const engagementScore = Math.min(20, Math.log10(Math.max(1, post.score + post.comments)) * 6);
  score += engagementScore;

  const ageHours = Math.max(0, (Date.now() / 1000 - post.created) / 3600);
  score -= Math.min(14, ageHours * 0.8);

  if (/\b(meme|shitpost)\b/i.test(post.title)) score -= 12;

  return score;
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
          category: getCategory(c.data.title),
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

    dedupedPosts.sort((a, b) => {
      const scoreDiff = getQualityScore(b, b.subreddit) - getQualityScore(a, a.subreddit);
      if (scoreDiff !== 0) return scoreDiff;
      return b.created - a.created;
    });

    return NextResponse.json({ posts: dedupedPosts.slice(0, 50), error: null });
  } catch {
    return NextResponse.json({ posts: [], error: "Failed to fetch" }, { status: 500 });
  }
}
