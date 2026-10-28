import { NextRequest, NextResponse } from "next/server";
import { formatNBADate, getNBASeason } from "@/lib/nbaDate";
import { getGameStartTime, isFinalStatus, isLiveStatus } from "@/lib/gameStatus";

const BDL_BASE = "https://api.balldontlie.io/v1";

interface BDLGame {
  id: number;
  date: string;
  status: string;
  datetime?: string | null;
  postponed?: boolean;
  home_team: { id: number; name: string; abbreviation: string };
  visitor_team: { id: number; name: string; abbreviation: string };
  home_team_score: number;
  visitor_team_score: number;
}

function spoilerFlags(req: NextRequest) {
  let queryScores = false;
  let queryHeadlines = false;
  for (const [key, value] of req.nextUrl.searchParams.entries()) {
    const name = key.toLowerCase();
    if (name !== "hidescores" && name !== "hideheadlines") continue;
    const normalized = value.trim().toLowerCase();
    if (normalized !== "1" && normalized !== "true") continue;
    if (name === "hidescores") queryScores = true;
    else queryHeadlines = true;
  }
  const tokens = (req.headers?.get?.("x-nba-spoilers") ?? "").split(/[,;]/).map((part) => part.trim().toLowerCase()).filter(Boolean);
  const known = new Set(["none", "scores", "headlines"]);
  const unknown = tokens.some((token) => !known.has(token));
  const explicitNone = tokens.length === 1 && tokens[0] === "none";
  let hideScores = true;
  let hideHeadlines = true;
  if (!unknown && explicitNone) {
    hideScores = false;
    hideHeadlines = false;
  } else if (!unknown && !tokens.includes("none") && tokens.some((token) => token === "scores" || token === "headlines")) {
    hideScores = tokens.includes("scores");
    hideHeadlines = tokens.includes("headlines");
  }
  if (queryScores) hideScores = true;
  if (queryHeadlines) hideHeadlines = true;
  return { hideScores, hideHeadlines };
}

function responseInit(status = 200) {
  return { status, headers: { Vary: "x-nba-spoilers", "Cache-Control": "private, no-store" } };
}

export async function GET(req: NextRequest) {
  const teamId = req.nextUrl.searchParams.get("teamId");
  if (!teamId) {
    return NextResponse.json({ error: "teamId required" }, responseInit(400));
  }

  const key = process.env.BALLDONTLIE_KEY || "";
  if (!key) {
    return NextResponse.json(
      { error: "API key not configured", lastGame: null, currentGame: null, nextGame: null, record: { wins: 0, losses: 0 } },
      responseInit(503)
    );
  }

  const season = getNBASeason();
  const url = `${BDL_BASE}/games?team_ids[]=${teamId}&seasons[]=${season}&per_page=100`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: key },
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      const status = res.status;
      return NextResponse.json(
        { error: `BallDontLie API returned ${status}`, lastGame: null, currentGame: null, nextGame: null, record: { wins: 0, losses: 0 } },
        responseInit(502)
      );
    }

    const json = await res.json();
    const games: BDLGame[] = json.data || [];
    const now = new Date();
    const today = formatNBADate(now);
    const tid = parseInt(teamId);

    // Process into GameInfo format
    const toInfo = (g: BDLGame) => {
      const isHome = g.home_team.id === tid;
      const teamScore = isHome ? g.home_team_score : g.visitor_team_score;
      const oppScore = isHome ? g.visitor_team_score : g.home_team_score;
      return {
        id: g.id,
        date: g.date,
        startTime: getGameStartTime(g),
        status: g.status,
        homeTeam: g.home_team,
        awayTeam: g.visitor_team,
        homeScore: g.home_team_score,
        awayScore: g.visitor_team_score,
        isHome,
        won: isFinalStatus(g.status) ? teamScore > oppScore : undefined,
      };
    };

    // Last game (most recent finished)
    const finished = games
      .filter((g) => isFinalStatus(g.status) && g.date.slice(0, 10) <= today)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastGame = finished.length > 0 ? toInfo(finished[0]) : null;

    const current = games
      .filter((g) => !g.postponed && isLiveStatus(g.status))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const currentGame = current.length > 0 ? toInfo(current[0]) : null;

    // Next game (soonest upcoming)
    const upcoming = games
      .filter((g) => !isFinalStatus(g.status) && !isLiveStatus(g.status) && !g.postponed &&
        !/^(postponed|cancell?ed)\b/i.test(g.status.trim()) && g.date.slice(0, 10) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const nextGame = upcoming.length > 0 ? toInfo(upcoming[0]) : null;

    // Record
    let wins = 0, losses = 0;
    for (const g of games) {
      if (!isFinalStatus(g.status)) continue;
      const isHome = g.home_team.id === tid;
      const ts = isHome ? g.home_team_score : g.visitor_team_score;
      const os = isHome ? g.visitor_team_score : g.home_team_score;
      if (ts > os) wins++;
      else losses++;
    }

    const reveal = req.nextUrl.searchParams.get("reveal");
    const hideScores = spoilerFlags(req).hideScores;
    const conceal = (game: ReturnType<typeof toInfo> | null) => {
      if (!game || !hideScores || reveal === String(game.id)) return game;
      if (!isFinalStatus(game.status) && !isLiveStatus(game.status)) return game;
      return { ...game, homeScore: null, awayScore: null, won: undefined, scoresRedacted: true };
    };
    return NextResponse.json({
      lastGame: conceal(lastGame), currentGame: conceal(currentGame), nextGame: conceal(nextGame),
      record: hideScores && reveal !== "record" ? { wins: 0, losses: 0, redacted: true } : { wins, losses },
      error: null,
    }, responseInit());
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch game data", lastGame: null, currentGame: null, nextGame: null, record: { wins: 0, losses: 0 } },
      responseInit(500)
    );
  }
}
