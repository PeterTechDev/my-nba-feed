import { NextRequest, NextResponse } from "next/server";

const BDL_BASE = "https://api.balldontlie.io/v1";

function getCurrentSeason(): number {
  const now = new Date();
  return now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1;
}

function formatDateYYYYMMDD(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const teamId = req.nextUrl.searchParams.get("teamId");
  const startDate = req.nextUrl.searchParams.get("start");
  const endDate = req.nextUrl.searchParams.get("end");

  if (!teamId) return NextResponse.json({ games: [], error: "teamId required" }, { status: 400 });

  const key = process.env.BALLDONTLIE_KEY || "";
  if (!key) return NextResponse.json({ games: [], error: "API key not configured" }, { status: 503 });

  try {
    const season = getCurrentSeason();
    const defaultStart = `${season}-10-01`;
    const defaultEnd = formatDateYYYYMMDD(new Date());

    let url = `${BDL_BASE}/games?team_ids[]=${teamId}&per_page=100`;
    url += `&start_date=${startDate || defaultStart}`;
    url += `&end_date=${endDate || defaultEnd}`;

    let res = await fetch(url, {
      headers: { Authorization: key },
      next: { revalidate: 300 },
    });

    // smooth over BallDontLie burst limits
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after") || "0");
      const delayMs = retryAfter > 0 ? retryAfter * 1000 : 1000;
      await new Promise((r) => setTimeout(r, delayMs));
      res = await fetch(url, {
        headers: { Authorization: key },
        next: { revalidate: 300 },
      });
    }

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
