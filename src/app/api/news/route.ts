import { NextRequest, NextResponse } from "next/server";
import { teams } from "@/lib/teams";
import type { NewsItem } from "@/lib/api";
import { decodeXml } from "@/lib/communityFeed";
import { isTeamNews, newestNews, presentNews } from "@/lib/news";

const SPOILERS = /\b\d{2,3}\s*[-–]\s*\d{2,3}\b|\b(final|recap|box score|postgame|beat|beats|defeat|defeats|edge|edges|blow out|blows out|blown out|rout|routs|survive|survives|stun|stuns|win|wins|won|winning|winless|unbeaten|undefeated|loss|losses|lose|loses|losing|lost)\b/i;
const PROMOTIONS = /\b(promo code|sportsbook|prop bets?|best bets?|odds[\s,]+(?:and|picks))\b/i;

function getCategory(title: string): NewsItem["category"] {
  if (/\b(injury|injured|questionable|probable|doubtful|ruled out|out with|out due to|ankle|knee|hamstring|wrist|illness|surgery)\b/i.test(title)) return "injury";
  if (/\b(starting lineup|starting five|rotation|minutes restriction|bench|available tonight)\b/i.test(title)) return "lineup";
  if (/\b(trade|waive|waived|sign|signed|release|released|contract|extension|call-up)\b/i.test(title)) return "transaction";
  if (/\b(recap|box score|postgame|final)\b/i.test(title)) return "recap";
  if (/\b(report|reports|practice|coach|preview|expects|expected|progress|update)\b/i.test(title)) return "analysis";
  return "general";
}

async function fetchNews(team: string): Promise<NewsItem[]> {
  const res = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(team + " NBA when:7d")}&hl=en-US&gl=US&ceid=US:en`, {
    next: { revalidate: 600 }, signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error("News source unavailable");
  const xml = await res.text();
  if (!/<(?:rss|feed)\b/i.test(xml)) throw new Error("Invalid news feed");
  const items: NewsItem[] = [];
  for (const match of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/g)) {
    const tag = (name: string) => decodeXml(match[1].match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`))?.[1] ?? "");
    const title = tag("title"), source = tag("source");
    if (!isTeamNews(title, team) || PROMOTIONS.test(title)) continue;
    const isSpoiler = SPOILERS.test(title);
    items.push({ title, source, link: tag("link"), pubDate: tag("pubDate"), isSpoiler,
      safeTitle: isSpoiler ? `Spoiler-protected headline${source ? ` from ${source}` : ""}` : title, category: getCategory(title) });
  }
  return newestNews(items).slice(0, 10);
}

function spoilerHidden(req: NextRequest, kind: "scores" | "headlines") {
  const query = req.nextUrl.searchParams.get(kind === "scores" ? "hideScores" : "hideHeadlines");
  if (query === "1" || query === "true") return true;
  if (query === "0" || query === "false") return false;
  const header = req.headers?.get?.("x-nba-spoilers") ?? "";
  if (!header || header === "off") return false;
  return header.split(",").some((part) => part.trim() === kind);
}

function deliver(items: NewsItem[], team: string, hideHeadlines: boolean, reveal: string | null, grouped: boolean) {
  return hideHeadlines ? presentNews(items, team, reveal, grouped) : items;
}

export async function GET(req: NextRequest) {
  const batch = req.nextUrl.searchParams.get("teams");
  const names = [...new Set((batch ?? req.nextUrl.searchParams.get("team") ?? "").split(","))];
  if (!names.length || names.some((name) => name !== "NBA" && !teams.some((team) => team.name === name))) {
    return NextResponse.json({ error: "Valid teams required" }, { status: 400 });
  }
  const hideHeadlines = spoilerHidden(req, "headlines");
  const reveal = req.nextUrl.searchParams.get("reveal");
  const results = await Promise.allSettled(names.map(fetchNews));
  const init = hideHeadlines ? { headers: new Headers({ Vary: "x-nba-spoilers", "Cache-Control": "private, no-store" }) } : undefined;
  if (!batch) {
    const result = results[0];
    return result.status === "fulfilled"
      ? NextResponse.json(deliver(result.value, names[0], hideHeadlines, reveal, false), init)
      : NextResponse.json({ error: "News unavailable" }, { status: 502 });
  }
  const feeds = Object.fromEntries(names.map((name, i) => [name, {
    items: results[i].status === "fulfilled" ? deliver(results[i].value, name, hideHeadlines, reveal, true) : [],
    error: results[i].status === "rejected",
    ...(hideHeadlines && results[i].status === "fulfilled" ? { grouped: true } : {}),
  }]));
  return NextResponse.json({ feeds }, { status: results.every((result) => result.status === "rejected") ? 502 : 200, ...init });
}
