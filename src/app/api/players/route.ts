import { NextRequest, NextResponse } from "next/server";
import { getTeamById } from "@/lib/teams";

interface ESPNPlayer {
  id: string; firstName: string; lastName: string; jersey?: string; displayHeight?: string; weight?: number;
  position?: { abbreviation: string }; college?: { name: string }; birthPlace?: { country: string };
  draft?: { year: number; round: number; selection: number };
}

export async function GET(req: NextRequest) {
  const team = getTeamById(Number(req.nextUrl.searchParams.get("teamId")));
  if (!team) return NextResponse.json({ players: [], error: "Valid teamId required" }, { status: 400 });
  try {
    const aliases: Record<string, string> = { NYK: "ny", GSW: "gs", NOP: "no", SAS: "sa", UTA: "utah", WAS: "wsh" };
    const abbreviation = aliases[team.abbreviation] ?? team.abbreviation.toLowerCase();
    const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${abbreviation}/roster`, {
      next: { revalidate: 86400 }, signal: AbortSignal.timeout(6000),
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
    return NextResponse.json({ players, source: "ESPN", error: null }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch {
    return NextResponse.json({ players: [], error: "Current roster unavailable" }, { status: 502 });
  }
}
