import { NextRequest, NextResponse } from "next/server";

interface NewsItem {
  title: string;
  safeTitle: string;
  link: string;
  pubDate: string;
  source: string;
  isSpoiler: boolean;
  category: "injury" | "lineup" | "transaction" | "analysis" | "recap" | "general";
}

const SPOILER_PATTERNS = [
  /\b\d{2,3}\s*[-–]\s*\d{2,3}\b/i,
  /\b(final|recap|box score|game recap|postgame)\b/i,
  /\b(beat|beats|defeat|defeats|edge|edges|blow out|blows out|rout|routes|survive|survives|stun|stuns)\b/i,
  /\b(win|wins|winning|loss|losses|lose|loses|lost)\b/i,
];

const HIGH_SIGNAL_PATTERNS = {
  injury: /\b(injury|injured|questionable|probable|doubtful|available|out|return|returns|status|ankle|knee|hamstring|wrist|illness)\b/i,
  lineup: /\b(starting lineup|starting five|rotation|minutes restriction|bench|starting|available tonight)\b/i,
  transaction: /\b(trade|waive|waived|sign|signed|release|released|contract|extension|call-up)\b/i,
  analysis: /\b(report|reports|practice|coach|preview|expects|expected|progress|update)\b/i,
  recap: /\b(recap|box score|postgame|final)\b/i,
};

const TRUSTED_SOURCE_PATTERNS = [
  /\bESPN\b/i,
  /\bThe Athletic\b/i,
  /\bYahoo\b/i,
  /\bCBS Sports\b/i,
  /\bSports Illustrated\b/i,
  /\bBleacher Report\b/i,
  /\bNBA\b/i,
  /\bAP News\b/i,
  /\bReuters\b/i,
];

const LOW_SIGNAL_SOURCE_PATTERNS = [
  /\bYardbarker\b/i,
  /\bSportskeeda\b/i,
  /\bClutchPoints\b/i,
];

const LOW_SIGNAL_TITLE_PATTERNS = [
  /\bthreatens\b/i,
  /\bdominance\b/i,
  /\bstuns fans\b/i,
  /\binternet reacts\b/i,
  /\bmust-see\b/i,
];

function decodeCDATA(value: string): string {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

function isSpoilerHeadline(title: string): boolean {
  return SPOILER_PATTERNS.some((pattern) => pattern.test(title));
}

function getSafeTitle(source: string): string {
  return source ? `Spoiler-protected headline from ${source}` : "Spoiler-protected headline";
}

function getCategory(title: string): NewsItem["category"] {
  if (HIGH_SIGNAL_PATTERNS.injury.test(title)) return "injury";
  if (HIGH_SIGNAL_PATTERNS.lineup.test(title)) return "lineup";
  if (HIGH_SIGNAL_PATTERNS.transaction.test(title)) return "transaction";
  if (HIGH_SIGNAL_PATTERNS.recap.test(title)) return "recap";
  if (HIGH_SIGNAL_PATTERNS.analysis.test(title)) return "analysis";
  return "general";
}

function getQualityScore(item: Pick<NewsItem, "title" | "source" | "pubDate" | "isSpoiler" | "category">): number {
  let score = 0;

  switch (item.category) {
    case "injury":
      score += 40;
      break;
    case "lineup":
      score += 34;
      break;
    case "transaction":
      score += 30;
      break;
    case "analysis":
      score += 18;
      break;
    case "general":
      score += 10;
      break;
    case "recap":
      score -= 12;
      break;
  }

  if (TRUSTED_SOURCE_PATTERNS.some((pattern) => pattern.test(item.source))) score += 12;
  if (LOW_SIGNAL_SOURCE_PATTERNS.some((pattern) => pattern.test(item.source))) score -= 10;
  if (LOW_SIGNAL_TITLE_PATTERNS.some((pattern) => pattern.test(item.title))) score -= 8;
  if (item.isSpoiler) score -= 6;

  const ageHours = Math.max(0, (Date.now() - new Date(item.pubDate).getTime()) / 3600000);
  score += Math.max(0, 12 - ageHours * 0.6);

  return score;
}

export async function GET(req: NextRequest) {
  const team = req.nextUrl.searchParams.get("team");
  if (!team) return NextResponse.json([], { status: 400 });

  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(team + " NBA")}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(url, { next: { revalidate: 600 } });
    const xml = await res.text();

    const items: NewsItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];
      const title = decodeCDATA(block.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "");
      const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() || "";
      const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "";
      const source = decodeCDATA(block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || "");
      const isSpoiler = isSpoilerHeadline(title);
      const category = getCategory(title);
      items.push({
        title,
        safeTitle: isSpoiler ? getSafeTitle(source) : title,
        link,
        pubDate,
        source,
        isSpoiler,
        category,
      });
    }

    items.sort((a, b) => getQualityScore(b) - getQualityScore(a));

    return NextResponse.json(items.slice(0, 10));
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
