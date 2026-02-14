import { NextRequest, NextResponse } from "next/server";

const BDL_BASE = "https://api.balldontlie.io/v1";

function getCurrentSeason(): number {
  const now = new Date();
  return now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1;
}

function computeTeamStats(games: any[], teamId: number) {
  let wins = 0, losses = 0, totalPF = 0, totalPA = 0, count = 0;

  for (const g of games) {
    if (g.status !== "Final") continue;
    const isHome = g.home_team.id === teamId;
    const pf = isHome ? g.home_team_score : g.visitor_team_score;
    const pa = isHome ? g.visitor_team_score : g.home_team_score;
    totalPF += pf;
    totalPA += pa;
    count++;
    if (pf > pa) wins++; else losses++;
  }

  return {
    wins,
    losses,
    ppg: count > 0 ? (totalPF / count).toFixed(1) : "0.0",
    oppg: count > 0 ? (totalPA / count).toFixed(1) : "0.0",
    gamesPlayed: count,
  };
}

export async function GET(req: NextRequest) {
  const team1Id = req.nextUrl.searchParams.get("team1");
  const team2Id = req.nextUrl.searchParams.get("team2");

  if (!team1Id || !team2Id) return NextResponse.json({ error: "team1 and team2 required" }, { status: 400 });

  const key = process.env.BALLDONTLIE_KEY || "";
  if (!key) return NextResponse.json({ error: "API key not configured" }, { status: 503 });

  const season = getCurrentSeason();

  try {
    // Fetch games for both teams
    const [res1, res2] = await Promise.all([
      fetch(`${BDL_BASE}/games?team_ids[]=${team1Id}&seasons[]=${season}&per_page=100`, {
        headers: { Authorization: key }, next: { revalidate: 300 },
      }),
      fetch(`${BDL_BASE}/games?team_ids[]=${team2Id}&seasons[]=${season}&per_page=100`, {
        headers: { Authorization: key }, next: { revalidate: 300 },
      }),
    ]);

    if (!res1.ok || !res2.ok) return NextResponse.json({ error: "API error" }, { status: 502 });

    const [json1, json2] = await Promise.all([res1.json(), res2.json()]);
    const games1 = json1.data || [];
    const games2 = json2.data || [];

    const t1 = parseInt(team1Id);
    const t2 = parseInt(team2Id);

    const stats1 = computeTeamStats(games1, t1);
    const stats2 = computeTeamStats(games2, t2);

    // Head-to-head
    const h2h = games1.filter((g: any) =>
      g.status === "Final" && (g.home_team.id === t2 || g.visitor_team.id === t2)
    );

    let h2hTeam1Wins = 0, h2hTeam2Wins = 0;
    for (const g of h2h) {
      const isHome = g.home_team.id === t1;
      const t1Score = isHome ? g.home_team_score : g.visitor_team_score;
      const t2Score = isHome ? g.visitor_team_score : g.home_team_score;
      if (t1Score > t2Score) h2hTeam1Wins++; else h2hTeam2Wins++;
    }

    return NextResponse.json({
      team1: stats1,
      team2: stats2,
      headToHead: { team1Wins: h2hTeam1Wins, team2Wins: h2hTeam2Wins },
      error: null,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
