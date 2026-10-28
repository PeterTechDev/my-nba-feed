import type { Team } from "./teams";

export const NBA_CHANNEL_ID = "UCWJ2lWNubArHWmf3FIHbfcQ";
export const HIGHLIGHTS_DOCUMENT = "youtube-highlights.json";
export const EMPTY_HIGHLIGHTS: YouTubeHighlights = { syncedAt: null, videos: [] };
const DAY = 86400000;

export interface StoredHighlight {
  id: string;
  date: string;
  awayTeamId?: number;
  homeTeamId?: number;
  topCount?: 5 | 10;
  title: string;
  thumbnail: string;
  duration: number;
  retrievedAt: string;
}

export interface YouTubeHighlights {
  syncedAt: string | null;
  topPlaysEnabled?: boolean;
  videos: StoredHighlight[];
}

export function topPlayMatch(title: string) {
  const match = title.match(/^NBA['’]s\s+Top\s+(10|5)\s+Plays\s+of\s+the\s+Night\s*[!|–—-]*\s*([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})\s*!?$/i);
  if (!match) return null;
  const date = titleDate(match[2], match[3], match[4]);
  return date ? { date, topCount: Number(match[1]) as 5 | 10 } : null;
}

function titleDate(monthName: string, day: string, year: string) {
  const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const month = months.indexOf(monthName.toLowerCase()) + 1;
  const date = `${year}-${String(month).padStart(2, "0")}-${day.padStart(2, "0")}`;
  return month && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date ? date : null;
}

export function highlightKey(video: Pick<StoredHighlight, "date" | "topCount" | "awayTeamId" | "homeTeamId">) {
  return video.topCount ? `${video.date}:top${video.topCount}` : `${video.date}:${video.awayTeamId}:${video.homeTeamId}`;
}

export function highlightMatch(title: string, teams: Team[]) {
  const match = title.match(/^(?:EXTENDED:\s*)?(.+?)\s+(?:at|vs\.?)\s+(.+?)\s*\|\s*FULL GAME HIGHLIGHTS\s*\|\s*([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})\s*$/i);
  if (!match) return null;
  const date = titleDate(match[3], match[4], match[5]);
  if (!date) return null;
  const find = (name: string) => teams.find((team) => [team.name, `${team.city} ${team.name}`, team.abbreviation,
    ...(team.name === "76ers" ? ["Sixers"] : [])].some((alias) => alias.toLowerCase() === name.trim().toLowerCase()));
  const away = find(match[1]), home = find(match[2]);
  return away && home && away.id !== home.id ? { date, awayTeamId: away.id, homeTeamId: home.id } : null;
}

export function recentHighlights(state: YouTubeHighlights, now = new Date()): StoredHighlight[] {
  const cutoff = now.getTime() - 30 * DAY;
  return state.videos.filter((video) => Date.parse(video.retrievedAt) > cutoff && Date.parse(`${video.date}T23:59:59Z`) > cutoff);
}

export function parseHighlightPublication(value: unknown, teams: Team[], now = new Date()): YouTubeHighlights {
  const body = value as Partial<YouTubeHighlights> | null;
  if (!body || typeof body.syncedAt !== "string" || !Number.isFinite(Date.parse(body.syncedAt)) ||
    Math.abs(Date.parse(body.syncedAt) - now.getTime()) > 15 * 60000 || !Array.isArray(body.videos) || body.videos.length > 1000) throw new Error("Invalid highlights publication");
  const ids = new Set<string>();
  const games = new Set<string>();
  const videos = body.videos.map((video) => {
    const game = typeof video?.title === "string" && video.title.length <= 500 ? (topPlayMatch(video.title) ?? highlightMatch(video.title, teams)) : null;
    const key = video && highlightKey(video);
    if (!video || typeof video.id !== "string" || !/^[\w-]{11}$/.test(video.id) || !game || game.date !== video.date ||
      ("topCount" in game ? game.topCount !== video.topCount || video.awayTeamId !== undefined || video.homeTeamId !== undefined :
        game.awayTeamId !== video.awayTeamId || game.homeTeamId !== video.homeTeamId || video.topCount !== undefined) || ids.has(video.id) || games.has(key) ||
      !Number.isInteger(video.duration) || video.duration <= 0 || video.duration > 86400 || typeof video.thumbnail !== "string" ||
      typeof video.retrievedAt !== "string" || !Number.isFinite(Date.parse(video.retrievedAt)) || Date.parse(video.retrievedAt) > now.getTime() + 60000 ||
      Date.parse(video.retrievedAt) <= now.getTime() - 30 * DAY || video.date > now.toISOString().slice(0, 10)) throw new Error("Invalid highlight video");
    const thumbnail = new URL(video.thumbnail);
    if (thumbnail.protocol !== "https:" || thumbnail.username || thumbnail.password || !/^(?:i\d*|img)\.ytimg\.com$/.test(thumbnail.hostname) ||
      !thumbnail.pathname.startsWith(`/vi/${video.id}/`) && !thumbnail.pathname.startsWith(`/vi_webp/${video.id}/`)) throw new Error("Invalid YouTube thumbnail");
    ids.add(video.id); games.add(key);
    return { id: video.id, ...game, title: video.title, thumbnail: thumbnail.href, duration: video.duration, retrievedAt: video.retrievedAt };
  });
  return { syncedAt: body.syncedAt, ...(body.topPlaysEnabled === true ? { topPlaysEnabled: true } : {}), videos: recentHighlights({ syncedAt: body.syncedAt, videos }, now) };
}
