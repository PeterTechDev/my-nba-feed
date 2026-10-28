export interface GameInfo {
  id: number;
  date: string;
  startTime?: string | null;
  status: string;
  homeTeam: { id: number; name: string; abbreviation: string };
  awayTeam: { id: number; name: string; abbreviation: string };
  homeScore: number | null;
  awayScore: number | null;
  isHome: boolean;
  won?: boolean;
  scoresRedacted?: boolean;
}

export interface TeamRecord {
  wins: number;
  losses: number;
  redacted?: boolean;
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
  link: string | null;
  pubDate: string;
  source: string;
  isSpoiler: boolean;
  category: "injury" | "lineup" | "transaction" | "analysis" | "recap" | "general";
  related?: NewsItem[];
  redacted?: boolean;
  identity?: string;
  feed?: string;
}

export type NewsFeeds = Record<string, { items: NewsItem[]; error: boolean; grouped?: boolean }>;

export interface HighlightVideo {
  id: string;
  thumbnail: string;
  url: string;
  duration: number | null;
}

export interface HighlightsResponse {
  videos: Record<string, HighlightVideo>;
  failedDates: string[];
}

export function getNewsTitle(item: NewsItem, hideHeadlines: boolean): string {
  const title = hideHeadlines && item.isSpoiler ? item.safeTitle : item.title;
  if (!item.source) return title;
  for (const separator of [" - ", " – ", " — "]) {
    const suffix = separator + item.source;
    if (title.toLowerCase().endsWith(suffix.toLowerCase())) return title.slice(0, -suffix.length).trimEnd();
  }
  return title;
}

export function formatNewsAge(pubDate: string, now = Date.now()): string {
  const published = Date.parse(pubDate);
  if (!Number.isFinite(published) || published > now) return "Publication time unavailable";
  const minutes = Math.floor((now - published) / 60000);
  if (minutes < 1) return "Just published";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

export function getHighlightUrl(team1: string, team2: string, date: string): string {
  const q = encodeURIComponent(`${team1} vs ${team2} ${date} NBA highlights`);
  return `https://www.youtube.com/results?search_query=${q}`;
}

export function getOpponent(game: GameInfo): { name: string; abbreviation: string } {
  return game.isHome ? game.awayTeam : game.homeTeam;
}

export function getTeamScore(game: GameInfo): number | null {
  return game.isHome ? game.homeScore : game.awayScore;
}

export function getOpponentScore(game: GameInfo): number | null {
  return game.isHome ? game.awayScore : game.homeScore;
}

export interface SpoilerPrefs {
  hideScores: boolean;
  hideHeadlines: boolean;
}

interface SpoilerBus {
  prefs: SpoilerPrefs;
  listeners: Set<() => void>;
}

interface GameOverlayBag {
  latest: Map<string, GamesResponse>;
  revealed: Map<string, GamesResponse>;
  listeners: Set<() => void>;
}

function spoilerBus(): SpoilerBus {
  const host = globalThis as typeof globalThis & { __nbaSpoilerBus?: SpoilerBus };
  if (!host.__nbaSpoilerBus) host.__nbaSpoilerBus = { prefs: { hideScores: true, hideHeadlines: true }, listeners: new Set() };
  return host.__nbaSpoilerBus;
}

function gamesBag(): GameOverlayBag {
  const host = globalThis as typeof globalThis & { __nbaGameOverlays?: GameOverlayBag };
  if (!host.__nbaGameOverlays) host.__nbaGameOverlays = { latest: new Map(), revealed: new Map(), listeners: new Set() };
  return host.__nbaGameOverlays;
}

export function setSpoilerPrefs(next: SpoilerPrefs) {
  const bus = spoilerBus();
  if (bus.prefs.hideScores === next.hideScores && bus.prefs.hideHeadlines === next.hideHeadlines) return;
  const hideScoresAgain = next.hideScores && !bus.prefs.hideScores;
  bus.prefs = { hideScores: next.hideScores, hideHeadlines: next.hideHeadlines };
  if (hideScoresAgain) gamesBag().revealed.clear();
  bus.listeners.forEach((listener) => listener());
  if (hideScoresAgain) gamesBag().listeners.forEach((listener) => listener());
}

export function spoilerHeaders(): Record<string, string> {
  const { hideScores, hideHeadlines } = spoilerBus().prefs;
  if (!hideScores && !hideHeadlines) return { "x-nba-spoilers": "none" };
  const parts = [hideScores ? "scores" : "", hideHeadlines ? "headlines" : ""].filter(Boolean);
  return { "x-nba-spoilers": parts.join(",") };
}

export function subscribeSpoilerPrefs(listener: () => void) {
  const bus = spoilerBus();
  bus.listeners.add(listener);
  return () => { bus.listeners.delete(listener); };
}

export function protectedSpoilerUrl(url: string) {
  const path = url.split("?")[0];
  return path === "/api/news" || path === "/api/games";
}

const refreshingScores = new Set<string>();

function looksLive(status: string) {
  return /qtr|quarter|halftime|\bot\b|overtime|live|progress/i.test(status);
}

function refreshRevealedGame(teamId: string, reveal: string) {
  const key = `${teamId}:${reveal}`;
  if (refreshingScores.has(key)) return;
  refreshingScores.add(key);
  const params = new URLSearchParams({ teamId, reveal });
  void fetch(`/api/games?${params}`, { headers: spoilerHeaders() }).then(async (response) => {
    if (!response.ok) return;
    const incoming = await response.json() as GamesResponse;
    if (!incoming || incoming.error) return;
    const bag = gamesBag();
    const base = bag.latest.get(teamId);
    if (!base || !bag.revealed.has(teamId)) return;
    bag.revealed.set(teamId, applyIncomingReveal(bag.revealed.get(teamId), incoming));
    bag.listeners.forEach((listener) => listener());
  }).catch(() => {
    // Keep the last revealed value; the next game poll retries this refresh.
  }).finally(() => { refreshingScores.delete(key); });
}

export function noteGames(teamId: string, data: GamesResponse | null) {
  if (!data) return;
  const bag = gamesBag();
  bag.latest.set(teamId, data);
  const overlay = bag.revealed.get(teamId);
  if (!overlay) return;
  if (data.record.redacted && !overlay.record.redacted) refreshRevealedGame(teamId, "record");
  for (const game of [data.currentGame, data.lastGame, data.nextGame]) {
    if (!game?.scoresRedacted) continue;
    const opened = openedGame(overlay, game.id);
    if (!opened) continue;
    if (opened.status !== game.status || looksLive(game.status)) refreshRevealedGame(teamId, String(game.id));
  }
}

export function revealedGameOverlay(teamId: string) {
  return gamesBag().revealed.get(teamId);
}

export function subscribeGameReveals(listener: () => void) {
  const bag = gamesBag();
  bag.listeners.add(listener);
  return () => { bag.listeners.delete(listener); };
}

function openedGame(extra: GamesResponse, id: number) {
  return [extra.lastGame, extra.currentGame, extra.nextGame].find((candidate) => candidate && candidate.id === id && !candidate.scoresRedacted);
}

function applyIncomingReveal(current: GamesResponse | undefined, incoming: GamesResponse): GamesResponse {
  if (!current) return incoming;
  const pick = (next: GameInfo | null, prev: GameInfo | null) => (next && !next.scoresRedacted ? next : prev ?? next);
  const record = incoming.record && !incoming.record.redacted ? incoming.record : current.record;
  return { ...incoming, lastGame: pick(incoming.lastGame, current.lastGame), currentGame: pick(incoming.currentGame, current.currentGame), nextGame: pick(incoming.nextGame, current.nextGame), record };
}

export function mergeGameReveal(base: GamesResponse, extra?: GamesResponse | null): GamesResponse {
  if (!extra) return base;
  const pick = (game: GameInfo | null) => {
    if (!game || !game.scoresRedacted) return game;
    const opened = openedGame(extra, game.id);
    if (!opened || opened.status !== game.status) return game;
    return opened;
  };
  const record = base.record?.redacted && extra.record && !extra.record.redacted ? extra.record : base.record;
  return { ...base, lastGame: pick(base.lastGame), currentGame: pick(base.currentGame), nextGame: pick(base.nextGame), record };
}

function parseGameScope(scope: string) {
  const live = /^live:(\d+):(\d+)$/.exec(scope);
  if (live) return { teamId: live[1], reveal: live[2], kind: "game" as const };
  const record = /^(\d+):record$/.exec(scope);
  if (record) return { teamId: record[1], reveal: "record", kind: "game" as const };
  const game = /^(\d+):(\d+)$/.exec(scope);
  if (game) return { teamId: game[1], reveal: game[2], kind: "game" as const };
  return null;
}

function needsScoreReveal(data: GamesResponse, reveal: string) {
  if (reveal === "record") return Boolean(data.record?.redacted);
  return [data.lastGame, data.currentGame, data.nextGame].some((game) => game && String(game.id) === reveal && game.scoresRedacted);
}

export function requestScoreReveal(scope: string): Promise<void> | null {
  const parsed = parseGameScope(scope);
  if (!parsed) return null;
  const bag = gamesBag();
  const base = bag.latest.get(parsed.teamId);
  if (!base || !needsScoreReveal(mergeGameReveal(base, bag.revealed.get(parsed.teamId)), parsed.reveal)) return null;
  const params = new URLSearchParams({ teamId: parsed.teamId, reveal: parsed.reveal, hideScores: "1" });
  return fetch(`/api/games?${params}`, { headers: spoilerHeaders() }).then(async (response) => {
    if (!response.ok) throw new Error("Score reveal failed");
    const incoming = await response.json() as GamesResponse;
    if (!incoming || incoming.error) throw new Error("Score reveal failed");
    bag.revealed.set(parsed.teamId, applyIncomingReveal(bag.revealed.get(parsed.teamId), incoming));
    bag.listeners.forEach((listener) => listener());
  });
}

export async function revealNewsItem(item: NewsItem): Promise<NewsItem | null> {
  if (!item.redacted || !item.feed) return null;
  const params = new URLSearchParams({ team: item.feed, reveal: item.identity || item.link || "" });
  const response = await fetch(`/api/news?${params}`, { headers: spoilerHeaders() });
  if (!response.ok) return null;
  const data = await response.json() as NewsItem[];
  if (!Array.isArray(data)) return null;
  const matches = (entry: NewsItem): NewsItem | null => {
    if (!entry.redacted && (entry.identity === item.identity || (item.link !== null && entry.link === item.link))) return entry;
    for (const related of entry.related ?? []) {
      const found = matches(related);
      if (found) return found;
    }
    return null;
  };
  for (const entry of data) {
    const found = matches(entry);
    if (found) return found;
  }
  return null;
}

(globalThis as typeof globalThis & { __nbaRequestScoreReveal?: typeof requestScoreReveal }).__nbaRequestScoreReveal = requestScoreReveal;
