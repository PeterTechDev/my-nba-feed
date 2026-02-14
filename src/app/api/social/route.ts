import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const team = req.nextUrl.searchParams.get("team");
  const subreddit = req.nextUrl.searchParams.get("subreddit");

  if (!team) return NextResponse.json({ posts: [], error: "team required" }, { status: 400 });

  try {
    const subs = ["nba"];
    if (subreddit) subs.push(subreddit);

    const allPosts: any[] = [];

    for (const sub of subs) {
      try {
        const res = await fetch(`https://www.reddit.com/r/${sub}/new.json?limit=25`, {
          headers: { "User-Agent": "NBA-Feed/1.0" },
          next: { revalidate: 120 },
        });

        if (!res.ok) continue;
        const json = await res.json();
        const posts = (json.data?.children || []).map((c: any) => ({
          id: c.data.id,
          title: c.data.title,
          score: c.data.score,
          comments: c.data.num_comments,
          created: c.data.created_utc,
          url: `https://reddit.com${c.data.permalink}`,
          subreddit: c.data.subreddit,
          author: c.data.author,
          thumbnail: c.data.thumbnail !== "self" && c.data.thumbnail !== "default" && c.data.thumbnail !== "nsfw" ? c.data.thumbnail : null,
        }));
        allPosts.push(...posts);
      } catch {
        // Skip failed subreddit
      }
    }

    // Sort chronologically (newest first)
    allPosts.sort((a, b) => b.created - a.created);

    return NextResponse.json({ posts: allPosts.slice(0, 50), error: null });
  } catch {
    return NextResponse.json({ posts: [], error: "Failed to fetch" }, { status: 500 });
  }
}
