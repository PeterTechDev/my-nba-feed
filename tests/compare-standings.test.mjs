import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { compareStandings } from "../src/lib/gameStatus.ts";

const require = createRequire(import.meta.url);
function load(file, globals = {}, imports = {}) {
  const source = readFileSync(new URL("../src/" + file, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: (id) => imports[id] ?? require(id), ...globals });
  return exports;
}

const record = (abbreviation, wins, losses) => ({ abbreviation, wins, losses });
const label = (team) => `${team.abbreviation} ${team.wins}-${team.losses}`;
const rank = (teams) => teams.slice().sort(compareStandings).map(label);

test("equal winning percentage ranks by wins minus losses, then by wins", () => {
  const lal = record("LAL", 3, 0);
  const mem = record("MEM", 4, 0);
  const okc = record("OKC", 4, 0);
  const nyk = record("NYK", 0, 3);
  const mia = record("MIA", 0, 4);
  const fewerWins = record("A", 1, 1);
  const moreWins = record("B", 2, 2);
  const shortSchedule = record("C", 2, 1);
  const longSchedule = record("D", 4, 2);

  assert.equal(Math.sign(compareStandings(mem, okc)), 0);
  assert.equal(Math.sign(compareStandings(okc, mem)), 0);
  assert.equal(Math.sign(compareStandings(lal, mem)), 1);
  assert.equal(Math.sign(compareStandings(mem, lal)), -1);
  assert.equal(Math.sign(compareStandings(lal, okc)), 1);
  assert.equal(Math.sign(compareStandings(nyk, mia)), -1);
  assert.equal(Math.sign(compareStandings(mia, nyk)), 1);
  assert.equal(Math.sign(compareStandings(moreWins, fewerWins)), -1);
  assert.equal(Math.sign(compareStandings(fewerWins, moreWins)), 1);
  assert.equal(Math.sign(compareStandings(longSchedule, shortSchedule)), -1);
  assert.equal(Math.sign(compareStandings(shortSchedule, longSchedule)), 1);

  assert.deepEqual(rank([lal, mem, okc]), ["MEM 4-0", "OKC 4-0", "LAL 3-0"]);
  assert.deepEqual(rank([lal, okc, mem]), ["OKC 4-0", "MEM 4-0", "LAL 3-0"]);
  assert.deepEqual(rank([mia, nyk]), ["NYK 0-3", "MIA 0-4"]);
  assert.deepEqual(rank([nyk, mia]), ["NYK 0-3", "MIA 0-4"]);
  assert.deepEqual(rank([fewerWins, moreWins]), ["B 2-2", "A 1-1"]);
  assert.deepEqual(rank([shortSchedule, longSchedule]), ["D 4-2", "C 2-1"]);
});

test("a complete tie returns 0 and sort keeps the input order", () => {
  const first = { abbreviation: "MEM", id: 15, wins: 4, losses: 0 };
  const second = { abbreviation: "OKC", id: 21, wins: 4, losses: 0 };
  assert.equal(Math.sign(compareStandings(first, second)), 0);
  assert.equal(Math.sign(compareStandings(second, first)), 0);
  assert.equal(Math.sign(compareStandings(first, { ...first })), 0);
  assert.deepEqual(rank([first, second]), ["MEM 4-0", "OKC 4-0"]);
  assert.deepEqual(rank([second, first]), ["OKC 4-0", "MEM 4-0"]);
  assert.deepEqual(rank([record("A", 0, 0), record("B", 0, 0)]), ["A 0-0", "B 0-0"]);
  assert.deepEqual(rank([record("B", 0, 0), record("A", 0, 0)]), ["B 0-0", "A 0-0"]);
});

test("an unplayed 0-0 team has a finite percentage and a defined rank", () => {
  // wins / (wins + losses || 1) makes 0-0 use denominator 1, so PCT is 0 rather than NaN.
  // That ties every 0-n team on percentage. The margin key then places 0-0 (0) ahead of 0-n (-n).
  const zero = record("ZERO", 0, 0);
  const opponents = [record("WIN", 1, 0), record("EVEN", 1, 1), record("BAD", 1, 100), record("LOSS", 0, 4), record("ALSO", 0, 0)];
  for (const opponent of opponents) {
    const delta = compareStandings(zero, opponent);
    assert.equal(Number.isFinite(delta), true, label(opponent));
    assert.equal(Number.isNaN(delta), false, label(opponent));
  }
  assert.equal(Math.sign(compareStandings(zero, record("ALSO", 0, 0))), 0);
  assert.equal(Math.sign(compareStandings(zero, record("WIN", 1, 0))), 1);
  assert.equal(Math.sign(compareStandings(zero, record("EVEN", 1, 1))), 1);
  assert.equal(Math.sign(compareStandings(zero, record("LOSS", 0, 1))), -1);
  assert.equal(Math.sign(compareStandings(zero, record("LOSS", 0, 4))), -1);
  assert.deepEqual(rank([
    record("LOSS", 0, 4),
    record("ZERO", 0, 0),
    record("BAD", 1, 100),
    record("WIN", 1, 0),
    record("EVEN", 1, 1),
  ]), ["WIN 1-0", "EVEN 1-1", "BAD 1-100", "ZERO 0-0", "LOSS 0-4"]);
});

const dates = load("lib/nbaDate.ts");
const status = load("lib/gameStatus.ts");
const teams = load("lib/teams.ts");
let standingsData = { season: 2026, asOf: "2026-10-27", standings: [] };
const pageImports = {
  "@/lib/nbaDate": dates,
  "@/lib/gameStatus": status,
  "@/lib/teams": teams,
  "@/components/DataError": load("components/DataError.tsx"),
  "@/hooks/useRemoteData": { useRemoteData: () => ({ data: standingsData, loading: false, error: false, retry() {} }) },
  "./SpoilerModeProvider": { useSpoilerContext: () => ({ hideScores: false }) },
};
pageImports["@/components/SpoilerGuard"] = load("components/SpoilerGuard.tsx", {}, pageImports);
const StandingsPage = load("app/standings/page.tsx", {}, pageImports).default;

function conferenceRows(html, heading) {
  const start = html.indexOf(heading);
  assert.notEqual(start, -1, heading);
  const nextHeading = html.indexOf("<h2", start + heading.length);
  const section = html.slice(start, nextHeading === -1 ? html.length : nextHeading);
  const bodyStart = section.indexOf("<tbody>");
  assert.notEqual(bodyStart, -1, heading);
  return [...section.slice(bodyStart).matchAll(/<tr[\s\S]*?<\/tr>/g)].map((match) => {
    const row = match[0];
    const name = row.match(/<span class="sr-only">([^<]*)<\/span>([A-Z0-9]+)/);
    assert.ok(name, row);
    const cells = [...row.matchAll(/<td[^>]*>([^<]*)<\/td>/g)].map((cell) => cell[1]);
    assert.equal(cells.length, 5, row);
    const [, wins, losses, pct, gb] = cells;
    return { team: name[2], wins, losses, pct, gb };
  });
}

const standing = (id, name, abbreviation, conference, division, wins, losses) =>
  ({ id, name, abbreviation, conference, division, wins, losses });

test("games behind on /standings follows the leader after compareStandings", () => {
  // GB is not a field on /api/standings. The only calculation is inline in
  // src/app/standings/page.tsx, from confTeams[0] after sort:
  // ((leaderWins - leaderLosses) - (wins - losses)) / 2
  // which is ((W1 - W) + (L - L1)) / 2. A zero renders as an em dash.
  standingsData = {
    season: 2026,
    asOf: "2026-10-27",
    standings: [
      standing(14, "Los Angeles Lakers", "LAL", "West", "Pacific", 3, 0),
      standing(15, "Memphis Grizzlies", "MEM", "West", "Southwest", 4, 0),
      standing(21, "Oklahoma City Thunder", "OKC", "West", "Northwest", 4, 0),
      standing(16, "Miami Heat", "MIA", "East", "Southeast", 0, 4),
      standing(20, "New York Knicks", "NYK", "East", "Atlantic", 0, 3),
      standing(2, "Boston Celtics", "BOS", "East", "Atlantic", 3, 0),
    ],
  };
  const html = renderToStaticMarkup(createElement(StandingsPage));
  assert.deepEqual(conferenceRows(html, "Western Conference"), [
    { team: "MEM", wins: "4", losses: "0", pct: "1.000", gb: "—" },
    { team: "OKC", wins: "4", losses: "0", pct: "1.000", gb: "—" },
    { team: "LAL", wins: "3", losses: "0", pct: "1.000", gb: "0.5" },
  ]);
  assert.deepEqual(conferenceRows(html, "Eastern Conference"), [
    { team: "BOS", wins: "3", losses: "0", pct: "1.000", gb: "—" },
    { team: "NYK", wins: "0", losses: "3", pct: ".000", gb: "3.0" },
    { team: "MIA", wins: "0", losses: "4", pct: ".000", gb: "3.5" },
  ]);
});

test("games behind can be negative when a worse percentage has a better margin", () => {
  standingsData = {
    season: 2026,
    asOf: "2026-10-27",
    standings: [
      standing(14, "Los Angeles Lakers", "LAL", "West", "Pacific", 5, 1),
      standing(21, "Oklahoma City Thunder", "OKC", "West", "Northwest", 1, 0),
      standing(16, "Miami Heat", "MIA", "East", "Southeast", 0, 4),
      standing(23, "Philadelphia 76ers", "PHI", "East", "Atlantic", 0, 0),
      standing(2, "Boston Celtics", "BOS", "East", "Atlantic", 1, 0),
    ],
  };
  const html = renderToStaticMarkup(createElement(StandingsPage));
  // LAL -1.5 is known, undesired behavior: a worse percentage can still show
  // negative games behind. This locks the current output, not the desired one.
  assert.deepEqual(conferenceRows(html, "Western Conference"), [
    { team: "OKC", wins: "1", losses: "0", pct: "1.000", gb: "—" },
    { team: "LAL", wins: "5", losses: "1", pct: ".833", gb: "-1.5" },
  ]);
  assert.deepEqual(conferenceRows(html, "Eastern Conference"), [
    { team: "BOS", wins: "1", losses: "0", pct: "1.000", gb: "—" },
    { team: "PHI", wins: "0", losses: "0", pct: ".000", gb: "0.5" },
    { team: "MIA", wins: "0", losses: "4", pct: ".000", gb: "2.5" },
  ]);
});
