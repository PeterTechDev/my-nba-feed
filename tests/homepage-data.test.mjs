import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(file, globals = {}, imports = {}) {
  const source = readFileSync(new URL("../src/" + file, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: (id) => imports[id] ?? require(id), ...globals });
  return exports;
}
const status = load("lib/gameStatus.ts");
const dates = load("lib/nbaDate.ts");
const { teams, getContrastColor } = load("lib/teams.ts");

test("all 30 team logos are bundled SVGs rather than runtime CDN requests", () => {
  assert.equal(teams.length, 30);
  for (const team of teams) {
    assert.equal(team.logo, `/teams/${team.nbaComId}.svg`, team.name);
    const svg = readFileSync(new URL(`../public${team.logo}`, import.meta.url), "utf8");
    assert.match(svg, /<svg\b/);
    assert.match(svg, /viewBox=/);
    assert.doesNotMatch(svg, /<script\b|<foreignObject\b|\bon\w+\s*=|(?:href|url)\s*[=(]\s*["']?https?:/i);
  }
});

test("only explicit in-progress statuses are live", () => {
  for (const value of ["2026-10-27T23:30:00Z", "7:30 pm ET", "Scheduled", "Final", "Final/OT", "Postponed", "", "Cancelled"]) {
    assert.equal(status.isLiveStatus(value), false, value);
  }
  for (const value of ["1st Qtr", "2nd Qtr", "3rd Qtr", "4th Qtr", "Halftime", "End of 1st", "OT", "2OT", "In Progress"]) {
    assert.equal(status.isLiveStatus(value), true, value);
  }
  assert.equal(status.isFinalStatus("Final/OT"), true);
});

test("tipoff uses an actual timestamp and never invents midnight", () => {
  const base = { date: "2026-10-27", status: "7:30 pm ET" };
  assert.equal(status.getGameStartTime(base), null);
  assert.equal(status.getGameStartTime({ ...base, datetime: "2026-10-27T23:30:00Z" }), "2026-10-27T23:30:00.000Z");
  assert.equal(status.getGameStartTime({ ...base, status: "2026-10-27T23:30:00Z" }), "2026-10-27T23:30:00.000Z");
  assert.equal(status.getGameStartTime({ ...base, datetime: "invalid" }), null);
  assert.equal(dates.formatTipoff(null), "Time TBD");
  assert.equal(dates.formatTipoff(null, base.status), base.status);
});

test("league date-only values keep their calendar day across timezones and DST", () => {
  const previous = process.env.TZ;
  try {
    for (const zone of ["America/Bahia", "America/Los_Angeles", "America/New_York", "Asia/Tokyo"]) {
      process.env.TZ = zone;
      assert.equal(dates.formatGameDate("2026-10-26", { month: "short", day: "numeric" }), "Oct 26", zone);
      assert.equal(dates.gameDaysAgo("2026-10-26", new Date("2026-10-27T10:00:00")), 1, zone);
      assert.equal(dates.gameDaysAgo("2026-10-27", new Date("2026-10-27T10:00:00")), 0, zone);
      assert.equal(dates.gameDaysAgo("2026-03-08", new Date("2026-03-09T10:00:00")), 1, zone);
    }
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test("team surfaces and actions have at least 4.5:1 contrast for all 30 teams", () => {
  assert.equal(teams.length, 30);
  const luminance = (hex) => {
    const channels = hex.match(/[a-f\d]{2}/gi).map((part) => parseInt(part, 16) / 255)
      .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  for (const team of teams) {
    for (const color of [team.primaryColor, team.secondaryColor]) {
      const values = [luminance(color), luminance(getContrastColor(color))].sort((a, b) => a - b);
      assert.ok((values[1] + 0.05) / (values[0] + 0.05) >= 4.5, team.name);
    }
  }
  assert.equal(getContrastColor("#000000"), "#ffffff");
});

test("games API separates scheduled, live, final and postponed games", async () => {
  const now = new Date("2026-10-27T10:00:00Z");
  class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : [now])); } }
  const home_team = { id: 2, name: "Celtics", abbreviation: "BOS" };
  const visitor_team = { id: 3, name: "Nets", abbreviation: "BKN" };
  const base = { home_team, visitor_team, home_team_score: 0, visitor_team_score: 0 };
  let games = [
    { ...base, id: 1, date: "2026-10-26", status: "Final", home_team_score: 118, visitor_team_score: 107 },
    { ...base, id: 2, date: "2026-10-27", status: "2026-10-27T23:30:00Z" },
    { ...base, id: 3, date: "2026-10-27", status: "Postponed", postponed: true },
  ];
  const route = load("app/api/games/route.ts", {
    Date: FixedDate, process: { env: { BALLDONTLIE_KEY: "fixture" } },
    fetch: async () => ({ ok: true, json: async () => ({ data: games }) }),
  }, {
    "next/server": { NextResponse: { json: (body) => body } },
    "@/lib/nbaDate": dates, "@/lib/gameStatus": status,
  });
  const request = { nextUrl: new URL("http://localhost/api/games?teamId=2") };
  let result = await route.GET(request);
  assert.equal(result.currentGame, null);
  assert.equal(result.lastGame.date, "2026-10-26");
  assert.equal(result.nextGame.id, 2);
  assert.equal(result.nextGame.startTime, "2026-10-27T23:30:00.000Z");
  games[1] = { ...games[1], status: "1st Qtr", datetime: "2026-10-27T23:30:00Z" };
  result = await route.GET(request);
  assert.equal(result.currentGame.id, 2);
  assert.equal(result.nextGame, null);
  games[1] = { ...games[1], status: "Final/OT", home_team_score: 100, visitor_team_score: 110 };
  result = await route.GET(request);
  assert.equal(result.currentGame, null);
  assert.equal(result.lastGame.id, 2);
  assert.equal(result.record.wins, 1);
  assert.equal(result.record.losses, 1);
});
