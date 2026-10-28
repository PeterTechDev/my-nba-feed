import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
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

function newsFetch() {
  const items = [
    { title: beat, link: "https://news.google.com/rss/articles/beat1", pubDate: hoursAgo(1) },
    { title: highlights, link: "https://news.google.com/rss/articles/hl1", pubDate: hoursAgo(2) },
  ];
  return async () => ({ ok: true, text: async () => rss(items) });
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
  assert.equal(JSON.stringify(closed.body).includes("118-107"), false);
  const revealed = await callNews(route, "team=Celtics", "none");
  assert.equal(revealed.status, 200);
  assertCache(revealed, "news revealed");
  const open = revealed.body.find((item) => item.title === beat);
  assert.ok(open);
  assert.equal(open.isSpoiler, true);
  assert.equal(open.redacted, undefined);
  assert.equal((await callNews(route, "team=NotATeam")).status, 400);
  assertCache(await callNews(route, "team=NotATeam"), "news 400");
  const semicolon = await callNews(route, "team=Celtics", "none;");
  assert.equal(semicolon.body.find((item) => item.title === beat).isSpoiler, true);
  await staysClosed((spoilers) => callNews(route, "team=Celtics", spoilers), "118-107");
});

test("grupo com um spoiler no related sai todo redigido sem header e inteiro com none", async () => {
  const route = newsStack(async () => ({ ok: true, text: async () => rss([
    { title: highlights, link: "https://news.google.com/rss/articles/hl1", pubDate: hoursAgo(1) },
    { title: beat, link: "https://news.google.com/rss/articles/beat1", pubDate: hoursAgo(2) },
  ]) }));
  const closed = await callNews(route, "team=Celtics");
  const top = closed.body;
  assert.equal(top.length, 1);
  assert.equal(top[0].isSpoiler, true);
  assert.equal(top[0].title, "Spoiler-protected headline from ESPN");
  assert.equal(top[0].related?.length, 1);
  assert.equal(top[0].related[0].isSpoiler, true);
  assert.equal(top[0].related[0].title, "Spoiler-protected headline from ESPN");
  assert.equal(JSON.stringify(closed.body).includes("highlights against"), false);
  assert.equal(JSON.stringify(closed.body).includes("118-107"), false);
  const revealed = await callNews(route, "team=Celtics", "none");
  const open = flatNews(revealed.body);
  assert.equal(open.find((item) => item.title === highlights).isSpoiler, false);
  assert.equal(open.find((item) => item.title === beat).isSpoiler, true);
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
    const file = path.slice(path.indexOf("/src/") + 1);
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
  assert.deepEqual(fetches.map(({ file, line }) => `${file}:${line}`), [
    "src/app/digest/page.tsx:29",
    "src/components/GameSection.tsx:274",
    "src/lib/api.ts:161",
    "src/lib/api.ts:255",
    "src/lib/api.ts:267",
    "src/lib/api.ts:279",
    "src/lib/api.ts:300",
  ]);
  assert.deepEqual(delegated.map(({ file, line }) => `${file}:${line}`), [
    "src/app/digest/page.tsx:145",
    "src/app/digest/page.tsx:146",
    "src/app/page.tsx:25",
    "src/components/PersonalizedFeed.tsx:20",
    "src/hooks/useGameData.ts:47",
  ]);
  assert.deepEqual(guards.map(({ file, line }) => `${file}:${line}`), [
    "src/lib/api.ts:147",
    "src/lib/api.ts:147",
    "src/lib/api.ts:147",
  ]);
  assert.deepEqual(mentions.map(({ file, line }) => `${file}:${line}`), [
    "src/lib/digestPresentation.ts:29",
  ]);
  for (const call of fetches) {
    assert.match(call.around, /spoilerHeaders\s*\(|x-nba-spoilers/, `${call.file}:${call.line}`);
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
        currentGame: null, nextGame: null, record: { wins: 1, losses: 0 }, error: null,
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
