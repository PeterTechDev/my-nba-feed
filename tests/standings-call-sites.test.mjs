import { leagueServices, publishStandings } from "./helpers/league-services.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
function load(file, globals = {}, imports = {}) {
  imports = { ...leagueServices(globals.fetch), ...imports };
  const source = readFileSync(new URL("../src/" + file, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, URLSearchParams, Buffer,
    require: (id) => imports[id] ?? require(id),
    setTimeout, clearTimeout, AbortController, URL, Date,
    ...globals,
  });
  return exports;
}

const nextServer = { NextResponse: { json: (body, options) => ({ status: options?.status ?? 200, body }) } };
const dates = load("lib/nbaDate.ts");
const status = load("lib/gameStatus.ts");
const teams = load("lib/teams.ts");
const imports = {
  "next/server": nextServer,
  "@/lib/nbaDate": dates,
  "@/lib/gameStatus": status,
  "@/lib/teams": teams,
};

const bdlTeam = (id, abbreviation, name, conference, division) => ({
  id, abbreviation, name, full_name: name, conference, division,
});
const finalGame = (home, away, homeScore, awayScore) => ({
  status: "Final",
  home_team: home,
  visitor_team: away,
  home_team_score: homeScore,
  visitor_team_score: awayScore,
});

test("standings API returns compareStandings order, not numeric id order", async () => {
  const hornets = bdlTeam(4, "CHA", "Charlotte Hornets", "East", "Southeast");
  const lakers = bdlTeam(14, "LAL", "Los Angeles Lakers", "West", "Pacific");
  const grizzlies = bdlTeam(15, "MEM", "Memphis Grizzlies", "West", "Southwest");
  const thunder = bdlTeam(21, "OKC", "Oklahoma City Thunder", "West", "Northwest");
  const games = [
    ...Array.from({ length: 4 }, () => finalGame(grizzlies, hornets, 110, 100)),
    ...Array.from({ length: 4 }, () => finalGame(thunder, hornets, 120, 99)),
    ...Array.from({ length: 3 }, () => finalGame(lakers, hornets, 105, 98)),
  ];
  const fetch = async () => ({
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: async () => ({ data: games, meta: { next_cursor: null } }),
  });
  const route = load("app/api/standings/route.ts", { process: { env: { BALLDONTLIE_KEY: "fixture", DIGEST_PUBLISH_TOKEN: "fixture-publisher" } }, fetch }, imports);
  await publishStandings(route);
  const result = await route.GET();
  assert.equal(result.status, 200);
  // Copy out of the route's vm realm before deep equality.
  const rows = Array.from(result.body.standings, (team) => `${team.abbreviation} ${team.wins}-${team.losses}`);
  assert.deepEqual(rows, ["MEM 4-0", "OKC 4-0", "LAL 3-0", "CHA 0-11"]);
});

test("team panel rank follows compareStandings, not the standings payload order", async () => {
  const celtics = teams.getCeltics();
  const standings = [
    { id: 2, name: "Boston Celtics", abbreviation: "BOS", conference: "East", division: "Atlantic", wins: 0, losses: 3 },
    { id: 20, name: "New York Knicks", abbreviation: "NYK", conference: "East", division: "Atlantic", wins: 0, losses: 4 },
    { id: 1, name: "Atlanta Hawks", abbreviation: "ATL", conference: "East", division: "Southeast", wins: 4, losses: 0 },
  ];
  const hooks = [];
  let index = 0;
  let effects = [];
  let html = "";
  const useState = (initial) => {
    const slot = index++;
    if (hooks.length <= slot) hooks.push(initial);
    return [hooks[slot], (value) => {
      hooks[slot] = typeof value === "function" ? value(hooks[slot]) : value;
      render();
    }];
  };
  const useEffect = (effect) => { effects.push(effect); };
  const fetch = async (url) => {
    if (String(url).startsWith("/api/schedule")) return { json: async () => ({ games: [] }) };
    if (url === "/api/standings") return { json: async () => ({ standings }) };
    throw new Error(`Unexpected request ${url}`);
  };
  const Panel = load("components/TeamContextPanel.tsx", { fetch }, {
    react: { useState, useEffect },
    "next/link": { default: "a" },
    "@/hooks/useTeam": { useTeam: () => ({ selectedTeam: celtics }) },
    "@/hooks/useGameData": { useGameData: () => ({ record: { wins: 1, losses: 0 } }) },
    "@/lib/gameStatus": status,
  }).default;
  const render = () => {
    index = 0;
    effects = [];
    html = renderToStaticMarkup(createElement(Panel));
  };
  render();
  assert.match(html, /animate-pulse/);
  for (const effect of effects) effect();
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(html, /Rank<\/p><p class="mt-1.5 text-xl font-bold text-white">#2<\/p>/);
  assert.doesNotMatch(html, /Rank<\/p><p class="mt-1.5 text-xl font-bold text-white">#1<\/p>/);
});
