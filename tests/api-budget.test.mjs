import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { test } from "node:test";
import { syncStandings } from "../scripts/sync-standings.mjs";
const require = createRequire(import.meta.url);
function load(file, imports, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
    { exports, require: id => imports[id] ?? require(id), process: { env: { BALLDONTLIE_KEY: "fixture", DIGEST_PUBLISH_TOKEN: "publisher" } }, URL, URLSearchParams, Response, Headers, Buffer, Date, AbortSignal, ...globals });
  return exports;
}
function fixture() {
  const documents = new Map(), cache = new Map();
  let now = Date.parse("2026-10-28T12:00:00Z"), calls = 0, status = 200;
  class Clock extends Date { static now() { return now; } }
  const storage = {
    readDigestDocument: async (name, empty) => documents.get(name) ?? empty,
    updateDigestDocument: async (name, empty, update) => { const value = update(documents.get(name) ?? empty); documents.set(name, value); return value; },
  };
  const imports = {
    "./digestStorage": storage,
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
  await a.fetchBallDontLie(url(1), 30);
  await b.fetchBallDontLie(url(1), 30);
  assert.equal(f.calls(), 1);
  const results = await Promise.all(Array.from({ length: 10 }, (_, i) => b.fetchBallDontLie(url(i + 2), 30)));
  assert.equal(f.calls(), 5);
  assert.equal(results.filter(r => r.status === 429).length, 6);
  f.advance(60001);
  assert.equal((await a.fetchBallDontLie(url(30), 30)).status, 200);
  assert.equal(f.calls(), 6);
});
test("upstream 429 pauses all routes and denied roster pauses all teams", async () => {
  const f = fixture(), a = f.module(); f.deny(429);
  assert.equal((await a.fetchBallDontLie(url(1), 30)).status, 429);
  f.advance(61000);
  assert.equal((await f.module().fetchBallDontLie(url(2), 30)).status, 429);
  assert.equal(f.calls(), 1);
  f.advance(60000); f.deny(403);
  const roster = team => `https://api.balldontlie.io/v1/players/active?team_ids[]=${team}`;
  await a.fetchBallDontLie(roster(1), 3600);
  await f.module().fetchBallDontLie(roster(2), 3600);
  assert.equal(f.calls(), 2);
  f.advance(3600001); f.deny(200);
  assert.equal((await a.fetchBallDontLie(roster(2), 3600)).status, 200);
});
test("budget storage failure fails closed without calling the provider", async () => {
  const f = fixture(); f.storage.updateDigestDocument = async () => { throw new Error("storage unavailable"); };
  await assert.rejects(f.module().fetchBallDontLie(url(1), 30), /storage unavailable/);
  assert.equal(f.calls(), 0);
});
test("invalid teams and intervals never reach the provider", async () => {
  let calls = 0;
  const imports = {
    "next/server": { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } },
    "@/lib/ballDontLie": { fetchBallDontLie: async () => { calls++; return Response.json({ data: [] }); } },
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
test("standings reads never call upstream; partial refresh preserves the last complete snapshot", async () => {
  const f = fixture(); let page = 0;
  const route = load("app/api/standings/route.ts", {
    "next/server": { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } },
    "@/lib/digestStorage": f.storage,
    "@/lib/nbaDate": { getNBASeason: () => 2026, formatNBADate: () => "2026-10-28" },
    "@/lib/gameStatus": { isFinalStatus: () => true, compareStandings: () => 0 },
    "@/lib/ballDontLie": { fetchBallDontLie: async () => { page++; return Response.json({ data: [], meta: { next_cursor: page === 1 ? "next" : null } }); } },
  });
  assert.equal((await route.GET()).status, 503);
  assert.equal(page, 0);
  assert.equal((await route.POST({ headers: new Headers() })).status, 401);
  const request = { headers: new Headers({ authorization: "Bearer publisher" }) };
  assert.equal((await route.POST(request)).status, 202);
  assert.equal((await route.GET()).status, 503);
  await route.POST(request);
  assert.equal((await route.GET()).status, 200);
  assert.equal(page, 2);
  await route.GET(); assert.equal(page, 2);
  page = 0;
  await route.POST(request);
  assert.equal((await route.GET()).status, 200, "incomplete refresh preserves a usable snapshot");
  assert.equal(page, 1);
});

test("standings job waits through quota exhaustion and resumes until publication", async () => {
  const waits = []; let calls = 0;
  await syncStandings({ publishToken: "publisher", wait: async ms => { waits.push(ms); }, fetcher: async (_url, init) => {
    assert.equal(init.headers.Authorization, "Bearer publisher");
    calls++;
    return calls === 1 ? Response.json({ error: "quota" }, { status: 429, headers: { "Retry-After": "60" } }) : Response.json({ complete: calls === 3 }, { status: calls === 3 ? 200 : 202 });
  } });
  assert.deepEqual(waits, [60000, 15000]);
  assert.equal(calls, 3);
  await assert.rejects(syncStandings({ publishToken: "publisher", fetcher: async () => new Response(null, { status: 401 }) }), /401/);
});
