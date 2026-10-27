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
  subreddit: string | null;
  publisher: string | null;
  indexed: boolean;
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
  if (/\b(postgame|post game|post-game|serious post game thread)\b/.test(normalizedTitle)) return "postgame";
  if (/\b(game thread|pregame|pre game)\b/.test(normalizedTitle)) return "game-thread";
  if (/\b(injury|injured|questionable|doubtful|probable|ruled out|sidelined|concussion|out with|out due to|return from injury|available to play|cleared to play)\b/.test(normalizedTitle)) return "injury";
  if (/\b(report|reports|trade|signed|waived|lineup|rotation|coach|practice|update)\b/.test(normalizedTitle)) return "news";
  if (/\b(highlight|clip|discussion|thoughts|takeaways|what are your|how are we feeling)\b/.test(normalizedTitle)) return "discussion";
  return "general";
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
        url: `https://reddit.com${data.permalink}`, subreddit: data.subreddit.toLowerCase(), publisher: "Reddit", indexed: false, author: data.author,
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
        return entries.map((entry) => ({ ...entry, score: null, comments: null, thumbnail: null, category: getCategory(entry.title) }));
      } catch {
        const query = `site:reddit.com/r/${sub} ${team.city} ${team.name} when:7d`;
        const response = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`, {
          next: { revalidate: 600 }, signal: AbortSignal.timeout(3500),
        });
        if (!response.ok) throw new Error("Community sources unavailable");
        const entries = parseCommunityFeed(await response.text());
        if (!entries.length) throw new Error("Community sources empty");
        usedIndex = true;
        return entries.map((entry) => ({ ...entry, score: null, comments: null, thumbnail: null, category: getCategory(entry.title) }));
      }
    }
  };
  const results = await Promise.allSettled(subs.map(fetchSource));
  const fulfilled = results.filter((result) => result.status === "fulfilled");
  if (!fulfilled.length) return NextResponse.json({ posts: [], error: "Social sources unavailable" }, { status: 502 });
  const now = Date.now() / 1000;
  const posts = fulfilled.flatMap((result) => result.value)
    .filter((post) => Number.isFinite(post.created) && post.created <= now && post.created >= now - 7 * 86400)
    .filter((post) => post.subreddit === subreddit?.toLowerCase() || isRelevantToTeam(post.title, keywords));
  const deduped = Array.from(new Map(posts.map((post) => [new URL(post.url).pathname, post])).values());
  deduped.sort((a, b) => b.created - a.created);
  return NextResponse.json({ posts: deduped.slice(0, 50), source: usedIndex ? "news-index" : "reddit", partial: fulfilled.length < subs.length, error: null });
}
