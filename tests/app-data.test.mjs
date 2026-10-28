import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

const require = createRequire(import.meta.url);
function load(file, globals = {}, imports = {}) {
  const source = readFileSync(new URL("../src/" + file, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const exports = {};
  const scope = { exports, require: (id) => imports[id] ?? (id.endsWith(".module.css") ? { default: new Proxy({}, { get: (_target, key) => key }) } : require(id)), Date, URL, AbortSignal, Response, Buffer, setTimeout, ...globals };
  vm.runInNewContext(code, scope);
  return { exports, code, scope };
}
const dates = load("lib/nbaDate.ts").exports;
const status = load("lib/gameStatus.ts").exports;
const teams = load("lib/teams.ts").exports;
const digest = load("lib/digest.ts").exports;
const api = load("lib/api.ts").exports;
const youtubeHighlights = load("lib/youtubeHighlights.ts").exports;
const newsTools = load("lib/news.ts", { Date: class extends Date { static now() { return Date.parse("2026-10-27T14:00:00Z"); } } }, { "./api": api, "./teams": teams }).exports;
const imports = {
  "next/server": { NextResponse: { json: (body, options) => ({ status: options?.status ?? 200, body }) } },
  "@/lib/nbaDate": dates, "@/lib/gameStatus": status, "@/lib/teams": teams, "@/lib/digest": digest, "@/lib/api": api,
  "@/lib/news": newsTools,
  "@/lib/youtubeHighlights": youtubeHighlights,
};

test("highlights read saved YouTube videos without calling YouTube, and authenticate publications", async () => {
  const now = new Date("2026-10-27T14:00:00Z");
  class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now.getTime(); } }
  const clip = { id: "DTNqMLNVBC8", date: "2026-10-26", awayTeamId: 5, homeTeamId: 2,
    title: "BULLS at CELTICS | FULL GAME HIGHLIGHTS | October 26, 2026", thumbnail: "https://i.ytimg.com/vi/DTNqMLNVBC8/hqdefault.jpg", duration: 600, retrievedAt: now.toISOString() };
  let state = { syncedAt: now.toISOString(), videos: [clip] }, unavailable = false, reads = 0;
  const route = load("app/api/highlights/route.ts", { Date: FixedDate, process: { env: { DIGEST_PUBLISH_TOKEN: "publisher" } },
    fetch: () => { throw new Error("A page read must never call YouTube"); } }, { ...imports,
    "@/lib/nbaDate": load("lib/nbaDate.ts", { Date: FixedDate }).exports,
    "@/lib/youtubeHighlights": load("lib/youtubeHighlights.ts", { Date: FixedDate }).exports,
    "@/lib/digestStorage": {
      readDigestDocument: async () => { reads++; if (unavailable) throw new Error("offline"); return state; },
      updateDigestDocument: async (_name, _empty, update) => { state = update(state); return state; },
    },
  }).exports;
  const get = (query = "teamId=2&dates=2026-10-26", token = "") => route.GET({ nextUrl: new URL("http://localhost/api/highlights?" + query), headers: new Headers({ authorization: `Bearer ${token}` }) });
  let result = await get();
  assert.equal(result.body.videos["2026-10-26"].url, "https://www.youtube.com/watch?v=DTNqMLNVBC8");
  assert.equal(result.body.videos["2026-10-26"].thumbnail, clip.thumbnail);
  assert.equal((await get("teamId=5&dates=2026-10-26")).body.videos["2026-10-26"].id, clip.id, "One saved game serves both teams");
  assert.equal(Object.keys((await get("teamId=14&dates=2026-10-26")).body.videos).length, 0);
  for (const invalid of ["", "teamId=999&dates=2026-10-26", "teamId=2&dates=2026-02-30", "teamId=2&dates=2026-10-28", "teamId=2&dates=2026-09-01", "teamId=2&dates=" + Array.from({ length: 16 }, (_, i) => `2026-10-${String(i + 1).padStart(2, "0")}`).join(",")]) {
    const before = reads;
    assert.equal((await get(invalid)).status, 400);
    assert.equal(reads, before, "Invalid requests never reach storage");
  }
  assert.equal((await get("sync=1")).status, 401);
  assert.equal((await get("sync=1", "publisher")).body.videos[0].id, clip.id);
  const post = (payload, token) => route.POST({ headers: new Headers({ authorization: `Bearer ${token}` }), text: async () => JSON.stringify(payload) });
  assert.equal((await post({}, "wrong")).status, 401);
  assert.equal((await post({ syncedAt: now.toISOString(), videos: [{ ...clip, id: "bad" }] }, "publisher")).status, 400);
  assert.equal((await post({ syncedAt: now.toISOString(), videos: [] }, "publisher")).status, 201);
  assert.equal(state.videos.length, 1, "An incremental sync preserves previously saved games");
  unavailable = true;
  result = await get();
  assert.equal(result.status, 503);
  assert.match(result.body.error, /storage unavailable/);
});

test("highlight thumbnails stay visible while scores respect spoiler settings", () => {
  let hideScores = true, hideHeadlines = true;
  const games = [{ id: 1, date: "2026-10-26", status: "Final", homeTeam: teams.getCeltics(), awayTeam: { name: "Bulls", abbreviation: "CHI" }, homeScore: 134, awayScore: 99 }];
  const video = { id: "DTNqMLNVBC8", thumbnail: "https://i.ytimg.com/vi/DTNqMLNVBC8/hqdefault.jpg", url: "https://www.youtube.com/watch?v=DTNqMLNVBC8", duration: 600 };
  const remote = { data: { videos: { "2026-10-26": video }, failedDates: [] }, loading: false, error: false, retry() {} };
  const mocked = { ...imports,
    "@/hooks/useTeam": { useTeam: () => ({ selectedTeam: teams.getCeltics() }) },
    "@/hooks/useRemoteData": { useRemoteData: (url) => url?.includes("/api/schedule") ? { data: { games }, loading: false, error: false, retry() {} } : remote },
    "@/components/SpoilerModeProvider": { useSpoilerContext: () => ({ hideScores, hideHeadlines }) },
    "@/components/TeamSelector": { default: () => null },
    "@/components/DataError": load("components/DataError.tsx").exports,
  };
  const Page = load("app/highlights/page.tsx", {}, mocked).exports.default;
  const render = () => renderToStaticMarkup(createElement(Page));
  for ([hideScores, hideHeadlines] of [[true, true], [false, true], [true, false]]) {
    const html = render();
    assert.match(html, /src="https:\/\/i.ytimg.com\/vi\/DTNqMLNVBC8\/hqdefault.jpg/);
    assert.match(html, /Play highlights vs Bulls/);
    assert.doesNotMatch(html, /Reveal video preview|Hide video preview|<iframe/);
    if (hideScores) assert.doesNotMatch(html, /134-99/);
    else assert.match(html, /134-99/);
  }
  hideScores = false; hideHeadlines = false;
  let html = render();
  assert.match(html, /src="https:\/\/i.ytimg.com\/vi\/DTNqMLNVBC8\/hqdefault.jpg/);
  assert.match(html, /href="https:\/\/www.youtube.com\/watch\?v=DTNqMLNVBC8/);
  assert.match(html, /Play highlights vs Bulls/);
  assert.doesNotMatch(html, /<iframe/);
  assert.match(html, /10:00/);
  assert.match(html, /134-99/);
  remote.data.videos = {};
  assert.match(render(), /Video not available yet/);
  assert.match(render(), /Search on YouTube/);
  remote.error = true;
  assert.match(render(), /Unable to load highlight videos/);
  assert.match(render(), /Try again/);
});

test("news selection is fresh, team-specific, deduplicated and newest first", () => {
  const item = (id, title, pubDate = "2026-10-27T12:00:00Z") => ({ title, source: "ESPN", safeTitle: "Protected", isSpoiler: false, category: "analysis", pubDate, link: `https://example.com/${id}` });
  for (const [title, team] of [["Sixers injury report", "76ers"], ["PHI starting lineup", "76ers"], ["Rip City preview", "Trail Blazers"], ["Boston Celtics news", "Celtics"]]) assert.equal(newsTools.isTeamNews(title, team), true);
  assert.equal(newsTools.isTeamNews("Knicks vs Pistons Injury Report", "76ers"), false);
  assert.equal(newsTools.isTeamNews("Heated debate about basketball", "Heat"), false);
  const old = item("old", "Celtics older story", "2026-10-26T10:00:00Z");
  const fresh = item("fresh", "Celtics fresh story", "2026-10-27T13:00:00Z");
  const input = [old, fresh, { ...fresh, link: fresh.link + "?utm_source=feed#top" }, item("stale", "Celtics stale", "2026-10-01"), item("future", "Celtics future", "2026-10-28"), item("invalid", "Celtics invalid", "invalid"), { ...fresh, link: "javascript:alert(1)" }];
  const ordered = newsTools.newestNews(input);
  assert.deepEqual(Array.from(ordered, (entry) => entry.link), [fresh.link, old.link]);
  assert.equal(input[0], old);
  assert.equal(newsTools.newsVisitBoundary(ordered, "2026-10-27T11:00:00Z"), 1);
  assert.equal(newsTools.newsVisitBoundary(ordered, "2026-10-27T14:00:00Z"), 0);
  assert.equal(newsTools.newsVisitBoundary(ordered, null), null);
  const feeds = { Celtics: { items: [old, fresh], error: false }, Lakers: { items: [fresh, item("lakers", "Lakers story")], error: false }, NBA: { items: [fresh, item("league", "League story")], error: false } };
  const selected = newsTools.selectHomepageNews(feeds, ["Celtics", "Lakers", "NBA"]);
  assert.equal(selected.Celtics.items.length, 2);
  assert.deepEqual(Array.from(selected.Lakers.items, (entry) => entry.link), ["https://example.com/lakers"]);
  assert.deepEqual(Array.from(selected.NBA.items, (entry) => entry.link), ["https://example.com/league"]);
  const briefing = newsTools.selectHomepageNews({ ...feeds, NBA: { items: [old], error: false } }, ["Celtics", "NBA"], "Celtics");
  assert.equal(briefing.Celtics.items.length, 1);
  assert.equal(briefing.NBA.items[0].link, old.link, "Articles omitted from the briefing remain eligible for league news");
});

test("related injury coverage is grouped without discarding reports or their chronology", () => {
  const titles = ["Thunder’s Jalen Williams has fractured leg, dislocated ankle and will need surgery", "Jalen Williams, Cason Wallace injured: What's next for the OKC Thunder?", "OKC's Jalen Williams (ankle), Cason Wallace (shoulder) to undergo surgery"];
  const items = titles.map((title, i) => ({ title, source: "ESPN", pubDate: `2026-10-27T${13 - i}:00:00Z`, link: `https://example.com/${i}`, category: "injury" }));
  const groups = newsTools.groupNews(items);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].title, titles[0]);
  assert.deepEqual(Array.from(groups[0].related, (entry) => entry.title), titles.slice(1));
  assert.equal(newsTools.groupNews([...items, { ...items[0], title: "Celtics Jaylen Brown cleared after wrist injury" }]).length, 2);
});

test("same-game analysis, highlights and reactions share a slot without merging other games", () => {
  const story = (title, i, category = "general") => ({ title, category, source: "ESPN", pubDate: `2026-10-27T${13 - i}:00:00Z`, link: `https://example.com/game-${i}` });
  const coverage = [
    story("The Warriors were at their best against Denver. But is it repeatable?", 0, "analysis"),
    story("HLs: GSW dominate Nuggets for first win of season", 1),
    story("Steve Kerr, Warriors players react to Golden State's first win of NBA season", 2),
  ];
  const contract = story("Warriors sign young center to a contract", 3, "transaction");
  const selected = newsTools.selectHomepageNews({ Warriors: { items: [...coverage, contract], error: false }, NBA: { items: coverage, error: false } }, ["Warriors", "NBA"]);
  assert.deepEqual(Array.from(selected.Warriors.items, (item) => item.title), [coverage[0].title, contract.title]);
  assert.deepEqual(Array.from(selected.Warriors.items[0].related, (item) => item.title), coverage.slice(1).map((item) => item.title));
  assert.equal(selected.NBA.items.length, 0, "Grouped reports stay excluded from later sections");
  const nextFeed = [
    story("Warriors’ first win of the season shows how they can get more", 0),
    story("Yaxel Lendeborg has 31 points, 12 rebounds as Warriors blow out Nuggets on road", 1),
    story("Postgame Warriors Talk: Draymond Green - 10/26/2026", 2, "recap"),
    story("Yaxel Lendeborg scores career-high 31 points in Warriors first win", 3),
    story("Denver Nuggets vs. Golden State Warriors - 1st Quarter Highlights", 4),
  ];
  assert.equal(newsTools.groupNews(nextFeed).length, 1, "Opponent-free summaries and interviews join the sole recent matchup");
  const ambiguous = [...coverage, story("Warriors beat Lakers for first win of season", 3)];
  assert.equal(newsTools.groupNews(ambiguous).length, 3, "Opponent-free reactions stay separate when two matchups are possible");
  assert.equal(newsTools.groupNews(ambiguous.toReversed()).length, 3);
  for (const other of [
    story("Warriors vs Denver Nuggets preview and predictions", 3, "analysis"),
    story("Warriors injury report after Denver Nuggets win", 3, "injury"),
    { ...coverage[1], pubDate: "2026-10-25T12:00:00Z" },
  ]) {
    assert.equal(newsTools.groupNews([...coverage, other]).length, 2, other.title);
    assert.equal(newsTools.groupNews([other, ...coverage.toReversed()]).length, 2, "Input order must not bridge different matchups");
  }
  assert.equal(newsTools.groupNews([story("Warriors were at their best against Los Angeles", 0), coverage[1]]).length, 2, "An ambiguous city cannot identify the opponent");
});

test("spoiler labels name hidden content in both complete and mixed states", () => {
  let settings;
  const NavBar = load("components/NavBar.tsx", {}, {
    "next/link": { default: "a" }, "next/navigation": { usePathname: () => "/" },
    "./Modal": { default: () => null }, "./FavoriteTeamsModal": { default: () => null },
    "@/hooks/useFavoriteTeams": { useFavoriteTeams: () => ({ favoriteTeamIds: [] }) },
    "./SpoilerModeProvider": { useSpoilerContext: () => settings },
  }).exports.default;
  for (const [hideScores, hideHeadlines, label, pressed] of [
    [true, true, "Spoilers hidden", "true"], [false, false, "Spoilers shown", "false"],
    [true, false, "Scores hidden", "mixed"], [false, true, "Headlines hidden", "mixed"],
  ]) {
    settings = { hideScores, hideHeadlines, spoilerFree: hideScores && hideHeadlines };
    const html = renderToStaticMarkup(createElement(NavBar));
    assert.ok(html.includes(label));
    assert.ok(html.includes(`aria-label="${label} by default.`));
    assert.ok(html.includes(`aria-pressed="${pressed}"`));
    assert.match(html, /aria-label="My NBA Feed home" aria-current="page"/);
    assert.doesNotMatch(html, /href="\/players"|>Home<|>Players</);
    assert.doesNotMatch(html, /Default on|Default off|Custom protection/);
  }
});

test("the roster is reachable beside the selected team", () => {
  let team = teams.getCeltics();
  const TeamHeader = load("components/TeamHeader.tsx", {}, {
    "next/link": { default: "a" },
    "@/hooks/useTeam": { useTeam: () => ({ selectedTeam: team }) },
    "@/lib/teams": teams,
    "./TeamSelector": { default: () => null },
    "./RecordBadge": { default: () => null },
  }).exports.default;
  for (const selected of [team, teams.teams.find((item) => item.name === "Lakers")]) {
    team = selected;
    const html = renderToStaticMarkup(createElement(TeamHeader));
    assert.match(html, new RegExp(`href="/players" aria-label="${team.name} players"`));
    assert.ok(html.includes(team.city) && html.includes(team.name));
  }
});

test("news API preserves partial feeds and rejects invalid teams and total source failures", async () => {
  const fixture = (title, id, date = "Tue, 27 Oct 2026 12:00:00 GMT") => `<item><title>${title}</title><source>ESPN</source><link>https://news.google.com/rss/articles/${id}</link><pubDate>${date}</pubDate></item>`;
  let offline = false;
  const route = load("app/api/news/route.ts", { fetch: async (url) => ({ ok: !offline && !decodeURIComponent(url).includes("Lakers"), text: async () => `<rss>${fixture("Knicks vs Pistons Injury Report", "irrelevant")}${fixture("Celtics won 118-107", "recap")}${fixture("Celtics trade out of Boston denied", "trade")}${fixture("Celtics promo code with a bonus", "promo")}${fixture("Celtics winless start", "winless")}</rss>` }) }, {
    ...imports, "@/lib/communityFeed": load("lib/communityFeed.ts").exports,
  }).exports;
  const request = (query) => ({ nextUrl: new URL("http://localhost/api/news?" + query) });
  const batch = await route.GET(request("teams=Celtics,Lakers"));
  assert.equal(batch.status, 200);
  assert.equal(batch.body.feeds.Lakers.error, true);
  assert.equal(batch.body.feeds.Celtics.items.length, 3);
  assert.equal(batch.body.feeds.Celtics.items.find((item) => item.category === "transaction").isSpoiler, false);
  assert.equal(batch.body.feeds.Celtics.items.find((item) => item.title.includes("won")).isSpoiler, true);
  assert.equal(batch.body.feeds.Celtics.items.find((item) => item.title.includes("winless")).isSpoiler, true);
  assert.ok(batch.body.feeds.Celtics.items.every((item) => !item.title.includes("promo")));
  assert.equal((await route.GET(request("teams=NotATeam"))).status, 400);
  offline = true;
  assert.equal((await route.GET(request("teams=Celtics,Lakers"))).status, 502);
});

test("homepage headline and score reveals are scoped and keep protected links inactive", () => {
  const settings = { hideHeadlines: true, hideScores: true };
  let states = [];
  const mocked = { ...imports, react: { ...require("react"), useState: () => [states.shift() ?? false, () => {}] },
    "./SpoilerModeProvider": { useSpoilerContext: () => settings },
    "@/hooks/useLastVisit": { useLastVisit: () => ({ ready: true, lastVisitAt: "2026-10-27T11:00:00Z" }) },
    "./DataError": load("components/DataError.tsx").exports,
  };
  const List = load("components/NewsList.tsx", {}, mocked).exports.default;
  const items = [1, 2].map((id) => ({ title: `Secret result ${id}`, safeTitle: "Protected result", source: "ESPN", isSpoiler: true, link: `https://example.com/${id}`, pubDate: `2026-10-27T${id === 1 ? 12 : 10}:00:00Z` }));
  items[0].related = [{ ...items[1], title: "Secret related result", link: "https://example.com/related" }];
  const render = () => renderToStaticMarkup(createElement(List, { news: items, loading: false, error: false, retry() {}, subject: "stories" }));
  let html = render();
  assert.doesNotMatch(html, /Secret result|href="https:\/\/example.com/);
  assert.match(html, /1 new story since your last visit/);
  assert.ok(html.indexOf("Earlier stories") > html.indexOf("Protected result"));
  states = [true, false];
  html = render();
  assert.match(html, /Secret result 1/);
  assert.doesNotMatch(html, /Secret result 2|href="https:\/\/example.com\/2"/);
  assert.match(html, /Headline revealed/);
  assert.match(html, /Related coverage \(1\)/);
  assert.doesNotMatch(html, /Secret related result|href="https:\/\/example.com\/related"/);
  const Score = load("components/ScoreReveal.tsx", {}, mocked).exports.default;
  states = [true, false];
  html = renderToStaticMarkup(createElement("div", null, createElement(Score, { scope: "celtics:1", label: "Celtics result" }, "134–99"), createElement(Score, { scope: "warriors:2", label: "Warriors result" }, "134–114")));
  assert.match(html, /134–99/);
  assert.doesNotMatch(html, /134–114/);
  assert.equal(settings.hideScores, true);
  assert.equal(settings.hideHeadlines, true);
});

test("news labels remove only publisher suffixes and report honest publication ages", () => {
  const item = { title: "Celtics update - ESPN", source: "ESPN", safeTitle: "Protected recap", isSpoiler: true };
  for (const separator of [" - ", " – ", " — "]) {
    assert.equal(api.getNewsTitle({ ...item, title: "Celtics update" + separator + "espn" }, false), "Celtics update");
  }
  assert.equal(api.getNewsTitle(item, true), "Protected recap");
  assert.equal(api.getNewsTitle({ ...item, title: "ESPN: Celtics update" }, false), "ESPN: Celtics update");
  assert.equal(api.getNewsTitle({ ...item, title: "Celtics update - ESPN2" }, false), "Celtics update - ESPN2");
  assert.equal(api.getNewsTitle({ ...item, source: "" }, false), item.title);
  const now = Date.parse("2026-10-27T14:00:00Z");
  assert.equal(api.formatNewsAge("2026-10-27T13:59:45Z", now), "Just published");
  assert.equal(api.formatNewsAge("2026-10-27T13:58:00Z", now), "2m ago");
  assert.equal(api.formatNewsAge("2026-10-27T05:00:00Z", now), "9h ago");
  assert.equal(api.formatNewsAge("2026-10-25T14:00:00Z", now), "2d ago");
  for (const value of ["", "invalid", "2026-10-28T14:00:00Z"]) {
    assert.equal(api.formatNewsAge(value, now), "Publication time unavailable");
  }
});

test("homepage keeps news optional after games and shows the focus-team lead only once", () => {
  const focus = teams.getCeltics();
  const other = teams.teams.find((team) => team.name === "Lakers");
  let favorites = [focus.id];
  let lastVisitAt = null;
  const story = (title) => ({ title: title + " - ESPN", safeTitle: "Protected recap", source: "ESPN",
    pubDate: "2026-10-27T05:00:00Z", link: "https://example.com/" + encodeURIComponent(title), isSpoiler: false });
  const news = ["Celtics lead", "Celtics second", "Celtics third", "Celtics fourth"].map(story);
  const state = { currentGame: null, lastGame: null, record: { wins: 2, losses: 1 }, loading: false, error: null,
    nextGame: { date: "2026-10-27", status: "Scheduled", isHome: true,
      homeTeam: focus, awayTeam: { name: "Nets", abbreviation: "BKN" }, homeScore: 0, awayScore: 0 } };
  const mocked = { ...imports,
    "next/link": { default: "a" },
    "@/lib/nbaDate": { ...dates, gameDaysAgo: () => 0 },
    "@/hooks/useFavoriteTeams": { useFavoriteTeams: () => ({ favoriteTeamIds: favorites }),
      useFavoriteTeamObjects: () => favorites.map((id) => teams.teams.find((team) => team.id === id)) },
    "@/hooks/useTeam": { useTeam: () => ({ selectedTeam: focus }) },
    "@/hooks/useGameData": { useGameData: () => state },
    "@/hooks/useLastVisit": { useLastVisit: () => ({ ready: true, lastVisitAt }) },
    "@/hooks/useRemoteData": { useRemoteData: (url) => ({ loading: false, error: false, retry: () => {},
      data: url.includes("/api/games") ? state : { feeds: Object.fromEntries(new URL(url, "http://localhost").searchParams.get("teams").split(",").map((name) => [name, { items: name === "Celtics" ? news : [story(name === "NBA" ? "League update" : "Lakers latest")], error: false }])) } }) },
    "./SpoilerModeProvider": { useSpoilerContext: () => ({ hideScores: true, hideHeadlines: true }) },
    "./DataError": load("components/DataError.tsx").exports,
  };
  mocked["./NewsList"] = load("components/NewsList.tsx", {}, mocked).exports;
  mocked["./ScoreReveal"] = load("components/ScoreReveal.tsx", {}, mocked).exports;
  for (const name of ["GameDayHero", "GameSection", "MorningBriefingCard", "PersonalizedFeed", "NewsFeed", "TopPlaysCard"]) {
    mocked["@/components/" + name] = load("components/" + name + ".tsx", {}, mocked).exports;
  }
  mocked["@/components/TeamHeader"] = { default: () => null };
  mocked["@/components/GameDataProvider"] = { default: ({ children }) => children };
  const Home = load("components/HomeFeed.tsx", {}, mocked).exports.default;
  let html = renderToStaticMarkup(createElement(Home));
  assert.match(html, /Your teams, latest news/);
  assert.doesNotMatch(html, /<details[^>]*\bopen(?:[=\s>])/);
  assert.equal(html.split("Celtics lead").length - 1, 1);
  assert.ok(html.indexOf("vs Nets") < html.indexOf("Celtics lead"));
  assert.ok(html.indexOf("Browse game highlights") < html.indexOf("Celtics lead"));
  assert.doesNotMatch(html, /Morning Briefing/);
  favorites = [focus.id, other.id];
  lastVisitAt = "2026-10-27T14:00:00Z";
  html = renderToStaticMarkup(createElement(Home));
  assert.equal(html.split("Article links open external sites and may contain spoilers.").length - 1, 2, "One warning covers followed news; another covers league news");
  assert.doesNotMatch(html, /No new stories since your last visit|Earlier stories/);
  lastVisitAt = "2026-10-27T04:00:00Z";
  assert.match(renderToStaticMarkup(createElement(Home)), /3 new stories since your last visit/);
  lastVisitAt = null;
  favorites = [other.id];
  html = renderToStaticMarkup(createElement(Home));
  assert.ok(html.indexOf("vs Nets") < html.indexOf("Lakers latest"));
  assert.equal(html.split("Celtics lead").length - 1, 1);
  assert.match(html, /Morning Briefing/);
  favorites = [];
  html = renderToStaticMarkup(createElement(Home));
  assert.match(html, /Celtics, latest news/);
  assert.equal(html.split("Celtics lead").length - 1, 1);
  assert.match(html, /Celtics second/);
  assert.match(html, /Celtics third/);
  assert.doesNotMatch(html, /Celtics fourth/);
});

test("last-game scores and outcome stay protected while highlights remain available", () => {
  let hideScores = true;
  const focus = teams.getCeltics();
  const mocked = { ...imports,
    "next/link": { default: "a" },
    "@/hooks/useTeam": { useTeam: () => ({ selectedTeam: focus }) },
    "@/hooks/useGameData": { useGameData: () => ({ loading: false, error: null,
      lastGame: { id: 77, date: "2026-10-26", isHome: false, homeTeam: { id: 5, name: "Bulls", abbreviation: "CHI" }, awayTeam: focus, homeScore: 99, awayScore: 134 } }) },
    "./SpoilerModeProvider": { useSpoilerContext: () => ({ hideScores, hideHeadlines: true }) },
  };
  mocked["./ScoreReveal"] = load("components/ScoreReveal.tsx", {}, mocked).exports;
  const LastGame = load("components/GameSection.tsx", {}, mocked).exports.LastGameCard;
  const render = () => renderToStaticMarkup(createElement(LastGame));
  assert.match(render(), /Reveal Celtics result/);
  assert.doesNotMatch(render(), />134<|>99<|>Win|>Loss/);
  assert.match(render(), /href="https:\/\/www.youtube.com\/results\?search_query=Celtics%20vs%20Bulls/);
  hideScores = false;
  assert.match(render(), />134</);
  assert.match(render(), />99</);
  assert.match(render(), />Win/);
});

test("homepage shows a matchup once, including live games that cross midnight", () => {
  const api = load("lib/api.ts").exports;
  const game = { date: "2026-10-27", startTime: "2026-10-27T23:30:00Z", isHome: true,
    homeTeam: { name: "Celtics", abbreviation: "BOS" }, awayTeam: { name: "Nets", abbreviation: "BKN" },
    status: "Scheduled", homeScore: 80, awayScore: 70 };
  const state = { currentGame: null, nextGame: game, loading: false, error: null };
  let daysAgo = 0;
  const mocked = { ...imports,
    "next/link": { default: "a" }, "@/lib/api": api,
    "@/lib/nbaDate": { ...dates, gameDaysAgo: () => daysAgo },
    "@/hooks/useGameData": { useGameData: () => state },
    "@/hooks/useTeam": { useTeam: () => ({ selectedTeam: teams.getCeltics() }) },
    "./SpoilerModeProvider": { useSpoilerContext: () => ({ hideScores: true, hideHeadlines: true }) },
    "./DataError": load("components/DataError.tsx").exports,
  };
  mocked["./ScoreReveal"] = load("components/ScoreReveal.tsx", {}, mocked).exports;
  const Hero = load("components/GameDayHero.tsx", {}, mocked).exports.default;
  const NextGame = load("components/GameSection.tsx", {}, mocked).exports.NextGameCard;
  assert.match(renderToStaticMarkup(Hero()), /vs Nets/);
  assert.equal(renderToStaticMarkup(NextGame()), "");
  daysAgo = -1;
  assert.equal(renderToStaticMarkup(Hero()), "");
  assert.match(renderToStaticMarkup(NextGame()), /vs Nets/);
  state.nextGame = { ...game, startTime: "2026-10-28T03:00:00Z" };
  assert.ok(renderToStaticMarkup(NextGame()).includes(dates.formatGameDate(state.nextGame.startTime, { weekday: "short", month: "short", day: "numeric" })), "The date and tipoff use the same local calendar day");
  daysAgo = 1;
  state.currentGame = { ...game, status: "4th Qtr" };
  state.nextGame = null;
  const live = renderToStaticMarkup(Hero());
  assert.match(live, /Live Now/);
  assert.match(live, /Reveal Celtics live score/);
  assert.doesNotMatch(live, /BOS 80/);
  assert.equal(renderToStaticMarkup(NextGame()), "");
  state.currentGame = null;
  assert.equal(renderToStaticMarkup(Hero()), "");
  assert.match(renderToStaticMarkup(NextGame()), /No upcoming game found/);
});

test("spoiler protection hides season records as well as scores", () => {
  let hideScores = true;
  const mocked = {
    "@/hooks/useGameData": { useGameData: () => ({ record: { wins: 3, losses: 1 }, loading: false, error: null }) },
    "@/hooks/useTeam": { useTeam: () => ({ selectedTeam: teams.getCeltics() }) },
    "./SpoilerModeProvider": { useSpoilerContext: () => ({ hideScores }) },
  };
  mocked["./ScoreReveal"] = load("components/ScoreReveal.tsx", {}, mocked).exports;
  const Record = load("components/RecordBadge.tsx", {}, mocked).exports.default;
  assert.match(renderToStaticMarkup(createElement(Record)), /Reveal record/);
  assert.doesNotMatch(renderToStaticMarkup(createElement(Record)), /3-1/);
  hideScores = false;
  assert.match(renderToStaticMarkup(Record()), /3-1/);
});

test("briefing preserves protected headlines and offers loading, empty and retry states", () => {
  const response = { data: [{ title: "Celtics win", safeTitle: "Celtics recap", isSpoiler: true,
    source: "NBA", link: "https://www.nba.com/news/recap" }], loading: false, error: false, retry: () => {} };
  let hideHeadlines = true;
  const mocked = {
    ...imports,
    "@/hooks/useRemoteData": { useRemoteData: () => response },
    "@/hooks/useTeam": { useTeam: () => ({ selectedTeam: teams.getCeltics() }) },
    "./SpoilerModeProvider": { useSpoilerContext: () => ({ hideHeadlines, hideScores: false }) },
    "@/hooks/useLastVisit": { useLastVisit: () => ({ ready: true, lastVisitAt: null }) },
    "./DataError": load("components/DataError.tsx").exports,
  };
  mocked["./NewsList"] = load("components/NewsList.tsx", {}, mocked).exports;
  const Briefing = load("components/MorningBriefingCard.tsx", {}, mocked).exports.default;
  const render = () => renderToStaticMarkup(createElement(Briefing, { news: response.data, loading: response.loading, error: response.error, retry: response.retry }));
  const protectedHtml = render();
  assert.match(protectedHtml, /Celtics recap/);
  assert.doesNotMatch(protectedHtml, /Celtics win/);
  assert.match(protectedHtml, /external sites and may contain spoilers/);
  assert.doesNotMatch(protectedHtml, /href="https:\/\/www.nba.com\/news\/recap"/);
  hideHeadlines = false;
  assert.match(render(), /Celtics win/);
  response.loading = true;
  assert.match(render(), /role="status"/);
  response.loading = false;
  response.data = [];
  assert.match(render(), /No recent Celtics stories/);
  response.error = true;
  assert.match(render(), /Try again/);
});

test("Markdown always terminates, preserves inline emphasis and escapes HTML", () => {
  const module = load("components/MarkdownContent.tsx");
  for (const content of ["**Celtics recap**", "*italic opening*", "#### Fourth-level heading", "-10 point differential", ">quote without space", "#", "*", "-", "Plain paragraph"]) {
    module.scope.content = content;
    const element = vm.runInNewContext("exports.default({ content })", module.scope, { timeout: 500 });
    assert.ok(renderToStaticMarkup(element).length > 0, content);
  }
  const html = renderToStaticMarkup(module.exports.default({ content: "**Bold**\n\n<script>alert(1)</script>" }));
  assert.match(html, /<strong[^>]*>Bold<\/strong>/);
  assert.ok(!html.includes("<script>"));
  const headings = renderToStaticMarkup(module.exports.default({ content: "# Recap\n\n#### Detail" }));
  assert.match(headings, /<h3[^>]*>Recap<\/h3>/);
  assert.match(headings, /<h4[^>]*>Detail<\/h4>/);
});

test("digest payload validation rejects malformed dates and nested content", () => {
  const body = { date: "2026-10-27", style: "analytical", title: "Daily recap", content: "A summary." };
  assert.equal(digest.parseDigest(body).title, body.title);
  for (const patch of [{ date: "2026-02-30" }, { title: {} }, { content: {} }, { games_covered: [1] }, { metadata: { model: "x", generation_time_ms: -1 } }]) {
    assert.throws(() => digest.parseDigest({ ...body, ...patch }));
  }
  assert.throws(() => digest.parseDigest(null));
});

test("all team identities and legacy preferences remain one-to-one", () => {
  assert.equal(new Set(teams.teams.map((team) => team.id)).size, 30);
  for (const [name, expected] of [["Pacers", 12], ["Heat", 16], ["Trail Blazers", 25], ["Clippers", 13], ["Suns", 24], ["Kings", 26], ["Grizzlies", 15], ["Spurs", 27]]) {
    assert.equal(teams.teams.find((team) => team.name === name).id, expected);
  }
  assert.equal(teams.migrateLegacyTeamId(15), 16);
  assert.equal(teams.migrateLegacyTeamId(16), 15);
  assert.equal(teams.migrateLegacyTeamId(2), 2);
  const colors = teams.teams.map((team) => teams.getChartColor(team.primaryColor));
  const luminance = (hex) => {
    const c = hex.match(/[a-f\d]{2}/gi).map((s) => parseInt(s, 16) / 255).map((v) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
  };
  for (const color of colors) assert.ok((luminance(color) + .05) / (luminance("#161616") + .05) >= 3);
});

test("saved focus teams migrate to bundled logos without changing team identity", () => {
  const { persist, createJSONStorage } = require("zustand/middleware");
  for (const version of [0, 1]) {
    const heat = teams.teams.find((team) => team.abbreviation === "MIA");
    const saved = new Map([["nba-feed-team", JSON.stringify({ version, state: {
      selectedTeam: { ...heat, id: version === 0 ? 15 : heat.id, logo: `https://cdn.nba.com/logos/nba/${heat.nbaComId}/primary/L/logo.svg` },
    } })]]);
    const storage = { getItem: (key) => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value), removeItem: (key) => saved.delete(key) };
    const { useTeam } = load("hooks/useTeam.ts", {}, {
      "@/lib/teams": teams,
      "zustand/middleware": { persist: (config, options) => persist(config, { ...options, storage: createJSONStorage(() => storage) }) },
    }).exports;
    assert.equal(useTeam.getState().selectedTeam, heat);
    assert.equal(useTeam.getState().selectedTeam.logo, `/teams/${heat.nbaComId}.svg`);
    assert.equal(JSON.parse(saved.get("nba-feed-team")).version, 2);
  }
});

test("Blob updates use origin ETags and retry conflicts without losing concurrent writes", async () => {
  const blobs = new Map();
  let version = 0;
  class Conflict extends Error {}
  const sdk = {
    BlobPreconditionFailedError: Conflict,
    BlobNotFoundError: class extends Error {},
    head: async (name) => blobs.has(name) ? { etag: blobs.get(name).etag } : null,
    get: async (name) => {
      const value = blobs.get(name);
      return value ? { statusCode: 200, stream: new Response(JSON.stringify(value.data)).body, blob: { etag: "delivery-" + value.etag } } : null;
    },
    put: async (name, body, options) => {
      const previous = blobs.get(name);
      if (options.ifMatch && previous?.etag !== options.ifMatch) throw new Conflict();
      if (options.allowOverwrite === false && previous) throw new Error("Already exists");
      blobs.set(name, { data: JSON.parse(body), etag: String(++version) });
    },
  };
  const store = load("lib/digestStorage.ts", { process: { env: { BLOB_STORE_ID: "fixture" } } }, { "@vercel/blob": sdk }).exports;
  await Promise.all([1, 2, 3].map(() => store.updateDigestDocument("votes.json", 0, (count) => count + 1)));
  assert.equal(await store.readDigestDocument("votes.json", 0), 3);
  sdk.put = async () => { throw new Error("Storage offline"); };
  await assert.rejects(store.updateDigestDocument("votes.json", 0, (count) => count + 1), /offline/);
  const missing = load("lib/digestStorage.ts", { process: { env: {} } }, { "@vercel/blob": sdk }).exports;
  await assert.rejects(missing.readDigestDocument("votes.json", []), /not configured/);
});

test("digest routes preserve reads, require publisher authentication and persist reactions", async () => {
  const data = new Map();
  const storage = {
    readDigestDocument: async (key, empty) => data.get(key) ?? empty,
    updateDigestDocument: async (key, empty, update) => { const value = update(data.get(key) ?? empty); data.set(key, value); return value; },
  };
  const route = load("app/api/digest/route.ts", { process: { env: { DIGEST_PUBLISH_TOKEN: "fixture-token" } } }, { ...imports, "@/lib/digestStorage": storage }).exports;
  const request = (body, auth) => ({ json: async () => body, headers: new Headers(auth ? { authorization: auth } : {}), nextUrl: new URL("http://localhost/api/digest") });
  const entry = { date: "2026-10-27", style: "casual", title: "Recap", content: "A summary." };
  assert.equal((await route.POST(request(entry))).status, 401);
  assert.equal((await route.POST(request(entry, "Bearer fixture-token"))).status, 201);
  assert.equal((await route.GET(request())).body.digest.title, "Recap");
  await route.POST(request({ ...entry, title: "Updated recap" }, "Bearer fixture-token"));
  assert.equal(data.get("digests.json").length, 1);
  const feedback = load("app/api/digest/feedback/route.ts", {}, { ...imports, "@/lib/digestStorage": storage }).exports;
  assert.equal((await feedback.POST(request({ date: entry.date, reaction: "fire" }))).status, 201);
  assert.equal((await feedback.GET()).body.feedback[0].fire, 1);
  assert.equal((await feedback.POST(request({ date: "2026-10-26", reaction: "fire" }))).status, 404);
  assert.equal((await feedback.POST(request({ date: entry.date, reaction: "invalid" }))).status, 400);
  storage.readDigestDocument = async () => { throw new Error("offline"); };
  assert.equal((await route.GET(request())).status, 503);
});

test("community Atom/RSS parsing decodes text and rejects unsafe links", () => {
  const { parseCommunityFeed } = load("lib/communityFeed.ts").exports;
  const atom = '<feed><entry><id>t3_1</id><title>Celtics &amp; Nets</title><link href="https://www.reddit.com/r/bostonceltics/comments/1/test/"/><updated>2026-10-27T10:00:00Z</updated><author><name>fan</name></author></entry></feed>';
  assert.equal(parseCommunityFeed(atom)[0].title, "Celtics & Nets");
  assert.equal(parseCommunityFeed(atom)[0].author, "fan");
  assert.equal(parseCommunityFeed(atom)[0].subreddit, "bostonceltics");
  assert.equal(parseCommunityFeed(atom)[0].publisher, "Reddit");
  assert.equal(parseCommunityFeed(atom)[0].indexed, false);
  assert.equal(parseCommunityFeed(atom.replace("https://www.reddit.com", "javascript:alert")).length, 0);
  const rss = '<rss><item><guid>id</guid><title><![CDATA[Fan discussion]]></title><link>https://news.google.com/rss/articles/test</link><pubDate>Tue, 27 Oct 2026 10:00:00 GMT</pubDate><source url="https://www.reddit.com">Reddit</source></item></rss>';
  assert.equal(parseCommunityFeed(rss)[0].title, "Fan discussion");
  assert.equal(parseCommunityFeed(rss)[0].publisher, "Reddit");
  assert.equal(parseCommunityFeed(rss)[0].subreddit, null);
  assert.equal(parseCommunityFeed(rss)[0].indexed, true);
  assert.equal(parseCommunityFeed(rss.replace('>Reddit</source>', '>Sports &amp; News</source>'))[0].publisher, "Sports & News");
  assert.equal(parseCommunityFeed(rss.replace(/<source.*?<\/source>/, ""))[0].publisher, null);
});

test("community API recovers with RSS or a labeled index and reports total outages", async () => {
  const atom = '<feed><entry><id>t3_1</id><title>Celtics fan discussion</title><link href="https://www.reddit.com/r/bostonceltics/comments/1/test/"/><updated>2026-10-27T10:00:00Z</updated></entry></feed>';
  const item = (id, title) => `<item><guid>${id}</guid><title>${title}</title><link>https://news.google.com/rss/articles/${id}</link><pubDate>Tue, 27 Oct 2026 10:00:00 GMT</pubDate><source url="https://www.reddit.com">Reddit</source></item>`;
  const rss = `<rss>${item("id", "Celtics discussion")}${item("unrelated", "Lakers discussion")}</rss>`;
  let mode = "rss";
  const fetch = async (url) => ({
    ok: mode === "rss" ? url.endsWith(".rss") : mode === "index" ? url.includes("news.google") : false,
    text: async () => url.includes("news.google") ? rss : atom,
  });
  const socialImports = { ...imports, "@/lib/reddit": { teamSubreddits: { Celtics: "bostonceltics" } },
    "@/lib/communityFeed": load("lib/communityFeed.ts").exports };
  const route = load("app/api/social/route.ts", { fetch, Date: class extends Date { static now() { return Date.parse("2026-10-27T14:00:00Z"); } } }, socialImports).exports;
  const request = { nextUrl: new URL("http://localhost/api/social?team=Celtics") };
  let result = await route.GET(request);
  assert.equal(result.body.source, "reddit");
  assert.equal(result.body.posts.length, 1);
  assert.equal(result.body.posts[0].score, null);
  assert.equal(result.body.posts[0].subreddit, "bostonceltics");
  mode = "index";
  result = await route.GET(request);
  assert.equal(result.body.source, "news-index");
  assert.equal(result.body.posts.length, 1);
  assert.equal(result.body.posts[0].subreddit, null);
  assert.equal(result.body.posts[0].publisher, "Reddit");
  assert.equal(result.body.posts[0].indexed, true);
  mode = "offline";
  assert.equal((await route.GET(request)).status, 502);
});

test("active roster uses the active endpoint, and ESPN fallback never returns historical search results", async () => {
  const urls = [];
  let failActive = false;
  const fetch = async (url) => {
    urls.push(url);
    if (url.includes("balldontlie")) return { ok: !failActive, json: async () => ({ data: [{ id: 1, first_name: "Active", last_name: "Player" }] }) };
    return { ok: true, json: async () => ({ athletes: [{ id: "4", firstName: "Current", lastName: "Player", jersey: "7", position: { abbreviation: "G" } }] }) };
  };
  const route = load("app/api/players/route.ts", { process: { env: { BALLDONTLIE_KEY: "fixture" } }, fetch }, imports).exports;
  const request = { nextUrl: new URL("http://localhost/api/players?teamId=16") };
  let result = await route.GET(request);
  assert.match(urls[0], /\/players\/active\?team_ids\[\]=16/);
  assert.equal(result.body.source, "BALLDONTLIE");
  failActive = true;
  result = await route.GET(request);
  assert.equal(result.body.source, "ESPN");
  assert.equal(result.body.players[0].firstName, "Current");
  assert.ok(urls.at(-1).includes("/teams/mia/roster"));
});

test("schedule preserves tipoff/postponement and comparison counts overtime finals", async () => {
  const home_team = { id: 2, name: "Celtics", abbreviation: "BOS" }, visitor_team = { id: 3, name: "Nets", abbreviation: "BKN" };
  let games = [{ id: 1, date: "2026-10-27", datetime: "2026-10-27T23:30:00Z", status: "Scheduled", postponed: true, home_team, visitor_team, home_team_score: 0, visitor_team_score: 0 }];
  const fetch = async () => ({ ok: true, json: async () => ({ data: games }) });
  const globals = { process: { env: { BALLDONTLIE_KEY: "fixture" } }, fetch };
  const schedule = load("app/api/schedule/route.ts", globals, imports).exports;
  const result = await schedule.GET({ nextUrl: new URL("http://localhost/api/schedule?teamId=2") });
  assert.equal(result.body.games[0].startTime, "2026-10-27T23:30:00.000Z");
  assert.equal(result.body.games[0].status, "Postponed");
  games = [{ ...games[0], postponed: false, status: "Final/OT", home_team_score: 118, visitor_team_score: 114 }];
  const compare = load("app/api/compare/route.ts", globals, imports).exports;
  const compared = await compare.GET({ nextUrl: new URL("http://localhost/api/compare?team1=2&team2=3") });
  assert.equal(compared.body.team1.wins, 1);
  assert.equal(compared.body.team1.gamesPlayed, 1);
  assert.equal(compared.body.headToHead.team1Wins, 1);
  const standings = load("app/api/standings/route.ts", globals, imports).exports;
  const table = await standings.GET();
  assert.equal(table.body.standings.find((team) => team.id === 2).wins, 1);
  assert.equal(table.body.season, dates.getNBASeason());
  assert.equal(table.body.asOf, dates.formatNBADate());
  assert.equal(compared.body.season, dates.getNBASeason());
});

test("standings and comparison omit all result content until scores are revealed", () => {
  let hideScores = true;
  const snapshot = { season: 2026, asOf: "2026-10-27", standings: [{ id: 2, name: "Boston Celtics", abbreviation: "BOS", conference: "East", wins: 17, losses: 9 }],
    team1: { wins: 17, losses: 9, gamesPlayed: 26, ppg: "111.3", oppg: "109.2" },
    team2: { wins: 14, losses: 11, gamesPlayed: 25, ppg: "107.2", oppg: "106.1" }, headToHead: { team1Wins: 2, team2Wins: 1 } };
  const remote = { data: snapshot, loading: false, error: false, retry() {} };
  const mocked = { ...imports,
    "@/hooks/useRemoteData": { useRemoteData: () => remote },
    "./SpoilerModeProvider": { useSpoilerContext: () => ({ hideScores }) },
    "@/components/DataError": load("components/DataError.tsx").exports,
  };
  mocked["@/components/SpoilerGuard"] = load("components/SpoilerGuard.tsx", {}, mocked).exports;
  const Standings = load("app/standings/page.tsx", {}, mocked).exports.default;
  const Compare = load("app/compare/page.tsx", {}, mocked).exports.default;
  const render = (Page) => renderToStaticMarkup(createElement(Page));
  assert.match(render(Standings), /Reveal standings/);
  assert.doesNotMatch(render(Standings), /<table|Playoff position|\.654/);
  assert.match(render(Compare), /Reveal comparison/);
  assert.doesNotMatch(render(Compare), /17-9|111\.3|Head-to-head|Points per game/);
  hideScores = false;
  assert.match(render(Standings), /<table/);
  assert.match(render(Standings), /\.654/);
  assert.match(render(Compare), /17-9/);
  assert.match(render(Compare), /26 completed games/);
  assert.match(render(Compare), /Lower is better/);
  hideScores = true;
  remote.error = true;
  assert.match(render(Standings), /Try again/);
  assert.match(render(Compare), /Try again/);
  remote.error = false;
  remote.loading = true;
  assert.match(render(Standings), /Loading standings/);
  assert.match(render(Compare), /Loading comparison/);
});

test("community recency beats category and engagement, with precise injury labels", async () => {
  const now = Date.parse("2026-10-27T14:00:00Z") / 1000;
  const post = (id, title, age) => ({ data: { id, title, created_utc: now - age, permalink: `/r/nba/comments/${id}/post/`, subreddit: "nba", score: id === "old" ? 10000 : 1, num_comments: 3, author: "fan" } });
  const children = [post("old", "Celtics injury report", 490 * 86400), post("week-old", "Celtics ruled out", 8 * 86400),
    post("injury", "Celtics player questionable with ankle injury", 3600), post("performance", "Celtics played hard out there", 1800),
    post("apron", "Celtics are out of the second apron", 900), post("thread", "Post game thread Celtics vs Nets", 300),
    post("future", "Celtics update", -600), post("boundary", "Celtics fan discussion", 7 * 86400)];
  const mocked = { ...imports, "@/lib/reddit": { teamSubreddits: { Celtics: "bostonceltics" } }, "@/lib/communityFeed": load("lib/communityFeed.ts").exports };
  let mode = "direct";
  const feed = "<rss>" + children.map(({ data: p }) => `<item><guid>${p.id}</guid><title>${p.title}</title><link>https://news.google.com/rss/articles/${p.id}</link><pubDate>${new Date(p.created_utc * 1000).toUTCString()}</pubDate></item>`).join("") + "</rss>";
  const route = load("app/api/social/route.ts", {
    Date: class extends Date { static now() { return now * 1000; } },
    fetch: async (url) => ({ ok: mode === "direct" || url.includes("news.google"),
      json: async () => ({ data: { children: url.includes("/r/nba/") ? children : [] } }), text: async () => feed }),
  }, mocked).exports;
  for (mode of ["direct", "index"]) {
    const result = await route.GET({ nextUrl: new URL("http://localhost/api/social?team=Celtics") });
    assert.equal(result.body.source, mode === "direct" ? "reddit" : "news-index");
    assert.deepEqual(Array.from(result.body.posts, (p) => p.id), ["thread", "apron", "performance", "injury", "boundary"]);
    const categories = Object.fromEntries(result.body.posts.map((p) => [p.id, p.category]));
    assert.equal(categories.injury, "injury");
    assert.equal(categories.thread, "postgame");
    assert.notEqual(categories.apron, "injury");
    assert.notEqual(categories.performance, "injury");
  }
});

test("protected social posts cannot open an external result before reveal", () => {
  let hideHeadlines = true;
  const mocked = { ...imports,
    "@/hooks/useTeam": { useTeam: () => ({ selectedTeam: teams.getCeltics() }) },
    "@/lib/reddit": { teamSubreddits: { Celtics: "bostonceltics" } },
    "@/components/TeamSelector": { default: () => null },
    "@/components/SpoilerModeProvider": { useSpoilerContext: () => ({ hideHeadlines }) },
    "@/components/DataError": load("components/DataError.tsx").exports,
    "@/hooks/useRemoteData": { useRemoteData: () => ({ data: { posts: [{ id: "secret", title: "Secret final score - Reddit", created: Date.now() / 1000, subreddit: "nba", category: "postgame", url: "https://reddit.com/secret", score: 100, comments: 5 }] }, loading: false }) },
  };
  const Social = load("app/social/page.tsx", {}, mocked).exports.default;
  let html = renderToStaticMarkup(createElement(Social));
  assert.doesNotMatch(html, /Secret final score|href="https:\/\/reddit.com\/secret"/);
  assert.match(html, /Reveal post and image/);
  hideHeadlines = false;
  html = renderToStaticMarkup(createElement(Social));
  assert.match(html, /Secret final score/);
  assert.match(html, /href="https:\/\/reddit.com\/secret"/);
});

test("indexed Social results preserve publishers without inventing subreddit filters", () => {
  let hideHeadlines = true;
  const post = { id: "indexed", title: "A complete Celtics discussion title with a long ending that stays readable on mobile - Reddit", created: Date.now() / 1000,
    subreddit: null, publisher: "Sports News", indexed: true, category: "general", url: "https://news.google.com/rss/articles/indexed", score: null, comments: null };
  const mocked = { ...imports,
    "@/hooks/useTeam": { useTeam: () => ({ selectedTeam: teams.getCeltics() }) },
    "@/lib/reddit": { teamSubreddits: { Celtics: "bostonceltics" } },
    "@/components/TeamSelector": { default: () => null },
    "@/components/SpoilerModeProvider": { useSpoilerContext: () => ({ hideHeadlines }) },
    "@/components/DataError": load("components/DataError.tsx").exports,
    "@/hooks/useRemoteData": { useRemoteData: () => ({ data: { posts: [post], source: "news-index" }, loading: false }) },
  };
  const Social = load("app/social/page.tsx", {}, mocked).exports.default;
  let html = renderToStaticMarkup(createElement(Social));
  assert.match(html, /Spoiler-protected indexed result/);
  assert.match(html, /Sports News/);
  assert.doesNotMatch(html, /r\/bostonceltics|r\/nba|r\/null|href="https:\/\/news.google.com/);
  hideHeadlines = false;
  html = renderToStaticMarkup(createElement(Social));
  assert.ok(html.includes(post.title));
  assert.doesNotMatch(html, /line-clamp/);
  assert.match(html, /Indexed result/);
});

test("digest presentation separates coverage, localizes old UTC prose and names safe source links", () => {
  const { getDigestPresentation } = load("lib/digestPresentation.ts", {}, imports).exports;
  const entry = { title: "NBA Morning Briefing: 2026-10-26", content: "## Next game\n\nBoston plays on 2026-10-27 at 23:30 UTC.\n\n## Sources\n\nLeague date: 2026-10-26. Retrieved 2026-10-27T11:00:00Z.\n\nESPN scoreboard: https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=20261026\n\nBoston next game: https://my-nba-feed.vercel.app/api/games?teamId=2" };
  const result = getDigestPresentation(entry);
  assert.equal(result.title, "NBA Morning Briefing");
  assert.equal(result.coverageDate, "2026-10-26");
  assert.match(result.content, new RegExp(dates.formatTipoff("2026-10-27T23:30:00Z")));
  assert.doesNotMatch(result.content, /Sources|Retrieved|23:30 UTC/);
  const Markdown = load("components/MarkdownContent.tsx").exports.default;
  const html = renderToStaticMarkup(Markdown({ content: result.sources + "\n\n[Unsafe](javascript:alert(1))\n\n<script>bad</script>" }));
  assert.match(html, /href="https:\/\/site.api.espn.com\/apis\/site\/v2\/sports\/basketball\/nba\/scoreboard\?dates=20261026"/);
  assert.match(html, />ESPN scoreboard<\/a>/);
  assert.match(html, />ESPN scoreboard<\/a><\/p><p[^>]*><a[^>]*>Boston next game<\/a>/);
  assert.doesNotMatch(html, /href="javascript:|<script>/);
  const readers = renderToStaticMarkup(Markdown({ content: result.readerSources }));
  assert.match(readers, /href="https:\/\/www.espn.com\/nba\/scoreboard\/_\/date\/20261026"/);
  assert.match(readers, /href="https:\/\/www.nba.com\/celtics\/schedule"/);
  assert.doesNotMatch(readers, /api\/games|site.api.espn.com/);
  for (const invalid of [
    entry.content.replaceAll("https://", "http://"),
    entry.content.replace("20261026", "20260230").replace("teamId=2", "teamId=14"),
    entry.content.replace("site.api.espn.com", "site.api.espn.com.evil.test").replace("my-nba-feed.vercel.app", "my-nba-feed.vercel.app.evil.test"),
  ]) assert.equal(getDigestPresentation({ ...entry, content: invalid }).readerSources, "");
  assert.equal(getDigestPresentation({ title: "Special edition", content: "No source section" }).title, "Special edition");
  assert.equal(getDigestPresentation({ ...entry, content: entry.content.replace("League date: 2026-10-26", "League date: 2026-02-30") }).coverageDate, null);
});
