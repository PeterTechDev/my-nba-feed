import type { GameInfo } from "./api";

export type CalendarGame = Pick<GameInfo, "startTime" | "status" | "homeTeam" | "awayTeam">;

export function getGoogleCalendarUrl(game: CalendarGame, now = Date.now()): string | null {
  if (/^(final|live|in progress|postponed|cancell?ed)\b/i.test(game.status.trim())) return null;
  if (!game.startTime || !/T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(game.startTime)) return null;
  const start = Date.parse(game.startTime);
  if (!Number.isFinite(start) || start <= now) return null;
  // shortcut: games reserve three hours; use the actual end time if the feed supplies it.
  const end = start + 3 * 60 * 60 * 1000;
  const stamp = (time: number) => new Date(time).toISOString().replace(/[-:]|\.\d{3}/g, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `NBA: ${game.awayTeam.name} at ${game.homeTeam.name}`,
    dates: `${stamp(start)}/${stamp(end)}`,
    details: "Added from My NBA Feed. Duration estimated at 3 hours. Check the schedule before tipoff; this event does not update automatically.",
  });
  return `https://calendar.google.com/calendar/r/eventedit?${params}`;
}
