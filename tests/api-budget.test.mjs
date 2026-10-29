import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { test } from "node:test";
const require = createRequire(import.meta.url);
function load(file, imports, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
    { exports, require: id => imports[id] ?? require(id), process: { env: { BALLDONTLIE_KEY: "fixture", DIGEST_PUBLISH_TOKEN: "publisher" } }, URL, URLSearchParams, Request, Response, Headers, Buffer, Date, AbortSignal, ...globals });
  return exports;
}
function fixture() {
  const documents = new Map(), cache = new Map();
  let now = Date.parse("2026-10-28T12:00:00Z"), calls = 0, status = 200;
  class Clock extends Date { static now() { return now; } }
  const storage = {
    readDocument: async (name, empty) => documents.get(name) ?? empty,
    updateDocument: async (name, empty, update) => { const value = update(documents.get(name) ?? empty); documents.set(name, value); return value; },
  };
  const imports = {
    "./documentStorage": storage,
    "next/cache": { unstable_cache: (fn, key, options) => async () => {
      const id = JSON.stringify(key), hit = cache.get(id);
      if (hit?.until > now) return hit.value;
      const value = await fn(); cache.set(id, { value, until: now + options.revalidate * 1000 }); return value;
    } },
  };
  const globals = { Date: Clock, fetch: async () => { calls++; return Response.json({ data: [] }, { status, headers: { "Retry-After": "120" } }); } };
  return { module: () => load("lib/ballDontLie.ts", imports, globals), storage, calls: () => calls, advance: ms => { now += ms; }, deny: code => { status = code; } };
}
const url = team => `https://api.balldontlie.io/v1/games?team_ids[]=${team}`;
test("warm data uses no quota; separate instances share the five-call rolling budget", async () => {
  const f = fixture(), a = f.module(), b = f.module();
  await a.fetchBallDontLieSource(url(1), 30);
  await b.fetchBallDontLieSource(url(1), 30);
  assert.equal(f.calls(), 1);
  const results = await Promise.all(Array.from({ length: 10 }, (_, i) => b.fetchBallDontLieSource(url(i + 2), 30)));
  assert.equal(f.calls(), 5);
  assert.equal(results.filter(r => r.status === 429).length, 6);
  f.advance(60001);
  assert.equal((await a.fetchBallDontLieSource(url(30), 30)).status, 200);
  assert.equal(f.calls(), 6);
});
test("upstream 429 pauses all routes and denied roster pauses all teams", async () => {
  const f = fixture(), a = f.module(); f.deny(429);
  assert.equal((await a.fetchBallDontLieSource(url(1), 30)).status, 429);
  f.advance(61000);
  assert.equal((await f.module().fetchBallDontLieSource(url(2), 30)).status, 429);
  assert.equal(f.calls(), 1);
  f.advance(60000); f.deny(403);
  const roster = team => `https://api.balldontlie.io/v1/players/active?team_ids[]=${team}`;
  await a.fetchBallDontLieSource(roster(1), 3600);
  await f.module().fetchBallDontLieSource(roster(2), 3600);
  assert.equal(f.calls(), 2);
  f.advance(3600001); f.deny(200);
  assert.equal((await a.fetchBallDontLieSource(roster(2), 3600)).status, 200);
});
test("budget storage failure fails closed without calling the provider", async () => {
  const f = fixture(); f.storage.updateDocument = async () => { throw new Error("storage unavailable"); };
  await assert.rejects(f.module().fetchBallDontLieSource(url(1), 30), /storage unavailable/);
  assert.equal(f.calls(), 0);
});
test("invalid teams and intervals never reach the provider", async () => {
  let calls = 0;
  const imports = {
    "next/server": { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } },
    "@/lib/leagueSnapshot": { fetchSavedGames: async () => { calls++; return Response.json({ data: [] }); } },
    "@/lib/teams": { getTeamById: id => id >= 1 && id <= 30 && Number.isInteger(id) ? { id } : undefined },
    "@/lib/nbaDate": { getNBASeason: () => 2026, formatNBADate: () => "2026-10-28" },
    "@/lib/gameStatus": { getGameStartTime: () => null },
  };
  for (const path of ["games", "schedule"]) {
    const route = load(`app/api/${path}/route.ts`, imports);
    for (const team of ["garbage", "2%26bust%3D1", "31", "", "2.5"]) assert.equal((await route.GET({ nextUrl: new URL(`https://fixture/?teamId=${team}`) })).status, 400);
    if (path === "schedule") for (const range of ["start=2026-02-30", "start=2026-11-01&end=2026-10-01", "start=2020-01-01&end=2026-10-28", "start=2026-01-01&end=2028-01-01"]) assert.equal((await route.GET({ nextUrl: new URL(`https://fixture/?teamId=2&${range}`) })).status, 400);
  }
  assert.equal(calls, 0);
});

test("explicit refresh bypasses cached provider responses", async () => {
  const f = fixture(), a = f.module();
  await a.fetchBallDontLieSource(url(1), 60);
  await a.fetchBallDontLieSource(url(1), 0);
  await a.fetchBallDontLieSource(url(1), 0);
  assert.equal(f.calls(), 3);
});

test("sync route authenticates before fetching and validates before replacing a catalog", async () => {
  let fetches = 0, writes = 0;
  const route = load("app/api/sync/games/route.ts", {
    "@/lib/ballDontLie": { fetchBallDontLieSource: async (_url, ttl) => { assert.equal(ttl, 0); fetches++; return Response.json({ data: [{ id: 1, season: 2026, extra: true }], meta: { next_cursor: 2 } }); } },
    "@/lib/leagueSnapshot": { LEAGUE_DOCUMENT: "league-games.json", validateGames: data => { if (!Array.isArray(data)) throw Error("Invalid games"); return data.map(({ id, season }) => ({ id, season })); } },
    "@/lib/documentStorage": { updateDocument: async (_key, empty, update) => { writes++; return update(empty); } },
    "@/lib/nbaDate": { getNBASeason: () => 2026 },
  });
  const request = (body, authorized = true) => new Request("https://fixture/api/sync/games", { method: "POST", headers: authorized ? { Authorization: "Bearer publisher" } : {}, body: JSON.stringify(body) });
  assert.equal((await route.POST(request({ action: "page" }, false))).status, 401);
  assert.equal(fetches, 0);
  const page = await (await route.POST(request({ action: "page" }))).json();
  assert.deepEqual(page, { data: [{ id: 1, season: 2026 }], meta: { next_cursor: 2 } });
  assert.equal((await route.POST(request({ action: "publish", syncedAt: new Date().toISOString(), games: [] }))).status, 400);
  assert.equal(writes, 0);
  const result = await route.POST(request({ action: "publish", syncedAt: new Date().toISOString(), games: page.data }));
  assert.equal(result.status, 200);
  assert.equal(writes, 1);
});
