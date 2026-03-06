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
