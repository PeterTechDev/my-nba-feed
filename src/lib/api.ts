export interface Game {
  id: number;
  date: string;
  status: string;
  home_team: { id: number; name: string; abbreviation: string };
  visitor_team: { id: number; name: string; abbreviation: string };
  home_team_score: number;
  visitor_team_score: number;
}

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

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

export interface TeamRecord {
  wins: number;
  losses: number;
}

const BDL_BASE = 'https://api.balldontlie.io/v1';

async function fetchGames(teamId: number): Promise<Game[]> {
  const key = process.env.NEXT_PUBLIC_BALLDONTLIE_KEY || '';
  const url = `${BDL_BASE}/games?team_ids[]=${teamId}&seasons[]=2025&per_page=100`;
  const res = await fetch(url, {
    headers: key ? { Authorization: key } : {},
    next: { revalidate: 300 },
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

function toGameInfo(game: Game, teamId: number): GameInfo {
  const isHome = game.home_team.id === teamId;
  const teamScore = isHome ? game.home_team_score : game.visitor_team_score;
  const oppScore = isHome ? game.visitor_team_score : game.home_team_score;
  const isFinished = game.status === 'Final';
  return {
    id: game.id,
    date: game.date,
    status: game.status,
    homeTeam: game.home_team,
    awayTeam: game.visitor_team,
    homeScore: game.home_team_score,
    awayScore: game.visitor_team_score,
    isHome,
    won: isFinished ? teamScore > oppScore : undefined,
  };
}

export async function getLastGame(teamId: number): Promise<GameInfo | null> {
  const games = await fetchGames(teamId);
  const now = new Date();
  const finished = games
    .filter(g => g.status === 'Final' && new Date(g.date) <= now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return finished.length > 0 ? toGameInfo(finished[0], teamId) : null;
}

export async function getNextGame(teamId: number): Promise<GameInfo | null> {
  const games = await fetchGames(teamId);
  const now = new Date();
  const upcoming = games
    .filter(g => g.status !== 'Final' && new Date(g.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return upcoming.length > 0 ? toGameInfo(upcoming[0], teamId) : null;
}

export async function getTeamStats(teamId: number): Promise<TeamRecord> {
  const games = await fetchGames(teamId);
  let wins = 0, losses = 0;
  for (const g of games) {
    if (g.status !== 'Final') continue;
    const isHome = g.home_team.id === teamId;
    const teamScore = isHome ? g.home_team_score : g.visitor_team_score;
    const oppScore = isHome ? g.visitor_team_score : g.home_team_score;
    if (teamScore > oppScore) wins++;
    else losses++;
  }
  return { wins, losses };
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
