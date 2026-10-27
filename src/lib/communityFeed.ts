export function decodeXml(value: string): string {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[a-f\d]+);/gi, (entity) => {
      const named: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" };
      if (named[entity]) return named[entity];
      const hex = entity.toLowerCase().startsWith("&#x");
      const code = parseInt(entity.slice(hex ? 3 : 2, -1), hex ? 16 : 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    }).trim();
}

export function parseCommunityFeed(xml: string) {
  const entries: { id: string; title: string; url: string; created: number; author: string; publisher: string | null; subreddit: string | null; indexed: boolean }[] = [];
  for (const match of xml.matchAll(/<(entry|item)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
    const block = match[2];
    const tag = (name: string) => decodeXml(block.match(new RegExp("<" + name + "\\b[^>]*>([\\s\\S]*?)</" + name + ">"))?.[1] ?? "");
    const title = tag("title");
    const link = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?\s*>/)?.[1] ?? tag("link");
    const created = Date.parse(tag("published") || tag("updated") || tag("pubDate")) / 1000;
    try {
      const url = new URL(decodeXml(link));
      if (url.protocol !== "https:" || !["reddit.com", "www.reddit.com", "old.reddit.com", "news.google.com"].includes(url.hostname)) continue;
      if (!title || !Number.isFinite(created)) continue;
      const indexed = url.hostname === "news.google.com";
      const publisher = indexed ? tag("source") || null : "Reddit";
      const subreddit = indexed ? null : url.pathname.match(/^\/r\/([a-z\d_]+)\/comments\//i)?.[1].toLowerCase() ?? null;
      entries.push({ id: tag("id") || tag("guid") || url.href, title, url: url.href, created,
        author: tag("name") || "", publisher, subreddit, indexed });
    } catch {
      // Ignore malformed links from the external feed.
    }
  }
  return entries;
}
