export interface StandingsRecord {
  wins: number;
  losses: number;
}

function winningPercentage(team: StandingsRecord): number {
  return team.wins / (team.wins + team.losses || 1);
}

/**
 * Conference order: higher PCT, then higher wins−losses (lower games behind
 * the leader of that PCT group), then more wins.
 */
export function compareStandings(a: StandingsRecord, b: StandingsRecord): number {
  const pctDelta = winningPercentage(b) - winningPercentage(a);
  if (pctDelta !== 0) return pctDelta;

  const marginDelta = b.wins - b.losses - (a.wins - a.losses);
  if (marginDelta !== 0) return marginDelta;

  return b.wins - a.wins;
}
