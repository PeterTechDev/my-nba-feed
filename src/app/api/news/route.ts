import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const team = req.nextUrl.searchParams.get("team");
  if (!team) return NextResponse.json([], { status: 400 });

  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(team + " NBA")}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(url, { next: { revalidate: 600 } });
    const xml = await res.text();

    const items: { title: string; link: string; pubDate: string; source: string }[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];
      const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1") || "";
      const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() || "";
      const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "";
      const source = block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1") || "";
      items.push({ title, link, pubDate, source });
    }

    return NextResponse.json(items.slice(0, 10));
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
