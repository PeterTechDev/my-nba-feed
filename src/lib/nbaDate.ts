const NBA_TIME_ZONE = "America/New_York";

interface NBADateParts {
  year: number;
  month: number;
  day: number;
}

function getNBADateParts(date: Date = new Date()): NBADateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: NBA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const getPart = (type: "year" | "month" | "day") =>
    Number(parts.find((part) => part.type === type)?.value || "0");

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
  };
}

export function formatNBADate(date: Date = new Date()): string {
  const { year, month, day } = getNBADateParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getNBASeason(date: Date = new Date()): number {
  const { year, month } = getNBADateParts(date);
  return month >= 10 ? year : year - 1;
}

export { NBA_TIME_ZONE };

export function parseGameDate(value: string): Date {
  // A league calendar date is not midnight UTC in the visitor's timezone.
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
}

export function gameDaysAgo(value: string, now: Date = new Date()): number {
  const easternNow = new Intl.DateTimeFormat("en-CA", {
    timeZone: NBA_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  const [year, month, day] = easternNow.split("-").map(Number);
  const [gameYear, gameMonth, gameDay] = value.slice(0, 10).split("-").map(Number);
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(gameYear, gameMonth - 1, gameDay)) / 86400000);
}

export function formatGameDate(value: string, options: Intl.DateTimeFormatOptions): string {
  return parseGameDate(value).toLocaleDateString("en-US", options);
}

export function formatTipoff(startTime?: string | null, status = ""): string {
  if (!startTime) return /\b(?:am|pm)\s+(?:ET|EST|EDT)\b/i.test(status) ? status : "Time TBD";
  return new Date(startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
}
