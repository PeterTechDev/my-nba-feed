import { NextResponse } from "next/server";
import { formatNBADate } from "@/lib/nbaDate";

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
  period: number;
  time: string;
  home_team: BDLTeam;
  visitor_team: BDLTeam;
  home_team_score: number;
  visitor_team_score: number;
}

export async function GET() {
  const key = process.env.BALLDONTLIE_KEY || "";
  if (!key) return NextResponse.json({ games: [], error: "API key not configured" }, { status: 503 });

  const today = formatNBADate();

  try {
    const res = await fetch(`${BDL_BASE}/games?dates[]=${today}&per_page=100`, {
      headers: { Authorization: key },
      next: { revalidate: 30 },
    });

    if (!res.ok) return NextResponse.json({ games: [], error: `API ${res.status}` }, { status: 502 });

    const json = await res.json();
    const games = ((json.data || []) as BDLGame[]).map((g) => ({
      id: g.id,
      date: g.date,
      status: g.status,
      period: g.period,
      time: g.time,
      homeTeam: g.home_team,
      awayTeam: g.visitor_team,
      homeScore: g.home_team_score,
      awayScore: g.visitor_team_score,
    }));

    return NextResponse.json({ games, error: null });
  } catch {
    return NextResponse.json({ games: [], error: "Failed to fetch" }, { status: 500 });
  }
}
