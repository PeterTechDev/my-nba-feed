import { CalendarPlus } from "lucide-react";
import { getGoogleCalendarUrl, type CalendarGame } from "@/lib/googleCalendar";

export default function GoogleCalendarLink({ game, compact = false }: { game: CalendarGame; compact?: boolean }) {
  const href = getGoogleCalendarUrl(game);
  if (!href) return null;
  const label = `Add ${game.awayTeam.name} at ${game.homeTeam.name} to Google Calendar (opens in a new tab)`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white ${compact ? "" : "px-3"}`}>
      <CalendarPlus aria-hidden="true" className="h-4 w-4 shrink-0" />
      {!compact && <span>Add to Google Calendar</span>}
    </a>
  );
}
