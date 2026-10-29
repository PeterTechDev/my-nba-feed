import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

test("forced retries obey Retry-After and allow a new request after the cooldown", async () => {
  let now = Date.now(), calls = 0;
  class Clock extends Date { static now() { return now; } }
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/hooks/useRemoteData.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
    { exports, require: id => id === "react" ? {} : { protectedSpoilerUrl: () => false }, Date: Clock, AbortController, setTimeout, clearTimeout,
      fetch: async () => ++calls === 1 ? Response.json({}, { status: 503, headers: { "Retry-After": "120" } }) : Response.json({ games: [] }) });
  await assert.rejects(exports.fetchRemoteData("/api/schedule"));
  await assert.rejects(exports.fetchRemoteData("/api/schedule", true), /Retry pending/);
  assert.equal(calls, 1);
  now += 120001;
  assert.deepEqual(await exports.fetchRemoteData("/api/schedule", true), { games: [] });
  assert.equal(calls, 2);
});
