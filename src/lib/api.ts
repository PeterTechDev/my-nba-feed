export interface GameInfo {
  id: number;
  date: string;
  status: string;
  homeTeam: { id: number; name: string; abbreviation: string };
  awayTeam: { id: number; name: string; abbreviation: string };
  homeScore: number;
  awayScore: number;
  isHome: boolean;
  won?: boolean;
}

export interface TeamRecord {
  wins: number;
  losses: number;
}

export interface GamesResponse {
  lastGame: GameInfo | null;
  nextGame: GameInfo | null;
  record: TeamRecord;
  error: string | null;
}

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

// Single fetch for all game data — server-side via API route
export async function fetchGameData(teamId: number): Promise<GamesResponse> {
  try {
    const res = await fetch(`/api/games?teamId=${teamId}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        lastGame: null,
        nextGame: null,
        record: { wins: 0, losses: 0 },
        error: data.error || `Failed to load (${res.status})`,
      };
    }
    return res.json();
  } catch {
    return {
      lastGame: null,
      nextGame: null,
      record: { wins: 0, losses: 0 },
      error: "Network error — check your connection",
    };
  }
}

export async function getNews(teamName: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(`/api/news?team=${encodeURIComponent(teamName)}`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export function getHighlightUrl(team1: string, team2: string, date: string): string {
  const q = encodeURIComponent(`${team1} vs ${team2} ${date} NBA highlights`);
  return `https://www.youtube.com/results?search_query=${q}`;
}

export function getOpponent(game: GameInfo): { name: string; abbreviation: string } {
  return game.isHome ? game.awayTeam : game.homeTeam;
}

export function getTeamScore(game: GameInfo): number {
  return game.isHome ? game.homeScore : game.awayScore;
}

export function getOpponentScore(game: GameInfo): number {
  return game.isHome ? game.awayScore : game.homeScore;
}
