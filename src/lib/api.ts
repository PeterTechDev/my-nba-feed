export interface GameInfo {
  id: number;
  date: string;
  startTime?: string | null;
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
  currentGame: GameInfo | null;
  nextGame: GameInfo | null;
  record: TeamRecord;
  error: string | null;
}

export interface NewsItem {
  title: string;
  safeTitle: string;
  link: string;
  pubDate: string;
  source: string;
  isSpoiler: boolean;
  category: "injury" | "lineup" | "transaction" | "analysis" | "recap" | "general";
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
