import { NextRequest, NextResponse } from "next/server";

const BDL_BASE = "https://api.balldontlie.io/v1";

interface BDLGame {
  id: number;
  date: string;
  status: string;
  home_team: { id: number; name: string; abbreviation: string };
  visitor_team: { id: number; name: string; abbreviation: string };
  home_team_score: number;
  visitor_team_score: number;
}

function getCurrentSeason(): number {
  const now = new Date();
  // NBA season spans Oct-Jun. If before October, it's previous year's season
  return now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1;
}

export async function GET(req: NextRequest) {
  const teamId = req.nextUrl.searchParams.get("teamId");
  if (!teamId) {
    return NextResponse.json({ error: "teamId required" }, { status: 400 });
  }

  const key = process.env.BALLDONTLIE_KEY || "";
  if (!key) {
    return NextResponse.json(
      { error: "API key not configured", lastGame: null, nextGame: null, record: { wins: 0, losses: 0 } },
      { status: 503 }
    );
  }

  const season = getCurrentSeason();
  const url = `${BDL_BASE}/games?team_ids[]=${teamId}&seasons[]=${season}&per_page=100`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: key },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      const status = res.status;
      return NextResponse.json(
        { error: `BallDontLie API returned ${status}`, lastGame: null, nextGame: null, record: { wins: 0, losses: 0 } },
        { status: 502 }
      );
    }

    const json = await res.json();
    const games: BDLGame[] = json.data || [];
    const now = new Date();
    const tid = parseInt(teamId);

    // Process into GameInfo format
    const toInfo = (g: BDLGame) => {
      const isHome = g.home_team.id === tid;
      const teamScore = isHome ? g.home_team_score : g.visitor_team_score;
      const oppScore = isHome ? g.visitor_team_score : g.home_team_score;
      return {
        id: g.id,
        date: g.date,
        status: g.status,
        homeTeam: g.home_team,
        awayTeam: g.visitor_team,
        homeScore: g.home_team_score,
        awayScore: g.visitor_team_score,
        isHome,
        won: g.status === "Final" ? teamScore > oppScore : undefined,
      };
    };

    // Last game (most recent finished)
    const finished = games
      .filter((g) => g.status === "Final" && new Date(g.date) <= now)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastGame = finished.length > 0 ? toInfo(finished[0]) : null;

    // Next game (soonest upcoming)
    const upcoming = games
      .filter((g) => g.status !== "Final" && new Date(g.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const nextGame = upcoming.length > 0 ? toInfo(upcoming[0]) : null;

    // Record
    let wins = 0, losses = 0;
    for (const g of games) {
      if (g.status !== "Final") continue;
      const isHome = g.home_team.id === tid;
      const ts = isHome ? g.home_team_score : g.visitor_team_score;
      const os = isHome ? g.visitor_team_score : g.home_team_score;
      if (ts > os) wins++;
      else losses++;
    }

    return NextResponse.json({ lastGame, nextGame, record: { wins, losses }, error: null });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to fetch game data", lastGame: null, nextGame: null, record: { wins: 0, losses: 0 } },
      { status: 500 }
    );
  }
}
