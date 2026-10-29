import { unstable_cache } from "next/cache";
import { readDocument, updateDocument } from "./documentStorage";
import { fetchBallDontLieSource } from "./ballDontLie";
import { formatNBADate, getNBASeason } from "./nbaDate";
import { getGameStartTime, isFinalStatus, isLiveStatus } from "./gameStatus";

export interface LeagueGame {
  id: number; date: string; season: number; status: string; datetime?: string | null;
  postponed?: boolean; period?: number; time?: string;
  home_team: { id: number; name: string; abbreviation: string };
  visitor_team: { id: number; name: string; abbreviation: string };
  home_team_score: number; visitor_team_score: number;
}
export interface LeagueSnapshot { syncedAt: string; games: LeagueGame[] }
export const LEAGUE_DOCUMENT = "league-games.json";

export function validateGames(value: unknown): LeagueGame[] {
  if (!Array.isArray(value) || value.length > 6000) throw new Error("Invalid games");
  const ids = new Set<number>();
  for (const game of value) {
    if (!game || !Number.isSafeInteger(game.id) || ids.has(game.id) ||
      typeof game.date !== "string" || !Number.isFinite(Date.parse(game.date)) || !Number.isInteger(game.season) ||
      typeof game.status !== "string" || !game.status.trim() ||
      ![game.home_team, game.visitor_team].every(team => team && Number.isInteger(team.id) && team.id >= 1 && team.id <= 30 && typeof team.name === "string" && typeof team.abbreviation === "string") ||
      ![game.home_team_score, game.visitor_team_score].every(score => Number.isInteger(score) && score >= 0)) throw new Error("Invalid game");
    ids.add(game.id);
  }
  return value.map(game => ({
    id: game.id, date: game.date, season: game.season, status: game.status,
    datetime: typeof game.datetime === "string" ? game.datetime : null,
    postponed: game.postponed === true, period: game.period, time: game.time,
    home_team: { id: game.home_team.id, name: game.home_team.name, abbreviation: game.home_team.abbreviation },
    visitor_team: { id: game.visitor_team.id, name: game.visitor_team.name, abbreviation: game.visitor_team.abbreviation },
    home_team_score: game.home_team_score, visitor_team_score: game.visitor_team_score,
  }));
}

const readSnapshot = unstable_cache(async () => {
  const snapshot = await readDocument<LeagueSnapshot | null>(LEAGUE_DOCUMENT, null);
  if (!snapshot) throw new Error("Games have not been synchronized");
  return snapshot;
}, ["league-snapshot-v2"], { revalidate: 3600, tags: ["league-catalog"] });

class RefreshBusy extends Error {}
interface LiveSnapshot extends LeagueSnapshot { attemptedAt: number }
const EMPTY_LIVE: LiveSnapshot = { syncedAt: "", games: [], attemptedAt: 0 };

// One lease for the whole league, across visitors, routes and server instances.
const readLive = unstable_cache(async () => {
  const snapshot = await readSnapshot();
  let live = await readDocument<LiveSnapshot>("league-live.json", EMPTY_LIVE);
  const merged = new Map(snapshot.games.map(game => [game.id, game]));
  if (live.syncedAt > snapshot.syncedAt) for (const game of live.games) merged.set(game.id, game);
  const now = Date.now();
  const dates = [...new Set([...merged.values()].filter(game => {
    if (game.postponed || isFinalStatus(game.status) || /cancel|postpone/i.test(game.status)) return false;
    const start = getGameStartTime(game);
    return start ? Date.parse(start) <= now && now - Date.parse(start) < 12 * 3600000
      : isLiveStatus(game.status) && game.date.slice(0, 10) === formatNBADate();
  }).map(game => game.date.slice(0, 10)))];
  if (!dates.length || now - live.attemptedAt < 60000) return live;
  try {
    live = await updateDocument<LiveSnapshot>("league-live.json", EMPTY_LIVE, current => {
      if (now - current.attemptedAt < 60000) throw new RefreshBusy();
      return { ...current, attemptedAt: now };
    });
    const params = new URLSearchParams({ per_page: "100" });
    for (const date of dates) params.append("dates[]", date);
    const response = await fetchBallDontLieSource(`https://api.balldontlie.io/v1/games?${params}`, 0);
    if (!response.ok) return live;
    const body = await response.json();
    if (body.meta?.next_cursor) throw new Error("Incomplete live games");
    const games = validateGames(body.data);
    // Preserve final results from earlier days until the full catalog catches up.
    const combined = new Map(live.games.filter(game => game.date.slice(0, 10) >= formatNBADate(new Date(now - 7 * 86400000))).map(game => [game.id, game]));
    for (const game of games) combined.set(game.id, game);
    const updated = { syncedAt: new Date().toISOString(), attemptedAt: now, games: [...combined.values()] };
    await updateDocument<LiveSnapshot>("league-live.json", EMPTY_LIVE, current => current.attemptedAt > now ? current : updated);
    return updated;
  } catch (error) {
    if (!(error instanceof RefreshBusy)) console.error("League live refresh failed; retaining saved games");
    return live;
  }
}, ["league-live-v1"], { revalidate: 60 });

export async function fetchSavedGames(url: string): Promise<Response> {
  const target = new URL(url);
  const snapshot = await readSnapshot();
  let live: LiveSnapshot = EMPTY_LIVE;
  try { live = await readLive(); } catch { /* The saved catalog remains usable during a Redis outage. */ }
  const merged = new Map(snapshot.games.map(game => [game.id, game]));
  if (live.syncedAt > snapshot.syncedAt) for (const game of live.games) merged.set(game.id, game);
  const team = target.searchParams.get("team_ids[]");
  const season = target.searchParams.get("seasons[]");
  const dates = target.searchParams.getAll("dates[]");
  const start = target.searchParams.get("start_date"), end = target.searchParams.get("end_date");
  const data = [...merged.values()].filter(game => (!team || [game.home_team.id, game.visitor_team.id].includes(Number(team))) &&
    (!season || game.season === Number(season)) && (!dates.length || dates.includes(game.date.slice(0, 10))) &&
    (!start || game.date.slice(0, 10) >= start) && (!end || game.date.slice(0, 10) <= end));
  return Response.json({ data, syncedAt: snapshot.syncedAt, liveSyncedAt: live.syncedAt || null, season: getNBASeason() });
}
