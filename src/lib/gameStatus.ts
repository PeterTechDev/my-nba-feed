export function isFinalStatus(status: string): boolean {
  return /^final\b/i.test(status.trim());
}

export function isLiveStatus(status: string): boolean {
  return /^(?:[1-4](?:st|nd|rd|th)\s+(?:qtr|quarter)|Q[1-4]|Halftime|End of (?:[1-4](?:st|nd|rd|th)|Q[1-4])|(?:\d+(?:st|nd|rd|th)?\s*)?(?:OT|Overtime)|In Progress|Live)\b/i.test(status.trim());
}

interface StandingsRecord {
  wins: number;
  losses: number;
}

function winningPercentage(team: StandingsRecord): number {
  return team.wins / (team.wins + team.losses || 1);
}

/** Higher PCT, then higher wins−losses, then more wins. */
export function compareStandings(a: StandingsRecord, b: StandingsRecord): number {
  const pctDelta = winningPercentage(b) - winningPercentage(a);
  if (pctDelta !== 0) return pctDelta;

  const marginDelta = b.wins - b.losses - (a.wins - a.losses);
  if (marginDelta !== 0) return marginDelta;

  return b.wins - a.wins;
}

export function getGameStartTime(game: { datetime?: string | null; status: string; date: string }): string | null {
  const value = [game.datetime, game.status, game.date].find(
    (value) => value && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value))
  );
  return value ? new Date(value).toISOString() : null;
}
