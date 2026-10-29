import { test } from "node:test";
import assert from "node:assert/strict";
import { syncGames } from "../scripts/sync-games.mjs";

test("sync spaces pages, respects quota backoff and publishes only the complete catalog", async () => {
  const requests = [], waits = [];
  let calls = 0;
  const result = await syncGames({ token: "fixture", sleep: async ms => waits.push(ms), fetcher: async (_url, options) => {
    const body = JSON.parse(options.body); requests.push(body);
    if (body.action === "publish") return Response.json({ success: true, count: body.games.length, syncedAt: body.syncedAt });
    if (++calls === 1) return Response.json({}, { status: 429, headers: { "Retry-After": "90" } });
    return Response.json({ data: [{ id: calls }], meta: { next_cursor: calls === 2 ? 10 : null } });
  } });
  assert.equal(result.pages, 2);
  assert.equal(result.games, 2);
  assert.deepEqual(waits, [90000, 16000]);
  assert.deepEqual(requests.at(-1).games, [{ id: 2 }, { id: 3 }]);
});

test("broken or repeated pagination never replaces saved games", async () => {
  let published = false;
  await assert.rejects(syncGames({ token: "fixture", sleep: async () => {}, fetcher: async (_url, options) => {
    const body = JSON.parse(options.body);
    if (body.action === "publish") published = true;
    return Response.json({ data: [{ id: 1 }], meta: { next_cursor: 10 } });
  } }), /pagination/);
  assert.equal(published, false);
});

test("missing credentials and upstream failures do not publish", async () => {
  await assert.rejects(syncGames({ token: "" }), /required/);
  await assert.rejects(syncGames({ token: "fixture", fetcher: async () => Response.json({}, { status: 500 }) }), /HTTP 500/);
});
