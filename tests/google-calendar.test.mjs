import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/googleCalendar.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, URLSearchParams });
const { getGoogleCalendarUrl } = exports;
const now = Date.parse("2026-10-28T12:00:00Z");
const game = { startTime: "2026-10-28T23:30:00-03:00", status: "Scheduled", awayTeam: { name: "Celtics & Friends" }, homeTeam: { name: "Knicks" } };
test("calendar link preserves timezone, date rollover and encoded matchup", () => {
  const url = new URL(getGoogleCalendarUrl(game, now));
  assert.equal(url.origin, "https://calendar.google.com");
  assert.equal(url.searchParams.get("text"), "NBA: Celtics & Friends at Knicks");
  assert.equal(url.searchParams.get("dates"), "20261029T023000Z/20261029T053000Z");
  assert.match(url.searchParams.get("details"), /does not update automatically/);
});
test("unavailable, past and cancelled games have no calendar link", () => {
  for (const startTime of [null, undefined, "garbage", "2026-10-29", "2026-10-29T12:00:00", "2026-10-27T00:00:00Z"]) assert.equal(getGoogleCalendarUrl({ ...game, startTime }, now), null);
  for (const status of ["Final/OT", "Live", "Postponed", "Cancelled", "Canceled", "In Progress"]) assert.equal(getGoogleCalendarUrl({ ...game, status }, now), null);
});
