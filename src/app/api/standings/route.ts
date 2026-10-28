import { timingSafeEqual } from "node:crypto";
import { fetchBallDontLie } from "@/lib/ballDontLie";
import { readDigestDocument, updateDigestDocument } from "@/lib/digestStorage";
import { NextRequest, NextResponse } from "next/server";
import { formatNBADate, getNBASeason } from "@/lib/nbaDate";
import { compareStandings, isFinalStatus } from "@/lib/gameStatus";

const BDL_BASE = "https://api.balldontlie.io/v1";

interface TeamRecord {
  id: number;
  name: string;
  abbreviation: string;
  conference: string;
  division: string;
  wins: number;
  losses: number;
}

interface BDLTeam {
  id: number;
  name: string;
  full_name?: string;
  abbreviation: string;
  conference: string;
  division: string;
}

interface BDLGame {
  status: string;
  home_team: BDLTeam;
  visitor_team: BDLTeam;
  home_team_score: number;
  visitor_team_score: number;
}

interface BDLGamesResponse {
  data?: BDLGame[];
  meta?: {
    next_cursor?: string | null;
  };
}

interface Snapshot { standings: TeamRecord[]; season: number; asOf: string }
interface State { snapshot: Snapshot | null; progress: { season: number; asOf: string; cursor: string | null; games: BDLGame[]; pages: number } | null }
const DOCUMENT = "standings-cache.json";
const EMPTY: State = { snapshot: null, progress: null };

export async function GET() {
  try {
    const { snapshot } = await readDigestDocument<State>(DOCUMENT, EMPTY);
    if (!snapshot || snapshot.season !== getNBASeason()) return NextResponse.json({ standings: [], error: "Standings are being updated" }, { status: 503, headers: { "Retry-After": "60" } });
    return NextResponse.json({ ...snapshot, error: null });
  } catch {
    return NextResponse.json({ standings: [], error: "Standings storage unavailable" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const expected = process.env.DIGEST_PUBLISH_TOKEN;
  const supplied = req.headers.get("authorization")?.replace(/^Bearer /i, "") ?? "";
  if (!expected || Buffer.byteLength(expected) !== Buffer.byteLength(supplied) || !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const season = getNBASeason(), seasonEnd = formatNBADate();
    const state = await readDigestDocument<State>(DOCUMENT, EMPTY);
    const progress = state.progress?.season === season && state.progress.asOf === seasonEnd ? state.progress : { season, asOf: seasonEnd, cursor: null, games: [], pages: 0 };
    const params = new URLSearchParams({ "seasons[]": String(season), per_page: "100", start_date: `${season}-10-01`, end_date: seasonEnd });
    if (progress.cursor) params.set("cursor", progress.cursor);
    const response = await fetchBallDontLie(`${BDL_BASE}/games?${params}`, 3600);
    if (!response.ok) return NextResponse.json({ error: `API ${response.status}` }, { status: response.status === 429 ? 429 : 502, headers: { "Retry-After": response.headers.get("retry-after") ?? "60" } });
    const json: BDLGamesResponse = await response.json();
    if (!Array.isArray(json.data)) throw new Error("Invalid standings page");
    const allGames = [...progress.games, ...json.data];
    const cursor = json.meta?.next_cursor ? String(json.meta.next_cursor) : null;
    if (cursor && (cursor === progress.cursor || progress.pages >= 20)) throw new Error("Incomplete standings pagination");
    if (cursor) {
      await updateDigestDocument<State>(DOCUMENT, EMPTY, (current) => ({ ...current, progress: { season, asOf: seasonEnd, cursor, games: allGames, pages: progress.pages + 1 } }));
      return NextResponse.json({ complete: false }, { status: 202 });
    }

    // Compute records
    const records: Record<number, TeamRecord> = {};

    for (const g of allGames) {
      if (!isFinalStatus(g.status)) continue;

      const homeId = g.home_team.id;
      const awayId = g.visitor_team.id;

      if (!records[homeId]) {
        records[homeId] = {
          id: homeId,
          name: g.home_team.full_name || g.home_team.name,
          abbreviation: g.home_team.abbreviation,
          conference: g.home_team.conference,
          division: g.home_team.division,
          wins: 0,
          losses: 0,
        };
      }
      if (!records[awayId]) {
        records[awayId] = {
          id: awayId,
          name: g.visitor_team.full_name || g.visitor_team.name,
          abbreviation: g.visitor_team.abbreviation,
          conference: g.visitor_team.conference,
          division: g.visitor_team.division,
          wins: 0,
          losses: 0,
        };
      }

      if (g.home_team_score > g.visitor_team_score) {
        records[homeId].wins++;
        records[awayId].losses++;
      } else {
        records[awayId].wins++;
        records[homeId].losses++;
      }
    }

    const standings = Object.values(records).sort(compareStandings);

    await updateDigestDocument<State>(DOCUMENT, EMPTY, () => ({ snapshot: { standings, season, asOf: seasonEnd }, progress: null }));
    return NextResponse.json({ complete: true });
  } catch {
    return NextResponse.json({ standings: [], error: "Failed to fetch" }, { status: 500 });
  }
}
