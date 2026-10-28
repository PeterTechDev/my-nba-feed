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

function spoilerFlags(req: NextRequest) {
  let queryScores = false;
  let queryHeadlines = false;
  for (const [key, value] of req.nextUrl.searchParams.entries()) {
    const name = key.toLowerCase();
    if (name !== "hidescores" && name !== "hideheadlines") continue;
    const normalized = value.trim().toLowerCase();
    if (normalized !== "1" && normalized !== "true") continue;
    if (name === "hidescores") queryScores = true;
    else queryHeadlines = true;
  }
  const tokens = (req.headers?.get?.("x-nba-spoilers") ?? "").split(/[,;]/).map((part) => part.trim().toLowerCase()).filter(Boolean);
  const known = new Set(["none", "scores", "headlines"]);
  const unknown = tokens.some((token) => !known.has(token));
  const explicitNone = tokens.length === 1 && tokens[0] === "none";
  let hideScores = true;
  let hideHeadlines = true;
  if (!unknown && explicitNone) {
    hideScores = false;
    hideHeadlines = false;
  } else if (!unknown && !tokens.includes("none") && tokens.some((token) => token === "scores" || token === "headlines")) {
    hideScores = tokens.includes("scores");
    hideHeadlines = tokens.includes("headlines");
  }
  if (queryScores) hideScores = true;
  if (queryHeadlines) hideHeadlines = true;
  return { hideScores, hideHeadlines };
}

function responseInit(status = 200) {
  return { status, headers: { Vary: "x-nba-spoilers", "Cache-Control": "private, no-store" } };
}

function deliver(items: NewsItem[], team: string, hideHeadlines: boolean, reveal: string | null) {
  return hideHeadlines ? presentNews(items, team, reveal) : items;
}

export async function GET(req: NextRequest) {
  const batch = req.nextUrl.searchParams.get("teams");
  const names = [...new Set((batch ?? req.nextUrl.searchParams.get("team") ?? "").split(","))];
  if (!names.length || names.some((name) => name !== "NBA" && !teams.some((team) => team.name === name))) {
    return NextResponse.json({ error: "Valid teams required" }, responseInit(400));
  }
  const { hideHeadlines } = spoilerFlags(req);
  const reveal = req.nextUrl.searchParams.get("reveal");
  const results = await Promise.allSettled(names.map(fetchNews));
  if (!batch) {
    const result = results[0];
    return result.status === "fulfilled"
      ? NextResponse.json(deliver(result.value, names[0], hideHeadlines, reveal), responseInit())
      : NextResponse.json({ error: "News unavailable" }, responseInit(502));
  }
  const feeds = Object.fromEntries(names.map((name, i) => [name, {
    items: results[i].status === "fulfilled" ? deliver(results[i].value, name, hideHeadlines, reveal) : [],
    error: results[i].status === "rejected",
    ...(hideHeadlines && results[i].status === "fulfilled" ? { grouped: true } : {}),
  }]));
  const failed = results.every((result) => result.status === "rejected");
  return NextResponse.json({ feeds }, responseInit(failed ? 502 : 200));
}
