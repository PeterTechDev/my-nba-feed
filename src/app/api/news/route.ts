import { NextRequest, NextResponse } from "next/server";

interface NewsItem {
  title: string;
  safeTitle: string;
  link: string;
  pubDate: string;
  source: string;
  isSpoiler: boolean;
}

const SPOILER_PATTERNS = [
  /\b\d{2,3}\s*[-–]\s*\d{2,3}\b/i,
  /\b(final|recap|box score|game recap|postgame)\b/i,
  /\b(beat|beats|defeat|defeats|edge|edges|blow out|blows out|rout|routes|survive|survives|stun|stuns)\b/i,
  /\b(win|wins|winning|loss|losses|lose|loses|lost)\b/i,
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
      items.push({
        title,
        safeTitle: isSpoiler ? getSafeTitle(source) : title,
        link,
        pubDate,
        source,
        isSpoiler,
      });
    }

    return NextResponse.json(items.slice(0, 10));
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
