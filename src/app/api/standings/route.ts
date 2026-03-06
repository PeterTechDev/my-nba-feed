import { NextResponse } from "next/server";
import { formatNBADate, getNBASeason } from "@/lib/nbaDate";

const BDL_BASE = "https://api.balldontlie.io/v1";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
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

interface BDLTeam {
  id: number;
  name: string;
  full_name?: string;
  abbreviation: string;
  conference: string;
  division: string;
}

interface BDLGame {
  status: string;
  home_team: BDLTeam;
  visitor_team: BDLTeam;
  home_team_score: number;
  visitor_team_score: number;
}

interface BDLGamesResponse {
  data?: BDLGame[];
  meta?: {
    next_cursor?: string | null;
  };
}

export async function GET() {
  const key = process.env.BALLDONTLIE_KEY || "";
  if (!key) return NextResponse.json({ standings: [], error: "API key not configured" }, { status: 503 });

  const season = getNBASeason();

  try {
    // Fetch all games for the season (paginated).
    // NOTE: BallDontLie free tier can rate-limit (429) if we hammer it.
    // We keep requests sequential + add retry/backoff on 429.
    const allGames: BDLGame[] = [];
    let cursor: string | null = null;
    let page = 0;

    const seasonStart = `${season}-10-01`;
    const seasonEnd = formatNBADate();

    const fetchPage = async (url: string) => {
      let attempt = 0;
      // a few attempts is enough to smooth over burst limits
      while (attempt < 4) {
        const res = await fetch(url, {
          headers: { Authorization: key },
          next: { revalidate: 3600 },
        });

        if (res.status !== 429) return res;

        const retryAfter = Number(res.headers.get("retry-after") || "0");
        const delayMs = retryAfter > 0 ? retryAfter * 1000 : 750 * (attempt + 1);
        await sleep(delayMs);
        attempt++;
      }

      return fetch(url, {
        headers: { Authorization: key },
        next: { revalidate: 3600 },
      });
    };

    do {
      const baseParams = `seasons[]=${season}&per_page=100&start_date=${seasonStart}&end_date=${seasonEnd}`;
      const fetchUrl: string = cursor
        ? `${BDL_BASE}/games?${baseParams}&cursor=${cursor}`
        : `${BDL_BASE}/games?${baseParams}`;

      const res = await fetchPage(fetchUrl);
      if (!res.ok) return NextResponse.json({ standings: [], error: `API ${res.status}` }, { status: 502 });

      const json: BDLGamesResponse = await res.json();
      allGames.push(...(json.data || []));
      cursor = json.meta?.next_cursor || null;
      page++;

      // small pacing to avoid burst limits even when not returning 429
      await sleep(150);

      if (page > 20) break; // safety limit
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
