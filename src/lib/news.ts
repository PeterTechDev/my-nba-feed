import { getNewsTitle, type NewsFeeds, type NewsItem } from "./api";
import { teams } from "./teams";

function words(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// shortcut: require a team or alias in the headline; add verified team tags for player-only stories.
export function isTeamNews(title: string, teamName: string): boolean {
  const team = teams.find((entry) => entry.name === teamName);
  if (!team) return teamName === "NBA";
  const aliases = [team.name, team.abbreviation, `${team.city} ${team.name}`];
  if (team.name === "76ers") aliases.push("Sixers");
  if (team.name === "Trail Blazers") aliases.push("Blazers", "Rip City");
  const text = ` ${words(title)} `;
  return aliases.some((alias) => text.includes(` ${words(alias)} `));
}

export function newsIdentity(item: NewsItem): string[] {
  const url = new URL(item.link);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith("utm_") || key === "oc") url.searchParams.delete(key);
  }
  return [url.href, words(getNewsTitle(item, false)) + ":" + new Date(item.pubDate).toISOString().slice(0, 10)];
}

export function newestNews(items: NewsItem[], now = Date.now()): NewsItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const published = Date.parse(item.pubDate);
    try { if (new URL(item.link).protocol !== "https:") return false; } catch { return false; }
    return item.title.trim() && Number.isFinite(published) && published <= now && published >= now - 7 * 86400000;
  }).sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate)).filter((item) => {
    const keys = newsIdentity(item);
    if (keys.some((key) => seen.has(key))) return false;
    keys.forEach((key) => seen.add(key));
    return true;
  });
}

const commonWords = new Set("the a an and or to of for in on at as is are has have his her with from will be its s vs nba report reports injury injuries update updates out ruled key".split(" "));
function relatedCoverage(a: NewsItem, b: NewsItem): boolean {
  if (a.category !== b.category || !["injury", "transaction", "recap"].includes(a.category)) return false;
  if (Math.abs(Date.parse(a.pubDate) - Date.parse(b.pubDate)) > 86400000) return false;
  const tokens = (item: NewsItem) => new Set(words(getNewsTitle(item, false)).split(" ").filter((word) => word.length > 1 && !commonWords.has(word)));
  const left = tokens(a), right = tokens(b);
  const shared = [...left].filter((word) => right.has(word)).length;
  return shared >= 3 && shared / Math.min(left.size, right.size) >= 0.4;
}

// Keep distinct reports accessible instead of discarding similar coverage.
export function groupNews(items: NewsItem[]): NewsItem[] {
  const groups: NewsItem[][] = [];
  for (const item of items) {
    const matches = groups.filter((group) => group.some((other) => relatedCoverage(item, other)));
    if (!matches.length) groups.push([item]);
    else {
      matches[0].push(item, ...matches.slice(1).flat());
      for (const match of matches.slice(1)) groups.splice(groups.indexOf(match), 1);
    }
  }
  return groups.map((group) => {
    const [first, ...related] = group.sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate));
    return { ...first, related };
  });
}

export function selectHomepageNews(feeds: NewsFeeds, order: string[], briefingTeam?: string): NewsFeeds {
  const seen = new Set<string>();
  return Object.fromEntries(order.map((name) => {
    const available = newestNews(feeds[name]?.items ?? []).filter((item) => !newsIdentity(item).some((key) => seen.has(key)));
    const items = groupNews(available).slice(0, name === "NBA" ? 6 : name === briefingTeam ? 1 : 3);
    for (const item of items.flatMap((item) => [item, ...(item.related ?? [])])) newsIdentity(item).forEach((key) => seen.add(key));
    return [name, { items, error: feeds[name]?.error ?? false }];
  }));
}

export function newsVisitBoundary(items: NewsItem[], lastVisitAt: string | null): number | null {
  const visited = Date.parse(lastVisitAt ?? "");
  if (!Number.isFinite(visited)) return null;
  return items.filter((item) => Date.parse(item.pubDate) > visited).length;
}
