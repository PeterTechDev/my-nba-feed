import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function fixture({ live = false, fail = false } = {}) {
  let now = Date.parse("2026-10-29T00:30:00Z"), calls = 0;
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  const game = { id: 1, date: "2026-10-28", season: 2026, status: live ? "1st Qtr" : "Final", datetime: "2026-10-29T00:00:00Z", home_team: { id: 2, name: "Celtics", abbreviation: "BOS" }, visitor_team: { id: 14, name: "Lakers", abbreviation: "LAL" }, home_team_score: 10, visitor_team_score: 12 };
  const documents = new Map([["league-games.json", { syncedAt: "2026-10-28T12:00:00Z", games: [game] }]]);
  const imports = {
    "next/cache": { unstable_cache: fn => fn },
    "./documentStorage": { readDocument: async (key, empty) => documents.get(key) ?? empty, updateDocument: async (key, empty, update) => { const value = update(documents.get(key) ?? empty); documents.set(key, value); return value; } },
    "./ballDontLie": { fetchBallDontLieSource: async () => { calls++; if (fail) return Response.json({}, { status: 429 }); return Response.json({ data: [{ ...game, status: "Final", home_team_score: 100, visitor_team_score: 102 }], meta: {} }); } },
    "./nbaDate": { getNBASeason: () => 2026, formatNBADate: (date = new Clock()) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(date) },
    "./gameStatus": { isFinalStatus: value => value === "Final", isLiveStatus: value => value === "1st Qtr", getGameStartTime: value => value.datetime },
  };
  function module() {
    const exports = {};
    vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/leagueSnapshot.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
      { exports, require: id => imports[id], Date: Clock, URL, URLSearchParams, Response, console: { error() {} } });
    return exports;
  }
  return { module, documents, game, calls: () => calls, advance: ms => { now += ms; } };
}

test("many visitors and date ranges share saved games without provider calls", async () => {
  const f = fixture(), api = f.module();
  for (let i = 0; i < 100; i++) {
    const r = await api.fetchSavedGames("https://api.balldontlie.io/v1/games?team_ids[]=2&seasons[]=2026");
    assert.equal((await r.json()).data.length, 1);
  }
  assert.equal((await (await api.fetchSavedGames("https://api.balldontlie.io/v1/games?team_ids[]=3")).json()).data.length, 0);
  assert.equal((await (await api.fetchSavedGames("https://api.balldontlie.io/v1/games?start_date=2026-11-01")).json()).data.length, 0);
  assert.equal(f.calls(), 0);
});

test("separate instances reserve only one league-wide live refresh and preserve final results", async () => {
  const f = fixture({ live: true });
  const results = await Promise.all(Array.from({ length: 20 }, (_, i) => f.module().fetchSavedGames(`https://api.balldontlie.io/v1/games?team_ids[]=${i % 2 ? 14 : 2}`)));
  assert.equal(results.every(r => r.ok), true);
  assert.equal(f.calls(), 1);
  f.advance(61000);
  const games = (await (await f.module().fetchSavedGames("https://api.balldontlie.io/v1/games?team_ids[]=14")).json()).data;
  assert.equal(games[0].status, "Final");
  assert.equal(games[0].home_team_score, 100);
  assert.equal(f.calls(), 1, "finished games no longer trigger live polling");
});

test("quota failure retains games and throttles subsequent live attempts", async () => {
  const f = fixture({ live: true, fail: true });
  for (let i = 0; i < 10; i++) {
    const r = await f.module().fetchSavedGames("https://api.balldontlie.io/v1/games");
    assert.equal(r.status, 200);
    assert.equal((await r.json()).data[0].home_team_score, 10);
  }
  assert.equal(f.calls(), 1);
});

test("invalid provider records and duplicate IDs are rejected before publication", () => {
  const f = fixture(), { validateGames } = f.module();
  assert.throws(() => validateGames([{ ...f.game, home_team_score: -1 }]));
  assert.throws(() => validateGames([f.game, f.game]));
});
