import { NextRequest, NextResponse } from "next/server";
import { teams } from "@/lib/teams";
import type { NewsItem } from "@/lib/api";
import { decodeXml } from "@/lib/communityFeed";
import { isTeamNews, newestNews } from "@/lib/news";

const SPOILERS = /\b\d{2,3}\s*[-–—]\s*\d{2,3}\b(?![.,]\d)|\b(?:[5-9]\d|1[0-8]\d)\s*:\s*(?:[5-9]\d|1[0-8]\d)\b|\b(?:[A-Za-z][\w'.]*|76ers)\s+(?:[5-9]\d|1[0-8]\d)\s*,\s*(?:[A-Za-z][\w'.]*|76ers)\s+(?:[5-9]\d|1[0-8]\d)\b|\b\d\s*[-–—]\s*\d\b(?:\s+\w+){0,3}\s+\b(?:series|lead)\b|\b(?:series|lead)\b(?:\s+\w+){0,3}\s+\b\d\s*[-–—]\s*\d\b|\b(?:series\s+lead|sweeps?|sweeping|swept|forc(?:e[sd]?|ing)\s+(?:(?:a|the)\s+)?game\s+\d+|eliminat(?:e[sd]?|ing|ion)|advanc(?:e[sd]?|ing))\b|\b(final|recap|box scores?|postgame|beat|beats|beaten|defeat|defeats|defeated|edge|edges|edged|blow out|blows out|blown out|blew out|blowout|blowouts|rout|routs|routed|survive|survives|survived|stun|stuns|stunned|win|wins|won|winning|winless|unbeaten|undefeated|loss|losses|lose|loses|losing|lost|top|tops|fall to|falls to|fell to|down|downs|downed|outlast|outlasts|outlasted|hold off|holds off|held off|crush|crushes|crushed|cruise past|cruises past|cruised past|rally past|rallies past|rallied past|upset|upsets|sink|sinks|sank|sunk|topple|topples|toppled)\b|\b(?:lift(?:s|ed|ing)?|carr(?:y|ies|ied)|power(?:s|ed)?)\b(?:\s+\S+){0,4}\s+\b(?:past|over)\b|\bbuzzer[-–—\s]*beat(?:ers?|ing)\b|\bgame[-–—\s]+win(?:ners?|ning)\b|\b(?:up|down|leads?|trails?)\s+\d\s*[-–—]\s*\d\b|\b(?:leads?|trails?)\s+(?:the\s+)?series\b|\b(?:are|at|improv(?:e|es|ed)\s+to|mov(?:e|es|ed)\s+to|falls?\s+to)\s+\d\s*[-–—]\s*\d\b|\b(?:victory|win)\s+over\b|\b\d\s*[-–]\s*\d\s+start\b|\bpush(?:es|ed)?\b(?:\s+\S+){0,4}\s+\bpast\b/i;
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

export async function GET(req: NextRequest) {
  const batch = req.nextUrl.searchParams.get("teams");
  const names = [...new Set((batch ?? req.nextUrl.searchParams.get("team") ?? "").split(","))];
  if (!names.length || names.some((name) => name !== "NBA" && !teams.some((team) => team.name === name))) {
    return NextResponse.json({ error: "Valid teams required" }, { status: 400 });
  }
  const results = await Promise.allSettled(names.map(fetchNews));
  if (!batch) {
    const result = results[0];
    return result.status === "fulfilled" ? NextResponse.json(result.value) : NextResponse.json({ error: "News unavailable" }, { status: 502 });
  }
  const feeds = Object.fromEntries(names.map((name, i) => [name, {
    items: results[i].status === "fulfilled" ? results[i].value : [], error: results[i].status === "rejected",
  }]));
  return NextResponse.json({ feeds }, { status: results.every((result) => result.status === "rejected") ? 502 : 200 });
}
