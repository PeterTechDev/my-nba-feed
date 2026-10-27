import { NextRequest, NextResponse } from "next/server";
import { getTeamById } from "@/lib/teams";
import { formatNBADate } from "@/lib/nbaDate";
import type { HighlightVideo } from "@/lib/api";

interface ESPNEvent {
  date: string;
  competitions?: {
    status?: { type?: { completed?: boolean } };
    competitors?: { team?: { abbreviation?: string } }[];
    headlines?: { video?: { id?: number; headline?: string; thumbnail?: string; duration?: number }[] }[];
  }[];
}

export async function GET(req: NextRequest) {
  const team = getTeamById(Number(req.nextUrl.searchParams.get("teamId")));
  const dates = [...new Set((req.nextUrl.searchParams.get("dates") ?? "").split(","))];
  const today = formatNBADate();
  const start = formatNBADate(new Date(Date.now() - 30 * 86400000));
  if (!team || dates.length > 15 || dates.some((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date || date < start || date > today)) {
    return NextResponse.json({ error: "Valid teamId and up to 15 recent game dates required" }, { status: 400 });
  }

  const aliases: Record<string, string> = { NYK: "NY", GSW: "GS", NOP: "NO", SAS: "SA", UTA: "UTAH", WAS: "WSH" };
  const abbreviation = aliases[team.abbreviation] ?? team.abbreviation;
  // shortcut: ESPN's public scoreboard supplies clips; switch sources if its media feed changes.
  const results = await Promise.allSettled(dates.map(async (date) => {
    const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${date.replaceAll("-", "")}`, {
      next: { revalidate: 600 }, signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) throw new Error("Video source unavailable");
    const json = await response.json();
    if (!Array.isArray(json.events)) throw new Error("Invalid scoreboard");
    for (const event of json.events as ESPNEvent[]) {
      if (!Number.isFinite(Date.parse(event.date)) || formatNBADate(new Date(event.date)) !== date) continue;
      const game = event.competitions?.[0];
      if (!game?.status?.type?.completed || !game.competitors?.some((side) => side.team?.abbreviation === abbreviation)) continue;
      const clips = game.headlines?.flatMap((headline) => headline.video ?? []) ?? [];
      for (const clip of clips) {
        if (!Number.isSafeInteger(clip.id) || clip.id! <= 0 || !/game highlights/i.test(clip.headline ?? "") || !clip.thumbnail) continue;
        try {
          const thumbnail = new URL(clip.thumbnail);
          if (thumbnail.protocol !== "https:" || thumbnail.username || thumbnail.password || !["a.espncdn.com", "s.espncdn.com", "espnmedia-cdn.akamaized.net"].includes(thumbnail.hostname)) continue;
          return { id: String(clip.id), thumbnail: thumbnail.href, url: `https://www.espn.com/video/clip/_/id/${clip.id}`,
            duration: Number.isFinite(clip.duration) && clip.duration! > 0 ? clip.duration! : null } satisfies HighlightVideo;
        } catch {
          // Ignore malformed media URLs from the video source.
        }
      }
    }
    return null;
  }));
  const videos: Record<string, HighlightVideo> = {};
  const failedDates: string[] = [];
  results.forEach((result, index) => {
    if (result.status === "rejected") failedDates.push(dates[index]);
    else if (result.value) videos[dates[index]] = result.value;
  });
  if (failedDates.length === dates.length) return NextResponse.json({ videos, failedDates, error: "Highlights unavailable" }, { status: 502 });
  return NextResponse.json({ videos, failedDates });
}
