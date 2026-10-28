import { formatGameDate, formatTipoff } from "@/lib/nbaDate";
import { isDigestDate, type DigestEntry } from "@/lib/digest";

function mentionsTeam(line: string, team: { city: string; name: string; abbreviation: string }): boolean {
  const padded = ` ${line.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
  return [team.city, team.name, team.abbreviation].some((token) => {
    const words = token.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    return words.length > 1 && padded.includes(` ${words} `);
  });
}

// Drop the focus team from the league section only. The stored edition stays unchanged.
export function omitTeamFromLeagueSection(content: string, team: { city: string; name: string; abbreviation: string }): string {
  const lines = content.split("\n");
  const kept: string[] = [];
  const league: string[] = [];
  let inLeague = false;
  const flush = () => {
    if (league.some((line) => line.trim() && !/^#{1,6}\s/.test(line))) kept.push(...league);
    league.length = 0;
  };
  for (const line of lines) {
    const heading = /^#{1,6}[ \t]+(.+?)[ \t]*$/.exec(line);
    if (heading) {
      if (inLeague) flush();
      inLeague = /around the league/i.test(heading[1]);
      if (inLeague) league.push(line);
      else kept.push(line);
      continue;
    }
    if (!inLeague) kept.push(line);
    else if (!line.trim() || !mentionsTeam(line, team)) league.push(line);
  }
  if (inLeague) flush();
  return kept.join("\n");
}

export function getDigestPresentation(digest: DigestEntry) {
  const sourceHeading = /^#{1,6} +Sources\s*$/im.exec(digest.content);
  const body = sourceHeading ? digest.content.slice(0, sourceHeading.index).trim() : digest.content;
  const sourceText = sourceHeading ? digest.content.slice(sourceHeading.index + sourceHeading[0].length).trim() : "";
  const candidate = sourceText.match(/League date:\s*(\d{4}-\d{2}-\d{2})/i)?.[1];
  const coverageDate = isDigestDate(candidate) ? candidate : null;
  const title = coverageDate ? digest.title.replace(/^(NBA Morning Briefing):\s*\d{4}-\d{2}-\d{2}$/i, "$1") : digest.title;

  // Older editions store tipoffs in prose; keep these readable without rewriting the saved digest.
  const content = body.replace(/\b(\d{4}-\d{2}-\d{2})(?: at |[T ])(\d{2}:\d{2})(?::\d{2})?(?:\.\d+)?\s*(?:UTC|Z)\b/g,
    (original, date: string, time: string) => {
      const instant = `${date}T${time}:00Z`;
      if (!isDigestDate(date) || !Number.isFinite(Date.parse(instant))) return original;
      return `${formatGameDate(instant, { month: "short", day: "numeric", year: "numeric" })} at ${formatTipoff(instant)}`;
    });
  const sources = sourceText.replace(/^([^:\r\n]+):[ \t]*(https?:\/\/\S+)[ \t]*$/gm, "[$1]($2)");
  const readerSources = new Set<string>();
  for (const match of sourceText.matchAll(/https?:\/\/[^\s)]+/g)) {
    try {
      const url = new URL(match[0]);
      if (url.origin === "https://site.api.espn.com" && url.pathname === "/apis/site/v2/sports/basketball/nba/scoreboard") {
        const date = url.searchParams.get("dates") ?? "";
        const leagueDate = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
        if (/^\d{8}$/.test(date) && isDigestDate(leagueDate)) readerSources.add(`[ESPN NBA scoreboard — ${formatGameDate(leagueDate, { month: "short", day: "numeric", year: "numeric" })}](https://www.espn.com/nba/scoreboard/_/date/${date})`);
      }
      if (url.origin === "https://my-nba-feed.vercel.app" && url.pathname === "/api/games" && url.searchParams.get("teamId") === "2") {
        readerSources.add("[Boston Celtics schedule and results](https://www.nba.com/celtics/schedule)");
      }
    } catch { /* Keep malformed source URLs in the original edition details. */ }
  }
  return { title, content, sources, readerSources: [...readerSources].join("\n\n"), coverageDate };
}
