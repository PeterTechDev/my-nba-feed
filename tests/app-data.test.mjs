import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
function load(file, globals = {}, imports = {}) {
  const source = readFileSync(new URL("../src/" + file, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const exports = {};
  const scope = { exports, require: (id) => imports[id] ?? require(id), Date, URL, AbortSignal, Response, Buffer, setTimeout, ...globals };
  vm.runInNewContext(code, scope);
  return { exports, code, scope };
}
const dates = load("lib/nbaDate.ts").exports;
const status = load("lib/gameStatus.ts").exports;
const teams = load("lib/teams.ts").exports;
const digest = load("lib/digest.ts").exports;
const imports = {
  "next/server": { NextResponse: { json: (body, options) => ({ status: options?.status ?? 200, body }) } },
  "@/lib/nbaDate": dates, "@/lib/gameStatus": status, "@/lib/teams": teams, "@/lib/digest": digest,
};

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

test("Blob document updates retry conflicts without losing concurrent writes", async () => {
  const blobs = new Map();
  let version = 0;
  class Conflict extends Error {}
  const sdk = {
    BlobPreconditionFailedError: Conflict,
    get: async (name) => {
      const value = blobs.get(name);
      return value ? { statusCode: 200, stream: new Response(JSON.stringify(value.data)).body, blob: { etag: value.etag } } : null;
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
  assert.equal(parseCommunityFeed(atom.replace("https://www.reddit.com", "javascript:alert")).length, 0);
  const rss = '<rss><item><guid>id</guid><title><![CDATA[Fan discussion]]></title><link>https://news.google.com/rss/articles/test</link><pubDate>Tue, 27 Oct 2026 10:00:00 GMT</pubDate></item></rss>';
  assert.equal(parseCommunityFeed(rss)[0].title, "Fan discussion");
});

test("community API recovers with RSS or a labeled index and reports total outages", async () => {
  const atom = '<feed><entry><id>t3_1</id><title>Celtics fan discussion</title><link href="https://www.reddit.com/r/bostonceltics/comments/1/test/"/><updated>2026-10-27T10:00:00Z</updated></entry></feed>';
  const rss = '<rss><item><guid>id</guid><title>Celtics discussion</title><link>https://news.google.com/rss/articles/test</link><pubDate>Tue, 27 Oct 2026 10:00:00 GMT</pubDate></item></rss>';
  let mode = "rss";
  const fetch = async (url) => ({
    ok: mode === "rss" ? url.endsWith(".rss") : mode === "index" ? url.includes("news.google") : false,
    text: async () => url.includes("news.google") ? rss : atom,
  });
  const socialImports = { ...imports, "@/lib/reddit": { teamSubreddits: { Celtics: "bostonceltics" } },
    "@/lib/communityFeed": load("lib/communityFeed.ts").exports };
  const route = load("app/api/social/route.ts", { fetch }, socialImports).exports;
  const request = { nextUrl: new URL("http://localhost/api/social?team=Celtics") };
  let result = await route.GET(request);
  assert.equal(result.body.source, "reddit");
  assert.equal(result.body.posts.length, 1);
  assert.equal(result.body.posts[0].score, null);
  mode = "index";
  result = await route.GET(request);
  assert.equal(result.body.source, "news-index");
  assert.equal(result.body.posts.length, 1);
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
});
