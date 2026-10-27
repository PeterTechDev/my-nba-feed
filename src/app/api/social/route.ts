import { NextRequest, NextResponse } from "next/server";
import { teams } from "@/lib/teams";
import { teamSubreddits } from "@/lib/reddit";
import { parseCommunityFeed } from "@/lib/communityFeed";

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

  const engagementScore = Math.min(20, Math.log10(Math.max(1, (post.score ?? 0) + (post.comments ?? 0))) * 6);
  score += engagementScore;

  const ageHours = Math.max(0, (Date.now() / 1000 - post.created) / 3600);
  score -= Math.min(14, ageHours * 0.8);

  if (/\b(meme|shitpost)\b/i.test(post.title)) score -= 12;

  return score;
}

export async function GET(req: NextRequest) {
  const teamName = req.nextUrl.searchParams.get("team");
  const team = teams.find((entry) => entry.name === teamName);
  if (!team) return NextResponse.json({ posts: [], error: "Valid team required" }, { status: 400 });
  const subreddit = teamSubreddits[team.name];
  const subs = subreddit ? ["nba", subreddit] : ["nba"];
  const keywords = getTeamKeywords(team.name);
  let usedIndex = false;
  const fetchSource = async (sub: string): Promise<RedditPost[]> => {
    try {
      const response = await fetch(`https://www.reddit.com/r/${sub}/new.json?limit=25`, {
        headers: { "User-Agent": "NBA-Feed/1.0" }, next: { revalidate: 120 }, signal: AbortSignal.timeout(3500),
      });
      if (!response.ok) throw new Error("Reddit feed unavailable");
      const json = await response.json();
      if (!Array.isArray(json.data?.children)) throw new Error("Invalid Reddit feed");
      return (json.data.children as RedditListingChild[]).map(({ data }) => ({
        id: data.id, title: data.title, score: data.score, comments: data.num_comments, created: data.created_utc,
        url: `https://reddit.com${data.permalink}`, subreddit: data.subreddit, author: data.author,
        thumbnail: /^https:\/\//.test(data.thumbnail) ? data.thumbnail : null, category: getCategory(data.title),
      }));
    } catch {
      try {
        const response = await fetch(`https://www.reddit.com/r/${sub}/new/.rss`, {
          headers: { "User-Agent": "NBA-Feed/1.0" }, next: { revalidate: 120 }, signal: AbortSignal.timeout(3500),
        });
        if (!response.ok) throw new Error("Reddit RSS unavailable");
        const entries = parseCommunityFeed(await response.text());
        if (!entries.length) throw new Error("Reddit RSS empty");
        return entries.map((entry) => ({ ...entry, score: null, comments: null, subreddit: sub, thumbnail: null, category: getCategory(entry.title) }));
      } catch {
        const query = `site:reddit.com/r/${sub} ${team.city} ${team.name}`;
        const response = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`, {
          next: { revalidate: 600 }, signal: AbortSignal.timeout(3500),
        });
        if (!response.ok) throw new Error("Community sources unavailable");
        const entries = parseCommunityFeed(await response.text());
        if (!entries.length) throw new Error("Community sources empty");
        usedIndex = true;
        return entries.map((entry) => ({ ...entry, score: null, comments: null, subreddit: sub, thumbnail: null, category: getCategory(entry.title) }));
      }
    }
  };
  const results = await Promise.allSettled(subs.map(fetchSource));
  const fulfilled = results.filter((result) => result.status === "fulfilled");
  if (!fulfilled.length) return NextResponse.json({ posts: [], error: "Social sources unavailable" }, { status: 502 });
  const posts = fulfilled.flatMap((result) => result.value)
    .filter((post) => post.subreddit !== "nba" || isRelevantToTeam(post.title, keywords));
  const deduped = Array.from(new Map(posts.map((post) => [new URL(post.url).pathname, post])).values());
  deduped.sort((a, b) => getQualityScore(b, b.subreddit) - getQualityScore(a, a.subreddit) || b.created - a.created);
  return NextResponse.json({ posts: deduped.slice(0, 50), source: usedIndex ? "news-index" : "reddit", partial: fulfilled.length < subs.length, error: null });
}
