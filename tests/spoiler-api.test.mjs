import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = new URL("../", import.meta.url);

function load(file, globals = {}, imports = {}, extra = "") {
  const source = readFileSync(new URL("../src/" + file, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const exports = {};
  const sandbox = {
    exports,
    require: (id) => imports[id] ?? (id.endsWith(".module.css") ? { default: new Proxy({}, { get: (_target, key) => String(key) }) } : require(id)),
    Date, URL, URLSearchParams, AbortSignal, AbortController, Response, Headers, Buffer,
    setTimeout, clearTimeout, queueMicrotask, console, TextEncoder, TextDecoder,
    ...globals,
  };
  vm.runInNewContext(code + extra, sandbox);
  return { exports, sandbox };
}

function responseJson(body, options = {}) {
  return { status: options.status ?? 200, headers: { ...(options.headers ?? {}) }, body };
}

const server = { "next/server": { NextResponse: { json: responseJson } } };

function headerValue(headers) {
  if (!headers) return undefined;
  if (typeof headers.get === "function") return headers.get("x-nba-spoilers");
  return headers["x-nba-spoilers"];
}

function assertCache(result, where) {
  assert.equal(result.headers?.Vary, "x-nba-spoilers", where);
  assert.equal(result.headers?.["Cache-Control"], "private, no-store", where);
}

function newsStack(fetchImpl) {
  const teams = load("lib/teams.ts").exports;
  const api = load("lib/api.ts").exports;
  const newsTools = load("lib/news.ts", {}, { "./api": api, "./teams": teams }).exports;
  const route = load("app/api/news/route.ts", { fetch: fetchImpl }, {
    ...server,
    "@/lib/teams": teams,
    "@/lib/api": api,
    "@/lib/news": newsTools,
    "@/lib/communityFeed": load("lib/communityFeed.ts").exports,
  }).exports;
  return route;
}

function rss(items) {
  return `<rss>${items.map((item) => `<item><title>${item.title}</title><source>ESPN</source><link>${item.link}</link><pubDate>${item.pubDate}</pubDate></item>`).join("")}</rss>`;
}

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 3600 * 1000).toUTCString();
}

const beat = "Celtics beat Nets 118-107";
const highlights = "Celtics highlights against the Nets";
const injury = "Celtics injury report";
const beatUrl = "https://upstream.example/celtics/beat";
const highlightsUrl = "https://upstream.example/celtics/highlights";
const injuryUrl = "https://upstream.example/celtics/injury";

function newsFetch() {
  const items = [
    { title: beat, link: beatUrl, pubDate: hoursAgo(1) },
    { title: highlights, link: highlightsUrl, pubDate: hoursAgo(2) },
  ];
  return async () => ({ ok: true, text: async () => rss(items) });
}

function eachNews(body, visit) {
  const items = Array.isArray(body) ? body : body.feeds.Celtics.items;
  const walk = (item) => { visit(item); for (const related of item.related ?? []) walk(related); };
  items.forEach(walk);
}

function callNews(route, query, spoilers) {
  const headers = spoilers && typeof spoilers === "object"
    ? spoilers
    : (spoilers ? new Headers({ "x-nba-spoilers": spoilers }) : new Headers());
  return route.GET({ nextUrl: new URL("http://localhost/api/news?" + query), headers });
}

function bodyHas(result, raw) {
  return JSON.stringify(result?.body ?? result).includes(raw);
}

async function staysClosed(get, raw) {
  assert.equal(bodyHas(await get(undefined), raw), false, "header ausente");
  assert.equal(bodyHas(await get("open"), raw), false, "header inválido");
  let revealed = false;
  try {
    revealed = bodyHas(await get({ get() { throw new Error("unreadable"); } }), raw);
  } catch {
    revealed = false;
  }
  assert.equal(revealed, false, "erro ao ler o sinal");
}

function flatNews(body) {
  if (Array.isArray(body)) return body;
  return body.feeds.Celtics.items.flatMap((item) => [item, ...(item.related ?? [])]);
}

describe("contrato", () => {
test("news stays redacted until x-nba-spoilers is none", async () => {
  const route = newsStack(newsFetch());
  const closed = await callNews(route, "team=Celtics");
  assert.equal(closed.status, 200);
  assertCache(closed, "news closed");
  const hidden = flatNews(closed.body);
  const spoiler = hidden.find((item) => item.redacted && item.title === "Spoiler-protected headline from ESPN");
  assert.ok(spoiler, "closed news redacts the spoiler headline");
  assert.equal(spoiler.isSpoiler, true);
  assert.equal(hidden.every((item) => item.link === null), true);
  assert.equal(JSON.stringify(closed.body).includes("118-107"), false);
  assert.equal(JSON.stringify(closed.body).includes(beatUrl), false);
  assert.equal(JSON.stringify(closed.body).includes(highlightsUrl), false);
  const revealed = await callNews(route, "team=Celtics", "none");
  assert.equal(revealed.status, 200);
  assertCache(revealed, "news revealed");
  const open = revealed.body.find((item) => item.title === beat);
  assert.ok(open);
  assert.equal(open.isSpoiler, true);
  assert.equal(open.redacted, undefined);
  assert.equal(open.link, beatUrl);
  assert.equal(revealed.body.find((item) => item.title === highlights).link, highlightsUrl);
  assert.equal((await callNews(route, "team=NotATeam")).status, 400);
  assertCache(await callNews(route, "team=NotATeam"), "news 400");
  const semicolon = await callNews(route, "team=Celtics", "none;");
  assert.equal(semicolon.body.find((item) => item.title === beat).isSpoiler, true);
  await staysClosed((spoilers) => callNews(route, "team=Celtics", spoilers), "118-107");
});

test("grupo com um spoiler no related sai todo redigido sem header e inteiro com none", async () => {
  const route = newsStack(async () => ({ ok: true, text: async () => rss([
    { title: highlights, link: highlightsUrl, pubDate: hoursAgo(1) },
    { title: beat, link: beatUrl, pubDate: hoursAgo(2) },
    { title: injury, link: injuryUrl, pubDate: hoursAgo(3) },
  ]) }));
  const closed = await callNews(route, "team=Celtics");
  const top = closed.body;
  const group = top.find((item) => item.related?.length);
  const plain = top.find((item) => item.title === injury);
  assert.ok(group);
  assert.equal(group.isSpoiler, true);
  assert.equal(group.title, "Spoiler-protected headline from ESPN");
  assert.equal(group.link, null);
  assert.equal(group.related.length, 1);
  assert.equal(group.related[0].isSpoiler, true);
  assert.equal(group.related[0].title, "Spoiler-protected headline from ESPN");
  assert.equal(group.related[0].link, null);
  assert.equal(plain.link, injuryUrl);
  assert.equal(plain.isSpoiler, false);
  const closedJson = JSON.stringify(closed.body);
  assert.equal(closedJson.includes(highlightsUrl), false);
  assert.equal(closedJson.includes(beatUrl), false);
  assert.equal(closedJson.includes("118-107"), false);
  assert.equal(closedJson.includes("highlights against"), false);
  const revealed = await callNews(route, "team=Celtics", "none");
  const open = flatNews(revealed.body);
  assert.equal(open.find((item) => item.title === highlights).link, highlightsUrl);
  assert.equal(open.find((item) => item.title === beat).link, beatUrl);
  assert.equal(open.find((item) => item.title === injury).link, injuryUrl);
  const openedRelated = await callNews(route, `team=Celtics&reveal=${encodeURIComponent(beatUrl)}`);
  let openedBeat = null;
  let sealedParent = null;
  eachNews(openedRelated.body, (item) => {
    if (item.link === beatUrl) openedBeat = item;
    if (item.title === "Spoiler-protected headline from ESPN") sealedParent = item;
  });
  assert.equal(openedBeat.title, beat);
  assert.equal(openedBeat.redacted, undefined);
  assert.equal(sealedParent.link, null);
  assert.equal(JSON.stringify(openedRelated.body).includes(highlightsUrl), false);
  const openedParent = await callNews(route, `team=Celtics&reveal=${encodeURIComponent(highlightsUrl)}`);
  let openedHighlights = null;
  let sealedRelated = null;
  eachNews(openedParent.body, (item) => {
    if (item.link === highlightsUrl) openedHighlights = item;
    if (item.link === null && item.related === undefined) sealedRelated = item;
  });
  assert.equal(openedHighlights.title, highlights);
  assert.equal(openedHighlights.link, highlightsUrl);
  assert.equal(sealedRelated.link, null);
  assert.equal(JSON.stringify(openedParent.body).includes(beatUrl), false);
});

test("digest stays redacted until x-nba-spoilers is none", async () => {
  const stored = [{
    date: "2026-10-27", style: "casual", title: beat, content: "Boston won 118-107.",
    games_covered: ["BKN 107-118 BOS"], stats_highlighted: ["Tatum 40"],
    metadata: { model: "test", generation_time_ms: 1 }, created_at: "2026-10-27T00:00:00.000Z",
  }];
  const dates = load("lib/nbaDate.ts").exports;
  const digestLib = load("lib/digest.ts").exports;
  const route = load("app/api/digest/route.ts", {}, {
    ...server,
    "@/lib/digest": digestLib,
    "@/lib/nbaDate": dates,
    "@/lib/digestStorage": { readDigestDocument: async () => stored, updateDigestDocument: async () => stored },
  }).exports;
  const call = (spoilers, query = "date=2026-10-27") => route.GET({
    nextUrl: new URL("http://localhost/api/digest?" + query),
    headers: spoilers ? new Headers({ "x-nba-spoilers": spoilers }) : new Headers(),
  });
  const closed = await call();
  assert.equal(closed.status, 200);
  assertCache(closed, "digest closed");
  assert.equal(closed.body.digest.title, "NBA daily breakdown");
  assert.equal(closed.body.digest.redacted, true);
  assert.deepEqual(Array.from(closed.body.digest.games_covered), []);
  assert.equal(closed.body.digest.content.includes("118-107"), false);
  const revealed = await call("none");
  assertCache(revealed, "digest revealed");
  assert.equal(revealed.body.digest.title, beat);
  assert.equal(revealed.body.digest.redacted, undefined);
  assert.equal(revealed.body.digest.content, "Boston won 118-107.");
  assert.deepEqual(Array.from(revealed.body.digest.games_covered), ["BKN 107-118 BOS"]);
  assertCache(await call(undefined, "date=nope"), "digest 400");
  assert.equal((await call(undefined, "date=nope")).status, 400);
  await staysClosed((spoilers) => call(spoilers), "118-107");
});

test("games stay redacted until x-nba-spoilers is none", async () => {
  const dates = load("lib/nbaDate.ts").exports;
  const status = load("lib/gameStatus.ts").exports;
  const today = dates.formatNBADate();
  const shift = (iso, days) => {
    const [year, month, day] = iso.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
  };
  const home = { id: 2, name: "Celtics", abbreviation: "BOS" };
  const away = { id: 3, name: "Nets", abbreviation: "BKN" };
  const games = [
    { id: 11, date: shift(today, -1), status: "Final", home_team: home, visitor_team: away, home_team_score: 118, visitor_team_score: 107 },
    { id: 12, date: shift(today, 1), status: "7:30 pm ET", home_team: home, visitor_team: away, home_team_score: 0, visitor_team_score: 0 },
  ];
  const route = load("app/api/games/route.ts", {
    process: { env: { BALLDONTLIE_KEY: "fixture" } },
    fetch: async () => ({ ok: true, json: async () => ({ data: games }) }),
  }, { ...server, "@/lib/nbaDate": dates, "@/lib/gameStatus": status }).exports;
  const call = (spoilers, query = "teamId=2") => route.GET({
    nextUrl: new URL("http://localhost/api/games?" + query),
    headers: spoilers ? new Headers({ "x-nba-spoilers": spoilers }) : new Headers(),
  });
  const closed = await call();
  assert.equal(closed.status, 200);
  assertCache(closed, "games closed");
  assert.equal(closed.body.lastGame.homeScore, null);
  assert.equal(closed.body.lastGame.awayScore, null);
  assert.equal(closed.body.lastGame.scoresRedacted, true);
  assert.equal(closed.body.lastGame.won, undefined);
  assert.equal(closed.body.record.wins, 0);
  assert.equal(closed.body.record.losses, 0);
  assert.equal(closed.body.record.redacted, true);
  const react = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const { createElement } = react;
  const Badge = load("components/RecordBadge.tsx", {}, {
    react,
    "@/hooks/useGameData": { useGameData: () => ({ record: closed.body.record, loading: false, error: null }) },
    "@/hooks/useTeam": { useTeam: () => ({ selectedTeam: { id: 2, name: "Celtics" } }) },
    "./ScoreReveal": { default: ({ children }) => children },
  }).exports.default;
  const hiddenRecord = renderToStaticMarkup(createElement(Badge));
  assert.match(hiddenRecord, /Record hidden/);
  assert.doesNotMatch(hiddenRecord, /1-0|118/);
  const OpenBadge = load("components/RecordBadge.tsx", {}, {
    react,
    "@/hooks/useGameData": { useGameData: () => ({ record: { wins: 1, losses: 0 }, loading: false, error: null }) },
    "@/hooks/useTeam": { useTeam: () => ({ selectedTeam: { id: 2, name: "Celtics" } }) },
    "./ScoreReveal": { default: ({ children }) => children },
  }).exports.default;
  assert.doesNotMatch(renderToStaticMarkup(createElement(OpenBadge)), /Record hidden/);
  assert.equal(closed.body.nextGame.id, 12);
  assert.equal(closed.body.nextGame.scoresRedacted, undefined);
  assert.equal(JSON.stringify(closed.body).includes("118"), false);
  const revealed = await call("none");
  assertCache(revealed, "games revealed");
  assert.equal(revealed.body.lastGame.homeScore, 118);
  assert.equal(revealed.body.lastGame.awayScore, 107);
  assert.equal(revealed.body.lastGame.won, true);
  assert.equal(revealed.body.record.wins, 1);
  assert.equal(revealed.body.record.losses, 0);
  assert.equal(revealed.body.record.redacted, undefined);
  const missing = await call(undefined, "");
  assert.equal(missing.status, 400);
  assertCache(missing, "games 400");
  await staysClosed((spoilers) => call(spoilers), "118");
});

test("item redigido renderiza sem link", () => {
  const slots = [];
  let cursor = 0;
  const react = {
    Fragment: Symbol.for("react.fragment"),
    useState(init) {
      const index = cursor++;
      if (slots[index] === undefined) slots[index] = typeof init === "function" ? init() : init;
      return [slots[index], (value) => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
    },
    useReducer(reducer, init) {
      const index = cursor++;
      if (slots[index] === undefined) slots[index] = init;
      return [slots[index], (action) => { slots[index] = reducer(slots[index], action); }];
    },
    useRef(init) {
      const index = cursor++;
      if (slots[index] === undefined) slots[index] = { current: init };
      return slots[index];
    },
    useEffect() {},
  };
  const Story = load("components/NewsList.tsx", {}, {
    react,
    "lucide-react": { ExternalLink: () => null },
    "@/lib/api": load("lib/api.ts").exports,
    "@/lib/news": { newsVisitBoundary: () => null },
    "@/hooks/useLastVisit": { useLastVisit: () => ({ ready: true, lastVisitAt: null }) },
    "./SpoilerModeProvider": { useSpoilerContext: () => ({ hideHeadlines: true, hideScores: true }) },
    "./DataError": { default: () => null },
  }, "\nexports.NewsStory = NewsStory;\n").exports.NewsStory;
  const tree = Story({
    item: {
      title: "Spoiler-protected headline from ESPN", safeTitle: "Spoiler-protected headline from ESPN",
      link: "https://example.com/secret", pubDate: new Date().toISOString(), source: "ESPN",
      isSpoiler: true, redacted: true, category: "general",
    },
  });
  const anchors = [];
  const walk = (node) => {
    if (node == null || typeof node !== "object") return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.type === "a") anchors.push(node.props?.href ?? "");
    walk(node.props?.children);
  };
  walk(tree);
  assert.equal(anchors.length, 0);
});

test("mudar só os related atualiza a renderização", () => {
  const slots = [];
  let cursor = 0;
  const react = {
    Fragment: Symbol.for("react.fragment"),
    useState(init) {
      const index = cursor++;
      if (slots[index] === undefined) slots[index] = typeof init === "function" ? init() : init;
      return [slots[index], (value) => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
    },
    useReducer(reducer, init) {
      const index = cursor++;
      if (slots[index] === undefined) slots[index] = init;
      return [slots[index], (action) => { slots[index] = reducer(slots[index], action); }];
    },
    useRef(init) {
      const index = cursor++;
      if (slots[index] === undefined) slots[index] = { current: init };
      return slots[index];
    },
    useEffect(fn, deps) {
      const index = cursor++;
      const previous = slots[index];
      const changed = !previous || !deps || deps.some((dep, index) => !Object.is(dep, previous.deps[index]));
      slots[index] = { deps, fn: changed ? fn : null };
    },
  };
  const Story = load("components/NewsList.tsx", {}, {
    react,
    "lucide-react": { ExternalLink: () => null },
    "@/lib/api": load("lib/api.ts").exports,
    "@/lib/news": { newsVisitBoundary: () => null },
    "@/hooks/useLastVisit": { useLastVisit: () => ({ ready: true, lastVisitAt: null }) },
    "./SpoilerModeProvider": { useSpoilerContext: () => ({ hideHeadlines: true, hideScores: true }) },
    "./DataError": { default: () => null },
  }, "\nexports.NewsStory = NewsStory;\n").exports.NewsStory;
  const related = {
    title: "Old related", safeTitle: "Old related", link: "https://example.com/rel",
    pubDate: new Date().toISOString(), source: "ESPN", isSpoiler: false, category: "general",
  };
  const parent = {
    title: highlights, safeTitle: highlights, link: "https://example.com/parent",
    pubDate: new Date().toISOString(), source: "ESPN", isSpoiler: false, category: "general", related: [related],
  };
  const flush = () => {
    for (const slot of slots) {
      if (slot && slot.fn) { const fn = slot.fn; slot.fn = null; fn(); }
    }
  };
  const render = (item) => { cursor = 0; return Story({ item }); };
  const nestedTitle = (tree) => {
    let title;
    const walk = (node) => {
      if (node == null || typeof node !== "object") return;
      if (Array.isArray(node)) { node.forEach(walk); return; }
      if (node.type === Story && node.props?.item) title = node.props.item.title;
      walk(node.props?.children);
    };
    walk(tree);
    return title;
  };
  render(parent);
  flush();
  const next = { ...parent, related: [{ ...related, title: "New related only", safeTitle: "New related only" }] };
  render(next);
  flush();
  assert.equal(nestedTitle(render(next)), "New related only");
});
});

function walkClient(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name === "api" && dir.endsWith(`${join("src", "app")}`)) continue;
      walkClient(path, out);
    } else if (/\.tsx?$/.test(name)) out.push(path);
  }
  return out;
}

function lineOf(source, index) {
  return source.slice(0, index).split("\n").length;
}

function clientSpoilerCalls() {
  const calls = [];
  for (const path of walkClient(fileURLToPath(new URL("../src/", import.meta.url)))) {
    const source = readFileSync(path, "utf8");
    const file = relative(fileURLToPath(root), path).replaceAll("\\", "/");
    const pattern = /\/api\/(?:news|digest|games)\b/g;
    for (const match of source.matchAll(pattern)) {
      const after = source.slice(match.index + match[0].length, match.index + match[0].length + 12);
      if (match[0] === "/api/digest" && after.startsWith("/feedback")) continue;
      if (match[0] === "/api/games" && after.startsWith("/live")) continue;
      const before = source.slice(Math.max(0, match.index - 500), match.index);
      const around = before + source.slice(match.index, match.index + match[0].length + 160);
      const line = lineOf(source, match.index);
      const remoteAt = before.lastIndexOf("useRemoteData");
      const fetchAt = before.lastIndexOf("fetch");
      let kind = "mention";
      if (remoteAt !== -1 && remoteAt > fetchAt) kind = "useRemoteData";
      else if (fetchAt !== -1 && /fetch\s*\(/.test(before.slice(fetchAt, fetchAt + 40))) kind = "fetch";
      else if (before.includes("path ===")) kind = "guard";
      calls.push({ file, line, kind, around });
    }
  }
  return calls;
}

test("every client fetch of news, digest and games sends the spoiler header for the reveal state", async () => {
  const calls = clientSpoilerCalls();
  const fetches = calls.filter((call) => call.kind === "fetch");
  const delegated = calls.filter((call) => call.kind === "useRemoteData");
  const guards = calls.filter((call) => call.kind === "guard");
  const mentions = calls.filter((call) => call.kind === "mention");
  const tally = (list) => Object.fromEntries(Object.entries(list.reduce((counts, call) => {
    counts[call.file] = (counts[call.file] ?? 0) + 1;
    return counts;
  }, {})).sort(([a], [b]) => a.localeCompare(b)));
  assert.deepEqual(tally(fetches), {
    "src/app/digest/page.tsx": 1,
    "src/components/GameSection.tsx": 1,
    "src/lib/api.ts": 5,
  });
  assert.deepEqual(tally(delegated), {
    "src/app/digest/page.tsx": 2,
    "src/app/page.tsx": 1,
    ...(existsSync(new URL("../src/components/EndOfSession.tsx", import.meta.url)) ? { "src/components/EndOfSession.tsx": 2 } : {}),
    "src/components/PersonalizedFeed.tsx": 1,
    "src/hooks/useGameData.ts": 1,
  });
  assert.deepEqual(tally(guards), { "src/lib/api.ts": 3 });
  assert.deepEqual(tally(mentions), { "src/lib/digestPresentation.ts": 1 });
  for (const call of fetches) {
    assert.match(call.around, /spoilerHeaders\s*\(|x-nba-spoilers/, call.file);
  }
  const remoteSource = readFileSync(new URL("../src/hooks/useRemoteData.ts", import.meta.url), "utf8");
  assert.match(remoteSource, /fetch\(url,\s*\{ signal: controller\.signal, headers \}/);
  assert.match(remoteSource, /const headers = mode \? spoilerHeaders\(\) : undefined/);

  const seen = [];
  const fetch = (url, options = {}) => {
    seen.push({ url: String(url), value: headerValue(options.headers) });
    const path = String(url).split("?")[0];
    const body = path === "/api/news"
      ? [{ title: "Open", redacted: false, identity: "abc", link: "https://example.com/a" }]
      : path === "/api/digest"
        ? { digest: { date: "2026-10-27", title: "Open", content: "Full", redacted: false, games_covered: [] } }
        : {
          lastGame: { id: 9, status: "Final", scoresRedacted: false, homeScore: 118, awayScore: 107 },
          currentGame: null, nextGame: null,
          record: { wins: 1, losses: 0 }, error: null,
        };
    return Promise.resolve({ ok: true, json: async () => body });
  };
  const api = load("lib/api.ts", { fetch }).exports;
  const remote = load("hooks/useRemoteData.ts", { fetch }, { react: require("react"), "@/lib/api": api }).exports;
  const states = [
    [{ hideScores: true, hideHeadlines: true }, "scores,headlines"],
    [{ hideScores: false, hideHeadlines: false }, "none"],
    [{ hideScores: true, hideHeadlines: false }, "scores"],
    [{ hideScores: false, hideHeadlines: true }, "headlines"],
  ];
  assert.equal(api.spoilerHeaders()["x-nba-spoilers"], "scores,headlines");
  for (const [prefs, signal] of states) {
    api.setSpoilerPrefs(prefs);
    for (const url of ["/api/news?team=Celtics", "/api/digest?range=15", "/api/games?teamId=2"]) {
      seen.length = 0;
      await remote.fetchRemoteData(url, true);
      assert.equal(seen.length, 1, url);
      assert.equal(seen[0].url, url);
      assert.equal(seen[0].value, signal, `${url} ${signal}`);
    }
  }

  api.setSpoilerPrefs({ hideScores: true, hideHeadlines: true });
  seen.length = 0;
  const revealedNews = await api.revealNewsItem({ redacted: true, feed: "Celtics", identity: "abc", link: "https://example.com/a" });
  assert.equal(revealedNews.title, "Open");
  assert.equal(seen.at(-1).url.startsWith("/api/news?"), true);
  assert.equal(seen.at(-1).value, "scores,headlines");
  await api.revealDigest("2026-10-27");
  assert.equal(seen.at(-1).url.startsWith("/api/digest?"), true);
  assert.equal(seen.at(-1).value, "scores,headlines");
  await api.requestScoreReveal("digest:2026-10-27");
  assert.equal(seen.at(-1).url.startsWith("/api/digest?"), true);
  assert.equal(seen.at(-1).value, "scores,headlines");
  api.noteGames("2", {
    lastGame: { id: 9, status: "Final", scoresRedacted: true },
    currentGame: null, nextGame: null,
    record: { wins: 0, losses: 0, redacted: true }, error: null,
  });
  await api.requestScoreReveal("2:9");
  assert.equal(seen.at(-1).url.startsWith("/api/games?"), true);
  assert.equal(seen.at(-1).value, "scores,headlines");
  api.setSpoilerPrefs({ hideScores: false, hideHeadlines: false });
  api.noteGames("2", {
    lastGame: { id: 9, status: "1st Qtr", scoresRedacted: true },
    currentGame: null, nextGame: null,
    record: { wins: 0, losses: 0, redacted: true }, error: null,
  });
  await Promise.resolve();
  assert.equal(seen.at(-1).url.startsWith("/api/games?"), true);
  assert.equal(seen.at(-1).value, "none");

  const effects = [];
  const react = {
    useEffect(fn) { effects.push(fn); },
    useState(init) { return [typeof init === "function" ? init() : init, () => {}]; },
  };
  api.setSpoilerPrefs({ hideScores: true, hideHeadlines: false });
  const card = load("components/GameSection.tsx", { fetch }, {
    react,
    "next/link": { default: "a" },
    "lucide-react": { Play: () => null, ArrowUpRight: () => null },
    "@/lib/nbaDate": load("lib/nbaDate.ts").exports,
    "@/hooks/useGameData": { useGameData: () => ({ nextGame: null, loading: false, error: null }) },
    "@/hooks/useTeam": { useTeam: () => ({ selectedTeam: { id: 2, name: "Celtics", city: "Boston", abbreviation: "BOS" } }) },
    "./SpoilerModeProvider": { useSpoilerContext: () => ({ hideScores: true, hideHeadlines: false }) },
    "@/lib/api": api,
    "./ScoreReveal": { default: () => null },
    "@/lib/teams": load("lib/teams.ts").exports,
    "@/lib/digest": load("lib/digest.ts").exports,
  }).exports.HomeDigestCard;
  card({ favoriteTeams: [] });
  const stop = effects.at(-1)();
  assert.equal(seen.at(-1).url, "/api/digest");
  assert.equal(seen.at(-1).value, "scores");
  stop?.();

  const pageBox = load("app/digest/page.tsx", { fetch }, {
    react: require("react"),
    "lucide-react": new Proxy({}, { get: () => () => null }),
    "@/components/MarkdownContent": { default: () => null },
    "@/components/DataError": { default: () => null },
    "@/components/SpoilerModeProvider": { digestContentIsProtected: () => true, useSpoilerContext: () => ({ hideScores: true, hideHeadlines: true }) },
    "@/hooks/useRemoteData": { useRemoteData: () => ({ data: null, loading: false, error: false, retry() {} }) },
    "@/lib/nbaDate": { formatGameDate: () => "date" },
    "@/lib/digest": {},
    "@/lib/digestPresentation": { getDigestPresentation: (entry) => entry },
  }, "\nexports.__reveal = revealDigest;\n");
  delete pageBox.sandbox.__nbaSpoilerBus;
  seen.length = 0;
  await pageBox.exports.__reveal("2026-10-27");
  assert.equal(seen[0].url.startsWith("/api/digest?"), true);
  assert.equal(seen[0].value, "scores,headlines");
  pageBox.sandbox.__nbaSpoilerBus = { prefs: { hideScores: false, hideHeadlines: false } };
  await pageBox.exports.__reveal("2026-10-26");
  assert.equal(seen.at(-1).value, "none");
  pageBox.sandbox.__nbaSpoilerBus = { prefs: { hideScores: false, hideHeadlines: true } };
  await pageBox.exports.__reveal("2026-10-25");
  assert.equal(seen.at(-1).value, "headlines");
});

function createRealm(globals) {
  const context = vm.createContext({
    Date, URL, URLSearchParams, AbortSignal, AbortController, Response, Headers, Buffer,
    setTimeout, clearTimeout, queueMicrotask, console,
    ...globals,
  });
  return {
    context,
    load(file, imports = {}, extra = "") {
      const source = readFileSync(new URL("../src/" + file, import.meta.url), "utf8");
      const code = ts.transpileModule(source, { compilerOptions: {
        module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
      } }).outputText;
      const exports = {};
      const localRequire = (id) => imports[id] ?? (id.endsWith(".module.css") ? { default: new Proxy({}, { get: (_target, key) => String(key) }) } : require(id));
      const fn = vm.runInContext(`(function(exports, require){\n${code}\n${extra}\n})`, context);
      fn(exports, localRequire);
      return exports;
    },
  };
}

test("confirming the reveal refetches with x-nba-spoilers none", async () => {
  const seen = [];
  const fetch = (url, options = {}) => {
    seen.push({ url: String(url), value: headerValue(options.headers) });
    return Promise.resolve({ ok: true, json: async () => ({ feeds: {} }) });
  };
  const effects = [];
  const react = {
    useState(init) { return [typeof init === "function" ? init() : init, () => {}]; },
    useEffect(fn) { effects.push(fn); },
    useCallback(fn) { return fn; },
    useRef(value) { return { current: value }; },
  };
  const realm = createRealm({
    fetch,
    document: { visibilityState: "visible", addEventListener() {}, removeEventListener() {} },
    window: { addEventListener() {}, removeEventListener() {} },
    localStorage: { getItem: () => null, setItem() {} },
  });
  const api = realm.load("lib/api.ts");
  const remote = realm.load("hooks/useRemoteData.ts", { react, "@/lib/api": api });
  const mode = realm.load("hooks/useSpoilerMode.ts", { react });
  remote.useRemoteData("/api/news?team=Celtics");
  effects.at(-1)();
  assert.equal(seen.at(-1).value, "scores,headlines");
  mode.useSpoilerMode().showScoresAndHeadlines();
  assert.ok(seen.length >= 2, "confirming publishes the bus and the protected request runs again");
  assert.equal(seen.at(-1).url.split("?")[0], "/api/news");
  assert.equal(seen.at(-1).value, "none");
});

test("the home digest sends the spoiler header and loads again when the state changes", () => {
  const seen = [];
  const fetch = (url, options = {}) => {
    seen.push({ url: String(url), value: headerValue(options.headers) });
    return Promise.resolve({ ok: true, json: async () => ({ digest: null }) });
  };
  const slots = [];
  let cursor = 0;
  const react = {
    useState(init) {
      const index = cursor++;
      if (slots[index] === undefined) slots[index] = { state: typeof init === "function" ? init() : init };
      const slot = slots[index];
      return [slot.state, (value) => { slot.state = typeof value === "function" ? value(slot.state) : value; }];
    },
    useEffect(fn, deps) {
      const index = cursor++;
      const previous = slots[index];
      const changed = !previous || !deps || deps.some((dep, i) => !Object.is(dep, previous.deps[i]));
      if (!previous) slots[index] = { deps, fn: changed ? fn : null };
      else { previous.deps = deps; previous.fn = changed ? fn : null; }
    },
  };
  const flush = () => {
    for (const slot of slots) {
      if (slot && slot.fn) {
        slot.cleanup?.();
        const fn = slot.fn;
        slot.fn = null;
        slot.cleanup = fn() || undefined;
      }
    }
  };
  const realm = createRealm({ fetch });
  const api = realm.load("lib/api.ts");
  const settings = { hideScores: true, hideHeadlines: true };
  const card = realm.load("components/GameSection.tsx", {
    react,
    "next/link": { default: "a" },
    "lucide-react": { Play: () => null, ArrowUpRight: () => null },
    "@/lib/nbaDate": realm.load("lib/nbaDate.ts"),
    "@/hooks/useGameData": { useGameData: () => ({ nextGame: null, loading: false, error: null }) },
    "@/hooks/useTeam": { useTeam: () => ({ selectedTeam: { id: 2, name: "Celtics", city: "Boston", abbreviation: "BOS" } }) },
    "./SpoilerModeProvider": { useSpoilerContext: () => settings },
    "@/lib/api": api,
    "./ScoreReveal": { default: () => null },
    "@/lib/teams": realm.load("lib/teams.ts"),
    "@/lib/digest": realm.load("lib/digest.ts"),
  }).HomeDigestCard;
  const render = () => { cursor = 0; card({ favoriteTeams: [] }); flush(); };
  render();
  assert.equal(seen.at(-1).url, "/api/digest");
  assert.equal(seen.at(-1).value, "scores,headlines");
  settings.hideScores = false;
  settings.hideHeadlines = false;
  api.setSpoilerPrefs({ hideScores: false, hideHeadlines: false });
  render();
  assert.equal(seen.length, 2);
  assert.equal(seen.at(-1).value, "none");
  for (const slot of slots) slot?.cleanup?.();
});

test("a revealed live score refetches when the game status changes", async () => {
  const seen = [];
  const fetch = (url, options = {}) => {
    seen.push({ url: String(url), value: headerValue(options.headers) });
    return Promise.resolve({
      ok: true,
      json: async () => ({
        lastGame: { id: 9, status: "Final", scoresRedacted: false, homeScore: 118, awayScore: 107 },
        currentGame: null, nextGame: null, record: { wins: 0, losses: 0, redacted: true }, error: null,
      }),
    });
  };
  const api = load("lib/api.ts", { fetch }).exports;
  const game = (status) => ({
    lastGame: { id: 9, status, scoresRedacted: true },
    currentGame: null, nextGame: null,
    record: { wins: 0, losses: 0, redacted: true }, error: null,
  });
  api.noteGames("2", game("Final"));
  await api.requestScoreReveal("2:9");
  const before = seen.length;
  api.noteGames("2", game("1st Qtr"));
  assert.equal(seen.length, before + 1);
  assert.equal(seen.at(-1).url.startsWith("/api/games?"), true);
  assert.equal(seen.at(-1).value, "scores,headlines");
});

test("a revealed live score replaces 98-95 with the next 101-97", async () => {
  let live = { homeScore: 98, awayScore: 95 };
  const fetch = () => Promise.resolve({
    ok: true,
    json: async () => ({
      lastGame: { id: 9, status: "2nd Qtr", scoresRedacted: false, homeScore: live.homeScore, awayScore: live.awayScore },
      currentGame: null, nextGame: null,
      record: { wins: 0, losses: 0, redacted: true }, error: null,
    }),
  });
  const api = load("lib/api.ts", { fetch }).exports;
  const redacted = {
    lastGame: { id: 9, status: "2nd Qtr", scoresRedacted: true, homeScore: null, awayScore: null },
    currentGame: null, nextGame: null,
    record: { wins: 0, losses: 0, redacted: true }, error: null,
  };
  const shown = () => api.mergeGameReveal(redacted, api.revealedGameOverlay("2"));
  api.noteGames("2", redacted);
  await api.requestScoreReveal("2:9");
  assert.equal(shown().lastGame.homeScore, 98);
  assert.equal(shown().lastGame.awayScore, 95);
  live = { homeScore: 101, awayScore: 97 };
  api.noteGames("2", redacted);
  for (let step = 0; step < 6; step += 1) await Promise.resolve();
  assert.equal(shown().lastGame.homeScore, 101);
  assert.equal(shown().lastGame.awayScore, 97);
});

test("a revealed record follows new game polls and retries after an offline poll", async () => {
  let record = { wins: 2, losses: 1 };
  let offline = false;
  const requests = [];
  const base = { lastGame: null, currentGame: null, nextGame: null, record: { wins: 0, losses: 0, redacted: true }, error: null };
  const api = load("lib/api.ts", { fetch: async (url) => {
    requests.push(String(url));
    if (offline) throw new Error("offline");
    return { ok: true, json: async () => ({ ...base, record }) };
  } }).exports;
  const settle = () => new Promise((resolve) => setImmediate(resolve));
  const shown = () => api.mergeGameReveal(base, api.revealedGameOverlay("2")).record;
  api.noteGames("2", base);
  await api.requestScoreReveal("2:record");
  assert.equal(shown().wins, 2);
  record = { wins: 3, losses: 1 };
  api.noteGames("2", { ...base, lastGame: { id: 20, status: "Final", scoresRedacted: true } });
  await settle();
  assert.equal(shown().wins, 3);
  assert.match(requests.at(-1), /reveal=record/);
  offline = true;
  api.noteGames("2", base);
  await settle();
  assert.equal(shown().wins, 3);
  offline = false;
  record = { wins: 4, losses: 1 };
  api.noteGames("2", base);
  await settle();
  assert.equal(shown().wins, 4);
});

test("revealing a non-spoiler in a spoiler group keeps hide, the live region, and focus", async () => {
  const slots = [];
  let cursor = 0;
  const document = { activeElement: null };
  const react = {
    Fragment: Symbol.for("react.fragment"),
    useState(init) {
      const index = cursor++;
      if (slots[index] === undefined) slots[index] = typeof init === "function" ? init() : init;
      const slot = index;
      return [slots[slot], (value) => { slots[slot] = typeof value === "function" ? value(slots[slot]) : value; }];
    },
    useReducer(reducer, init) {
      const index = cursor++;
      if (slots[index] === undefined) slots[index] = init;
      const slot = index;
      return [slots[slot], (action) => { slots[slot] = reducer(slots[slot], action); }];
    },
    useRef(init) {
      const index = cursor++;
      if (slots[index] === undefined) slots[index] = { current: init };
      return slots[index];
    },
    useEffect(fn, deps) {
      const index = cursor++;
      const previous = slots[index];
      const changed = !previous || !deps || deps.some((dep, i) => !Object.is(dep, previous.deps[i]));
      if (!previous) slots[index] = { deps, fn: changed ? fn : null };
      else { previous.deps = deps; previous.fn = changed ? fn : null; }
    },
  };
  const published = new Date().toISOString();
  const real = {
    title: "Celtics highlights against the Nets", safeTitle: "Celtics highlights against the Nets",
    link: "https://upstream.example/celtics/highlights", source: "ESPN", isSpoiler: false,
    pubDate: published, category: "general", identity: "hl", feed: "Celtics",
  };
  const Story = load("components/NewsList.tsx", {}, {
    react,
    "lucide-react": { ExternalLink: () => null },
    "@/lib/api": { ...load("lib/api.ts").exports, revealNewsItem: async () => real },
    "@/lib/news": { newsVisitBoundary: () => null },
    "@/hooks/useLastVisit": { useLastVisit: () => ({ ready: true, lastVisitAt: null }) },
    "./SpoilerModeProvider": { useSpoilerContext: () => ({ hideHeadlines: true, hideScores: true }) },
    "./DataError": { default: () => null },
  }, "\nexports.NewsStory = NewsStory;\n").exports.NewsStory;
  const render = () => { cursor = 0; return Story({ item: {
    title: "Spoiler-protected headline from ESPN", safeTitle: "Spoiler-protected headline from ESPN",
    link: null, source: "ESPN", isSpoiler: true, redacted: true, pubDate: published,
    category: "general", identity: "hl", feed: "Celtics",
  } }); };
  const buttons = (tree) => {
    const found = [];
    const walk = (node) => {
      if (node == null || typeof node !== "object") return;
      if (Array.isArray(node)) { node.forEach(walk); return; }
      if (node.type === "button") found.push(node);
      walk(node.props?.children);
    };
    walk(tree);
    return found;
  };
  const statusText = (tree) => {
    let text = "";
    const walk = (node) => {
      if (node == null || typeof node !== "object") return;
      if (Array.isArray(node)) { node.forEach(walk); return; }
      if (node.props?.role === "status") text = node.props.children;
      walk(node.props?.children);
    };
    walk(tree);
    return text;
  };
  const reveal = buttons(render()).find((button) => button.props.children === "Reveal headline");
  assert.ok(reveal);
  document.activeElement = reveal;
  await reveal.props.onClick();
  const shown = render();
  const hide = buttons(shown).find((button) => button.props.children === "Hide headline");
  assert.ok(hide, "the hide control stays mounted");
  assert.equal(statusText(shown), "Headline revealed");
  assert.equal(document.activeElement, reveal);
  document.activeElement = hide;
  await hide.props.onClick();
  assert.equal(document.activeElement, hide);
  assert.ok(buttons(render()).some((button) => button.props.children === "Reveal headline"));
});

test("Reveal record uses the :record key and leaves scores and headlines hidden", async () => {
  const seen = [];
  const fetch = (url, options = {}) => {
    seen.push({ url: String(url), value: headerValue(options.headers) });
    return Promise.resolve({
      ok: true,
      json: async () => ({
        lastGame: { id: 9, status: "Final", scoresRedacted: true, homeScore: null, awayScore: null },
        currentGame: null, nextGame: null,
        record: { wins: 41, losses: 20 }, error: null,
      }),
    });
  };
  const api = load("lib/api.ts", { fetch }).exports;
  api.setSpoilerPrefs({ hideScores: true, hideHeadlines: true });
  api.noteGames("2", {
    lastGame: { id: 9, status: "Final", scoresRedacted: true, homeScore: null, awayScore: null },
    currentGame: null, nextGame: null,
    record: { wins: 0, losses: 0, redacted: true }, error: null,
  });
  await api.requestScoreReveal("2:record");
  assert.equal(seen.at(-1).url.includes("teamId=2"), true);
  assert.equal(seen.at(-1).url.includes("reveal=record"), true);
  const shown = api.mergeGameReveal(api.revealedGameOverlay("2") ? {
    lastGame: { id: 9, status: "Final", scoresRedacted: true, homeScore: null, awayScore: null },
    currentGame: null, nextGame: null,
    record: { wins: 0, losses: 0, redacted: true }, error: null,
  } : null, api.revealedGameOverlay("2"));
  assert.equal(shown.record.wins, 41);
  assert.equal(shown.record.losses, 20);
  assert.equal(shown.lastGame.scoresRedacted, true);
  assert.equal(shown.lastGame.homeScore, null);
  assert.equal(api.spoilerHeaders()["x-nba-spoilers"], "scores,headlines");
});

test("Record hidden offers Reveal record without showing scores or headlines", () => {
  const react = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const Badge = load("components/RecordBadge.tsx", {}, {
    react,
    "@/hooks/useGameData": { useGameData: () => ({ record: { wins: 41, losses: 20, redacted: true }, loading: false, error: null, lastGame: { homeScore: 101, awayScore: 97, scoresRedacted: true } }) },
    "@/hooks/useTeam": { useTeam: () => ({ selectedTeam: { id: 2, name: "Celtics" } }) },
    "./ScoreReveal": load("components/ScoreReveal.tsx", {}, {
      react,
      "./SpoilerModeProvider": { useSpoilerContext: () => ({ hideScores: true, hideHeadlines: true }), digestContentIsProtected: () => true },
    }).exports,
  }).exports.default;
  const html = renderToStaticMarkup(react.createElement(Badge));
  assert.match(html, /Reveal record/);
  assert.match(html, /Record hidden/);
  assert.doesNotMatch(html, /41-20|101|97/);
});

function createRecordDocument() {
  const ELEMENT = 1, TEXT = 3, COMMENT = 8;
  const doc = { nodeType: 9, nodeName: "#document", childNodes: [], listeners: {} };
  doc.ownerDocument = doc;
  doc.addEventListener = (type, fn) => { (doc.listeners[type] ||= []).push(fn); };
  doc.removeEventListener = (type, fn) => { doc.listeners[type] = (doc.listeners[type] || []).filter((item) => item !== fn); };
  function refresh(n) {
    n.firstChild = n.childNodes[0] || null;
    n.lastChild = n.childNodes.at(-1) || null;
    n.childNodes.forEach((child, index) => {
      child.nextSibling = n.childNodes[index + 1] || null;
      child.previousSibling = n.childNodes[index - 1] || null;
    });
  }
  function node(type, name) {
    const n = { nodeType: type, nodeName: name, parentNode: null, childNodes: [], ownerDocument: doc, style: {}, namespaceURI: "http://www.w3.org/1999/xhtml", listeners: {}, attributes: {}, data: "" };
    n.appendChild = (child) => { if (child.parentNode) child.parentNode.removeChild(child); child.parentNode = n; n.childNodes.push(child); refresh(n); return child; };
    n.insertBefore = (child, ref) => { if (child.parentNode) child.parentNode.removeChild(child); child.parentNode = n; const index = ref ? n.childNodes.indexOf(ref) : -1; n.childNodes.splice(index < 0 ? n.childNodes.length : index, 0, child); refresh(n); return child; };
    n.removeChild = (child) => {
      const index = n.childNodes.indexOf(child);
      if (index >= 0) n.childNodes.splice(index, 1);
      const focused = doc.activeElement;
      let inside = focused === child;
      const seen = new Set();
      for (let node = focused; node && !inside && !seen.has(node); node = node.parentNode) {
        seen.add(node);
        inside = node === child;
      }
      if (child.parentNode === n) child.parentNode = null;
      refresh(n);
      if (inside) doc.activeElement = doc.body;
      return child;
    };
    n.setAttribute = (key, value) => { n.attributes[key] = String(value); };
    n.getAttribute = (key) => (Object.prototype.hasOwnProperty.call(n.attributes, key) ? n.attributes[key] : null);
    n.removeAttribute = (key) => { delete n.attributes[key]; };
    n.hasAttribute = (key) => Object.prototype.hasOwnProperty.call(n.attributes, key);
    n.addEventListener = (type, fn) => { (n.listeners[type] ||= []).push(fn); };
    n.removeEventListener = (type, fn) => { n.listeners[type] = (n.listeners[type] || []).filter((item) => item !== fn); };
    n.focus = () => { doc.activeElement = n; };
    n.click = () => {
      n.focus();
      const event = { type: "click", target: n, bubbles: true, cancelable: true, defaultPrevented: false, eventPhase: 3, timeStamp: 0, preventDefault() { event.defaultPrevented = true; }, stopPropagation() { event._stop = true; }, isPropagationStopped() { return Boolean(event._stop); } };
      let current = n;
      while (current) {
        event.currentTarget = current;
        for (const fn of [...(current.listeners?.click || [])]) fn(event);
        if (event._stop) break;
        current = current.parentNode;
      }
    };
    Object.defineProperty(n, "textContent", {
      get() { return n.nodeType === TEXT ? n.data : n.childNodes.map((child) => child.nodeType === TEXT ? child.data : (child.textContent || "")).join(""); },
      set(value) { n.childNodes = []; const text = node(TEXT, "#text"); text.data = String(value ?? ""); n.appendChild(text); },
    });
    Object.defineProperty(n, "nodeValue", {
      get() { return n.nodeType === TEXT || n.nodeType === COMMENT ? n.data : null; },
      set(value) { if (n.nodeType === TEXT || n.nodeType === COMMENT) n.data = String(value ?? ""); },
    });
    Object.defineProperty(n, "tagName", { get() { return n.nodeType === ELEMENT ? String(name).toUpperCase() : undefined; } });
    return n;
  }
  doc.createElement = (name) => node(ELEMENT, String(name));
  doc.createElementNS = (_ns, name) => doc.createElement(name);
  doc.createTextNode = (data) => { const text = node(TEXT, "#text"); text.data = String(data); return text; };
  doc.createComment = (data) => { const text = node(COMMENT, "#comment"); text.data = String(data); return text; };
  doc.documentElement = doc.createElement("html");
  doc.body = doc.createElement("body");
  doc.head = doc.createElement("head");
  doc.documentElement.appendChild(doc.head);
  doc.documentElement.appendChild(doc.body);
  doc.activeElement = doc.body;
  return doc;
}

function accessibleName(element) {
  return (element.getAttribute("aria-label") || element.textContent || "").replace(/\s+/g, " ").trim();
}
function elementRole(element) {
  return element.getAttribute("role") || (element.nodeName === "button" ? "button" : null);
}
function queryByRole(root, role, name) {
  const found = [];
  const walk = (node) => {
    if (!node || node.nodeType !== 1) return;
    if (elementRole(node) === role && (name === undefined || accessibleName(node) === name)) found.push(node);
    for (const child of node.childNodes) walk(child);
  };
  walk(root);
  return found;
}
function getByRole(root, role, { name } = {}) {
  const found = queryByRole(root, role, name);
  if (found.length !== 1) {
    const label = name ? `${role} "${name}"` : role;
    throw new Error(`getByRole ${label} found ${found.length}`);
  }
  return found[0];
}
function hiddenAncestor(element) {
  let current = element;
  const seen = new Set();
  while (current && !seen.has(current)) {
    seen.add(current);
    if (current.getAttribute?.("aria-hidden") === "true") return current;
    current = current.parentNode;
  }
  return null;
}

function mountRecordBadge() {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  const document = createRecordDocument();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.document = document;
  globalThis.HTMLIFrameElement = function HTMLIFrameElement() {};
  globalThis.window = globalThis;
  const React = require("react");
  const { createRoot } = require("react-dom/client");
  const { act } = require("react");
  const realm = createRealm({});
  let setRecord = () => {};
  realm.context.__nbaRequestScoreReveal = (scope) => Promise.resolve().then(() => {
    if (String(scope).endsWith(":record")) setRecord({ wins: 41, losses: 20, redacted: false });
  });
  const gameData = realm.load("hooks/useGameData.ts", {
    react: React,
    "./useRemoteData": { useRemoteData: () => ({ data: null, loading: false, error: false, retry() {} }) },
    "./useTeam": { useTeam: () => ({ selectedTeam: { id: 2, name: "Celtics" } }) },
    "@/lib/api": { mergeGameReveal: (base) => base, noteGames() {}, revealedGameOverlay() {}, subscribeGameReveals: () => () => {} },
  });
  const Badge = realm.load("components/RecordBadge.tsx", {
    react: React,
    "@/hooks/useGameData": gameData,
    "@/hooks/useTeam": { useTeam: () => ({ selectedTeam: { id: 2, name: "Celtics" } }) },
    "./ScoreReveal": realm.load("components/ScoreReveal.tsx", {
      react: React,
      "./SpoilerModeProvider": { useSpoilerContext: () => ({ hideScores: true, hideHeadlines: true }), digestContentIsProtected: () => true },
    }),
  }).default;
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  function Screen() {
    const [record, set] = React.useState({ wins: 41, losses: 20, redacted: true });
    setRecord = set;
    return React.createElement(gameData.GameDataContext.Provider, {
      value: { record, loading: false, error: null, lastGame: { id: 9, homeScore: 101, awayScore: 97, scoresRedacted: true }, currentGame: null, nextGame: null, retry() {} },
    }, React.createElement(Badge));
  }
  return { document, host, act, root, Screen, restore() {
    root.unmount();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    delete globalThis.HTMLIFrameElement;
    globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
  } };
}

let recordUi = Promise.resolve();
function recordTest(name, fn) {
  test(name, async () => {
    const run = recordUi.then(fn, fn);
    recordUi = run.then(() => {}, () => {});
    await run;
  });
}

recordTest("one Reveal record click reveals the record and moves focus to Hide record", async () => {
  const screen = mountRecordBadge();
  try {
    await screen.act(async () => { screen.root.render(require("react").createElement(screen.Screen)); });
    const reveal = getByRole(screen.host, "button", { name: "Reveal record" });
    await screen.act(async () => { reveal.click(); await Promise.resolve(); await Promise.resolve(); });
    assert.notEqual(screen.document.activeElement, screen.document.body, "focus fell on BODY");
    assert.equal(queryByRole(screen.host, "button", "Reveal record").length, 0, "a second Reveal record is still showing");
    const hide = getByRole(screen.host, "button", { name: "Hide record" });
    assert.equal(screen.document.activeElement, hide, "focus is not on Hide record");
    assert.match(getByRole(screen.host, "status").textContent, /revealed/i);
    assert.match(screen.host.textContent, /41-20/);
  } finally { screen.restore(); }
});

recordTest("Hide record restores Record hidden and returns focus to Reveal record", async () => {
  const screen = mountRecordBadge();
  try {
    const React = require("react");
    await screen.act(async () => { screen.root.render(React.createElement(screen.Screen)); });
    await screen.act(async () => { getByRole(screen.host, "button", { name: "Reveal record" }).click(); await Promise.resolve(); await Promise.resolve(); });
    const hide = getByRole(screen.host, "button", { name: "Hide record" });
    await screen.act(async () => { hide.click(); });
    assert.match(screen.host.textContent, /Record hidden/);
    const reveal = getByRole(screen.host, "button", { name: "Reveal record" });
    assert.equal(screen.document.activeElement, reveal, "focus is not on Reveal record");
    assert.notEqual(screen.document.activeElement, screen.document.body, "focus fell on BODY");
  } finally { screen.restore(); }
});

recordTest("the revealed record is not inside aria-hidden", async () => {
  const screen = mountRecordBadge();
  try {
    await screen.act(async () => { screen.root.render(require("react").createElement(screen.Screen)); });
    await screen.act(async () => { getByRole(screen.host, "button", { name: "Reveal record" }).click(); await Promise.resolve(); await Promise.resolve(); });
    const record = [...walkElements(screen.host)].find((element) => element.textContent.replace(/\s+/g, "") === "41-20");
    assert.ok(record, "revealed record 41-20 is missing");
    assert.ok(hiddenAncestor(record) == null, "revealed record is inside aria-hidden");
  } finally { screen.restore(); }
});

function walkElements(root, found = []) {
  if (!root || root.nodeType !== 1) return found;
  found.push(root);
  for (const child of root.childNodes) walkElements(child, found);
  return found;
}

test("a redacted headline ignores a present link and a revealed one uses the real link", () => {
  const slots = [];
  let cursor = 0;
  const react = {
    Fragment: Symbol.for("react.fragment"),
    useState(init) {
      const index = cursor++;
      if (slots[index] === undefined) slots[index] = typeof init === "function" ? init() : init;
      return [slots[index], (value) => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
    },
    useReducer(reducer, init) {
      const index = cursor++;
      if (slots[index] === undefined) slots[index] = init;
      return [slots[index], (action) => { slots[index] = reducer(slots[index], action); }];
    },
    useRef(init) {
      const index = cursor++;
      if (slots[index] === undefined) slots[index] = { current: init };
      return slots[index];
    },
    useEffect() {},
  };
  const published = new Date().toISOString();
  const leaked = "https://upstream.example/celtics/leaked";
  const real = "https://upstream.example/celtics/real";
  const Story = load("components/NewsList.tsx", {}, {
    react,
    "lucide-react": { ExternalLink: () => null },
    "@/lib/api": load("lib/api.ts").exports,
    "@/lib/news": { newsVisitBoundary: () => null },
    "@/hooks/useLastVisit": { useLastVisit: () => ({ ready: true, lastVisitAt: null }) },
    "./SpoilerModeProvider": { useSpoilerContext: () => ({ hideHeadlines: true, hideScores: true }) },
    "./DataError": { default: () => null },
  }, "\nexports.NewsStory = NewsStory;\n").exports.NewsStory;
  const hrefs = (tree) => {
    const found = [];
    const walk = (node) => {
      if (node == null || typeof node !== "object") return;
      if (Array.isArray(node)) { node.forEach(walk); return; }
      if (node.type === "a" && node.props?.href) found.push(node.props.href);
      walk(node.props?.children);
    };
    walk(tree);
    return found;
  };
  const render = (item) => { cursor = 0; slots.length = 0; return Story({ item }); };
  assert.deepEqual(hrefs(render({
    title: "Spoiler-protected headline from ESPN", safeTitle: "Spoiler-protected headline from ESPN",
    link: leaked, source: "ESPN", isSpoiler: true, redacted: true, pubDate: published, category: "general",
  })), []);
  assert.deepEqual(hrefs(render({
    title: "Celtics highlights against the Nets", safeTitle: "Celtics highlights against the Nets",
    link: real, source: "ESPN", isSpoiler: false, redacted: false, pubDate: published, category: "general",
  })), [real]);
});

test("the client spoiler state defaults to hidden scores and headlines", () => {
  const api = load("lib/api.ts").exports;
  assert.equal(api.spoilerHeaders()["x-nba-spoilers"], "scores,headlines");
  let initial;
  const hook = load("hooks/useSpoilerMode.ts", {
    localStorage: { getItem: () => null },
  }, {
    react: {
      useState(value) { if (initial === undefined) initial = value; return [value, () => {}]; },
      useEffect() {},
      useCallback(fn) { return fn; },
      useRef(value) { return { current: value }; },
    },
  }, "\nexports.readStoredForTest = readStored;\n");
  const settings = hook.exports.useSpoilerMode();
  assert.equal(initial.hideScores, true);
  assert.equal(initial.hideHeadlines, true);
  assert.equal(settings.hideScores, true);
  assert.equal(settings.hideHeadlines, true);
  const stored = hook.exports.readStoredForTest();
  assert.equal(stored.hideScores, true);
  assert.equal(stored.hideHeadlines, true);
});
