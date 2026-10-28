import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getTeamById, teams } from "@/lib/teams";
import { formatNBADate } from "@/lib/nbaDate";
import { readDigestDocument, updateDigestDocument } from "@/lib/digestStorage";
import { EMPTY_HIGHLIGHTS, HIGHLIGHTS_DOCUMENT, parseHighlightPublication, highlightKey, recentHighlights, type YouTubeHighlights } from "@/lib/youtubeHighlights";
import type { HighlightVideo } from "@/lib/api";

function authorized(req: NextRequest) {
  const expected = process.env.DIGEST_PUBLISH_TOKEN;
  const supplied = req.headers.get("authorization")?.replace(/^Bearer /i, "") ?? "";
  return Boolean(expected && Buffer.byteLength(supplied) === Buffer.byteLength(expected) && timingSafeEqual(Buffer.from(supplied), Buffer.from(expected)));
}

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("sync") === "1") {
    if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
      const state = await readDigestDocument<YouTubeHighlights>(HIGHLIGHTS_DOCUMENT, EMPTY_HIGHLIGHTS);
      return NextResponse.json({ ...state, videos: recentHighlights(state) }, { headers: { "Cache-Control": "no-store" } });
    } catch {
      return NextResponse.json({ error: "Highlights storage unavailable" }, { status: 503 });
    }
  }
  if (req.nextUrl.searchParams.get("kind") === "top-plays") {
    try {
      const state = await readDigestDocument<YouTubeHighlights>(HIGHLIGHTS_DOCUMENT, EMPTY_HIGHLIGHTS);
      return NextResponse.json({ videos: recentHighlights(state).filter((video) => video.topCount)
        .sort((a, b) => b.date.localeCompare(a.date) || (b.topCount ?? 0) - (a.topCount ?? 0)), syncedAt: state.syncedAt });
    } catch {
      return NextResponse.json({ error: "Top plays unavailable" }, { status: 503 });
    }
  }
  const team = getTeamById(Number(req.nextUrl.searchParams.get("teamId")));
  const dates = [...new Set((req.nextUrl.searchParams.get("dates") ?? "").split(","))];
  const today = formatNBADate(), start = formatNBADate(new Date(Date.now() - 30 * 86400000));
  if (!team || dates.length > 15 || dates.some((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date || date < start || date > today)) {
    return NextResponse.json({ error: "Valid teamId and up to 15 recent game dates required" }, { status: 400 });
  }
  try {
    const state = await readDigestDocument<YouTubeHighlights>(HIGHLIGHTS_DOCUMENT, EMPTY_HIGHLIGHTS);
    const videos: Record<string, HighlightVideo> = {};
    for (const video of recentHighlights(state)) {
      if (dates.includes(video.date) && [video.awayTeamId, video.homeTeamId].includes(team.id)) {
        videos[video.date] = { id: video.id, thumbnail: video.thumbnail, duration: video.duration, url: `https://www.youtube.com/watch?v=${video.id}` };
      }
    }
    return NextResponse.json({ videos, failedDates: [] });
  } catch {
    return NextResponse.json({ videos: {}, failedDates: dates, error: "Highlights storage unavailable" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let publication: YouTubeHighlights;
  try {
    const text = await req.text();
    if (text.length > 1000000) throw new Error("Payload too large");
    publication = parseHighlightPublication(JSON.parse(text), teams);
  } catch {
    return NextResponse.json({ error: "Invalid highlights publication" }, { status: 400 });
  }
  try {
    await updateDigestDocument<YouTubeHighlights>(HIGHLIGHTS_DOCUMENT, EMPTY_HIGHLIGHTS, (current) => {
      const byGame = new Map(recentHighlights(current).map((video) => [highlightKey(video), video]));
      for (const video of publication.videos) byGame.set(highlightKey(video), video);
      return { topPlaysEnabled: current.topPlaysEnabled || publication.topPlaysEnabled, syncedAt: current.syncedAt && current.syncedAt > publication.syncedAt! ? current.syncedAt : publication.syncedAt, videos: [...byGame.values()] };
    });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Highlights could not be saved" }, { status: 503 });
  }
}
