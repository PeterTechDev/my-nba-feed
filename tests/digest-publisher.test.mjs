import assert from "node:assert/strict";
import { test } from "node:test";
import { publishDigest } from "../scripts/publish-digest.mjs";

const payload = { date: "2026-10-27", style: "analytical", title: "Recap", content: "Verified recap" };
const saved = { ...payload, games_covered: [], stats_highlighted: [], metadata: { model: "unknown", generation_time_ms: 0 } };

test("publisher authenticates only the production write, then verifies persisted content", async () => {
  const requests = [];
  const result = await publishDigest(payload, "test-token", async (url, options) => {
    requests.push({ url, options });
    return Response.json(requests.length === 1 ? { digest: null } : requests.length === 2 ? { success: true } : { digest: saved },
      { status: requests.length === 2 ? 201 : 200 });
  });
  assert.equal(result.status, "published");
  assert.equal(requests.length, 3);
  assert.ok(requests.every(({ url, options }) => url.startsWith("https://my-nba-feed.vercel.app/api/digest") && options.redirect === "error"));
  assert.equal(requests[1].options.headers.Authorization, "Bearer test-token");
  assert.equal(requests[0].options.headers, undefined);
});

test("publisher resumes safely and refuses to overwrite a different edition", async () => {
  let calls = 0;
  const fetcher = async () => { calls++; return Response.json({ digest: saved }); };
  assert.equal((await publishDigest(payload, "test-token", fetcher)).status, "already-published");
  await assert.rejects(publishDigest({ ...payload, content: "Replacement" }, "test-token", fetcher), /refusing to overwrite/);
  assert.equal(calls, 2);
});

test("publisher stops for missing credentials, invalid content, failed writes and unconfirmed persistence", async () => {
  await assert.rejects(publishDigest(payload, ""), /missing/);
  await assert.rejects(publishDigest({ ...payload, date: "2026-02-30" }, "test-token"), /Invalid/);
  await assert.rejects(publishDigest(payload, "test-token", async () => new Response(null, { status: 503 })), /read failed/);
  let calls = 0;
  await assert.rejects(publishDigest(payload, "test-token", async () => ++calls === 1 ? Response.json({ digest: null }) :
    Response.json({ error: "Unauthorized" }, { status: 401 })), /publication failed/);
  calls = 0;
  await assert.rejects(publishDigest(payload, "test-token", async () => ++calls === 2 ? Response.json({ success: true }, { status: 201 }) :
    Response.json({ digest: null })), /not confirmed/);
});
