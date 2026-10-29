import { fetchSavedGames as fetchBallDontLie } from "@/lib/leagueSnapshot";
import { NextRequest, NextResponse } from "next/server";
import { formatNBADate, getNBASeason } from "@/lib/nbaDate";
import { getGameStartTime } from "@/lib/gameStatus";
import { getTeamById } from "@/lib/teams";

const BDL_BASE = "https://api.balldontlie.io/v1";

interface BDLTeam {
  id: number;
  name: string;
  abbreviation: string;
}

interface BDLGame {
  id: number;
  date: string;
  status: string;
  datetime?: string | null;
  postponed?: boolean;
  home_team: BDLTeam;
  visitor_team: BDLTeam;
  home_team_score: number;
  visitor_team_score: number;
}

export async function GET(req: NextRequest) {
  const team = getTeamById(Number(req.nextUrl.searchParams.get("teamId")));
  const startDate = req.nextUrl.searchParams.get("start");
  const endDate = req.nextUrl.searchParams.get("end");

  if (!team) return NextResponse.json({ games: [], error: "Valid teamId required" }, { status: 400 });

  const key = process.env.BALLDONTLIE_KEY || "";
  if (!key) return NextResponse.json({ games: [], error: "API key not configured" }, { status: 503 });

  try {
    const season = getNBASeason();
    const defaultStart = `${season}-10-01`;
    const defaultEnd = formatNBADate();

    const start = startDate ?? defaultStart, end = endDate ?? defaultEnd;
    const validDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
    if (!validDate(start) || !validDate(end) || start > end || Date.parse(end) - Date.parse(start) > 366 * 86400000 || start < `${season - 1}-01-01` || end > `${season + 2}-12-31`) {
      return NextResponse.json({ games: [], error: "Valid dates and a range of at most 366 days required" }, { status: 400 });
    }
    const params = new URLSearchParams({ "team_ids[]": String(team.id), per_page: "100", start_date: start, end_date: end });
    const url = `${BDL_BASE}/games?${params}`;

    const res = await fetchBallDontLie(url);

    if (!res.ok) return NextResponse.json({ games: [], error: `API ${res.status}` }, { status: res.status === 429 ? 503 : 502, headers: { "Retry-After": res.headers?.get("retry-after") ?? "60" } });

    const json = await res.json();
    const games = ((json.data || []) as BDLGame[]).map((g) => ({
      id: g.id,
      date: g.date,
      startTime: getGameStartTime(g),
      status: g.postponed ? "Postponed" : g.status,
      homeTeam: { id: g.home_team.id, name: g.home_team.name, abbreviation: g.home_team.abbreviation },
      awayTeam: { id: g.visitor_team.id, name: g.visitor_team.name, abbreviation: g.visitor_team.abbreviation },
      homeScore: g.home_team_score,
      awayScore: g.visitor_team_score,
    }));

    return NextResponse.json({ games, syncedAt: json.syncedAt, error: null });
  } catch {
    return NextResponse.json({ games: [], error: "Failed to fetch" }, { status: 500 });
  }
}
