import { NextResponse } from "next/server";

const BDL_BASE = "https://api.balldontlie.io/v1";

function getCurrentSeason(): number {
  const now = new Date();
  return now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1;
}

interface TeamRecord {
  id: number;
  name: string;
  abbreviation: string;
  conference: string;
  division: string;
  wins: number;
  losses: number;
}

export async function GET() {
  const key = process.env.BALLDONTLIE_KEY || "";
  if (!key) return NextResponse.json({ standings: [], error: "API key not configured" }, { status: 503 });

  const season = getCurrentSeason();

  try {
    // Fetch all games for the season (paginated)
    const allGames: any[] = [];
    let cursor: string | null = null;
    let page = 0;

    do {
      const fetchUrl: string = cursor
        ? `${BDL_BASE}/games?seasons[]=${season}&per_page=100&cursor=${cursor}`
        : `${BDL_BASE}/games?seasons[]=${season}&per_page=100`;

      const res = await fetch(fetchUrl, {
        headers: { Authorization: key },
        next: { revalidate: 600 },
      });

      if (!res.ok) return NextResponse.json({ standings: [], error: `API ${res.status}` }, { status: 502 });

      const json = await res.json();
      allGames.push(...(json.data || []));
      cursor = json.meta?.next_cursor || null;
      page++;
      if (page > 15) break; // safety limit
    } while (cursor);

    // Compute records
    const records: Record<number, TeamRecord> = {};

    for (const g of allGames) {
      if (g.status !== "Final") continue;

      const homeId = g.home_team.id;
      const awayId = g.visitor_team.id;

      if (!records[homeId]) {
        records[homeId] = {
          id: homeId,
          name: g.home_team.full_name || g.home_team.name,
          abbreviation: g.home_team.abbreviation,
          conference: g.home_team.conference,
          division: g.home_team.division,
          wins: 0,
          losses: 0,
        };
      }
      if (!records[awayId]) {
        records[awayId] = {
          id: awayId,
          name: g.visitor_team.full_name || g.visitor_team.name,
          abbreviation: g.visitor_team.abbreviation,
          conference: g.visitor_team.conference,
          division: g.visitor_team.division,
          wins: 0,
          losses: 0,
        };
      }

      if (g.home_team_score > g.visitor_team_score) {
        records[homeId].wins++;
        records[awayId].losses++;
      } else {
        records[awayId].wins++;
        records[homeId].losses++;
      }
    }

    const standings = Object.values(records).sort((a, b) => {
      const pctA = a.wins / (a.wins + a.losses || 1);
      const pctB = b.wins / (b.wins + b.losses || 1);
      return pctB - pctA;
    });

    return NextResponse.json({ standings, error: null });
  } catch {
    return NextResponse.json({ standings: [], error: "Failed to fetch" }, { status: 500 });
  }
}
