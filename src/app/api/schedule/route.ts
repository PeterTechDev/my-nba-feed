import { NextRequest, NextResponse } from "next/server";

const BDL_BASE = "https://api.balldontlie.io/v1";

export async function GET(req: NextRequest) {
  const teamId = req.nextUrl.searchParams.get("teamId");
  const startDate = req.nextUrl.searchParams.get("start");
  const endDate = req.nextUrl.searchParams.get("end");

  if (!teamId) return NextResponse.json({ games: [], error: "teamId required" }, { status: 400 });

  const key = process.env.BALLDONTLIE_KEY || "";
  if (!key) return NextResponse.json({ games: [], error: "API key not configured" }, { status: 503 });

  try {
    let url = `${BDL_BASE}/games?team_ids[]=${teamId}&per_page=100`;
    if (startDate) url += `&start_date=${startDate}`;
    if (endDate) url += `&end_date=${endDate}`;

    const res = await fetch(url, {
      headers: { Authorization: key },
      next: { revalidate: 300 },
    });

    if (!res.ok) return NextResponse.json({ games: [], error: `API ${res.status}` }, { status: 502 });

    const json = await res.json();
    const games = (json.data || []).map((g: any) => ({
      id: g.id,
      date: g.date,
      status: g.status,
      homeTeam: { id: g.home_team.id, name: g.home_team.name, abbreviation: g.home_team.abbreviation },
      awayTeam: { id: g.visitor_team.id, name: g.visitor_team.name, abbreviation: g.visitor_team.abbreviation },
      homeScore: g.home_team_score,
      awayScore: g.visitor_team_score,
    }));

    return NextResponse.json({ games, error: null });
  } catch {
    return NextResponse.json({ games: [], error: "Failed to fetch" }, { status: 500 });
  }
}
