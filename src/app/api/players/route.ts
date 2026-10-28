import { fetchBallDontLie } from "@/lib/ballDontLie";
import { NextRequest, NextResponse } from "next/server";
import { getTeamById } from "@/lib/teams";

interface BDLPlayer {
  id: number; first_name: string; last_name: string; position: string; jersey_number: string;
  height: string; weight: string; college: string; country: string;
  draft_year: number; draft_round: number; draft_number: number;
}
interface ESPNPlayer {
  id: string; firstName: string; lastName: string; jersey?: string; displayHeight?: string; weight?: number;
  position?: { abbreviation: string }; college?: { name: string }; birthPlace?: { country: string };
  draft?: { year: number; round: number; selection: number };
}

export async function GET(req: NextRequest) {
  const team = getTeamById(Number(req.nextUrl.searchParams.get("teamId")));
  if (!team) return NextResponse.json({ players: [], error: "Valid teamId required" }, { status: 400 });
  const key = process.env.BALLDONTLIE_KEY;
  if (key) {
    try {
      const response = await fetchBallDontLie(`https://api.balldontlie.io/v1/players/active?team_ids[]=${team.id}&per_page=100`, 3600);
      if (response.ok) {
        const json = await response.json();
        if (!Array.isArray(json.data) || json.meta?.next_cursor) throw new Error("Incomplete active roster");
        const players = (json.data as BDLPlayer[]).map((p) => ({
          id: p.id, firstName: p.first_name, lastName: p.last_name, position: p.position,
          jerseyNumber: p.jersey_number, height: p.height, weight: p.weight, college: p.college, country: p.country,
          draftYear: p.draft_year, draftRound: p.draft_round, draftNumber: p.draft_number,
        }));
        if (players.length) return NextResponse.json({ players, source: "BALLDONTLIE", error: null });
      }
    } catch {
      // The active-roster endpoint may be unavailable on the configured API plan.
    }
  }
  try {
    const aliases: Record<string, string> = { NYK: "ny", GSW: "gs", NOP: "no", SAS: "sa", UTA: "utah", WAS: "wsh" };
    const abbreviation = aliases[team.abbreviation] ?? team.abbreviation.toLowerCase();
    const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${abbreviation}/roster`, {
      next: { revalidate: 3600 }, signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) throw new Error("Roster unavailable");
    const json = await response.json();
    if (!Array.isArray(json.athletes)) throw new Error("Invalid roster");
    const players = (json.athletes as ESPNPlayer[]).map((p) => ({
      id: Number(p.id), firstName: p.firstName, lastName: p.lastName, position: p.position?.abbreviation ?? "",
      jerseyNumber: p.jersey ?? "", height: p.displayHeight ?? "", weight: p.weight ? String(p.weight) : "",
      college: p.college?.name ?? "", country: p.birthPlace?.country ?? "",
      draftYear: p.draft?.year ?? null, draftRound: p.draft?.round ?? null, draftNumber: p.draft?.selection ?? null,
    }));
    return NextResponse.json({ players, source: "ESPN", error: null });
  } catch {
    return NextResponse.json({ players: [], error: "Current roster unavailable" }, { status: 502 });
  }
}
