import { NextRequest, NextResponse } from "next/server";

const BDL_BASE = "https://api.balldontlie.io/v1";

export async function GET(req: NextRequest) {
  const teamId = req.nextUrl.searchParams.get("teamId");
  if (!teamId) return NextResponse.json({ players: [], error: "teamId required" }, { status: 400 });

  const key = process.env.BALLDONTLIE_KEY || "";
  if (!key) return NextResponse.json({ players: [], error: "API key not configured" }, { status: 503 });

  try {
    // Fetch players for team
    const res = await fetch(`${BDL_BASE}/players?team_ids[]=${teamId}&per_page=100`, {
      headers: { Authorization: key },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return NextResponse.json({ players: [], error: `API ${res.status}` }, { status: 502 });

    const json = await res.json();
    const players = (json.data || []).map((p: any) => ({
      id: p.id,
      firstName: p.first_name,
      lastName: p.last_name,
      position: p.position,
      jerseyNumber: p.jersey_number,
      height: p.height,
      weight: p.weight,
      college: p.college,
      country: p.country,
      draftYear: p.draft_year,
      draftRound: p.draft_round,
      draftNumber: p.draft_number,
    }));

    return NextResponse.json({ players, error: null });
  } catch {
    return NextResponse.json({ players: [], error: "Failed to fetch" }, { status: 500 });
  }
}
