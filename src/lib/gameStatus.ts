export function isFinalStatus(status: string): boolean {
  return /^final\b/i.test(status.trim());
}

export function isLiveStatus(status: string): boolean {
  return /^(?:[1-4](?:st|nd|rd|th)\s+(?:qtr|quarter)|Q[1-4]|Halftime|End of (?:[1-4](?:st|nd|rd|th)|Q[1-4])|(?:\d+(?:st|nd|rd|th)?\s*)?(?:OT|Overtime)|In Progress|Live)\b/i.test(status.trim());
}

export function getGameStartTime(game: { datetime?: string | null; status: string; date: string }): string | null {
  const value = [game.datetime, game.status, game.date].find(
    (value) => value && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value))
  );
  return value ? new Date(value).toISOString() : null;
}
