import assert from "node:assert/strict";
import { test } from "node:test";
import { digestDates, runDailyDigest, scoreboardFacts } from "../scripts/generate-digest.mjs";

const now = new Date("2026-10-27T11:00:00Z");
const game = {
  id: "game-1", date: "2026-10-27T00:30:00Z", status: { type: { completed: true, name: "STATUS_FINAL" } },
  competitions: [{ competitors: [
    { homeAway: "home", score: "134", team: { displayName: "Boston Celtics", abbreviation: "BOS" } },
    { homeAway: "away", score: "99", team: { displayName: "Chicago Bulls", abbreviation: "CHI" } },
  ] }],
};
const board = { leagues: [{ slug: "nba" }], events: [game] };
const boston = { error: null, record: { wins: 2, losses: 1 }, nextGame: null,
  lastGame: { date: "2026-10-26", homeTeam: { abbreviation: "BOS" }, awayTeam: { abbreviation: "CHI" }, homeScore: 134, awayScore: 99 } };
const output = { title: "Boston leads the briefing", content: "## Celtics first\n\nBoston beat Chicago 134–99." };

function fixture({ scoreboard = board, celtics = boston, generated = output, status = "stop", existing = null, apiError = false } = {}) {
  let saved = existing;
  const calls = [];
  return {
    calls, get saved() { return saved; },
    fetcher: async (url, options = {}) => {
      calls.push({ url, options });
      assert.equal(options.redirect, "error");
      if (url.includes("/api/digest")) {
        if (options.method === "POST") { saved = JSON.parse(options.body); return Response.json({ success: true }, { status: 201 }); }
        return Response.json({ digest: saved });
      }
      if (url.includes("espn.com")) return Response.json(scoreboard);
      if (url.includes("/api/games")) return Response.json(celtics);
      if (url === "http://127.0.0.1:8080/v1/chat/completions") {
        if (apiError) return Response.json({ error: { code: "invalid_model" } }, { status: 400 });
        return Response.json({ choices: [{ finish_reason: status, message: { content: JSON.stringify(generated) } }] });
      }
      throw new Error("Unexpected network destination");
    },
  };
}
const run = (f, extra = {}) => runDailyDigest({ now, publishToken: "publisher-secret", fetcher: f.fetcher, ...extra });

test("daily dates use the NBA calendar across midnight, month boundaries and daylight saving", () => {
  assert.deepEqual(digestDates(now), { date: "2026-10-27", previousDate: "2026-10-26" });
  assert.deepEqual(digestDates(new Date("2027-01-01T02:00:00Z")), { date: "2026-12-31", previousDate: "2026-12-30" });
  assert.deepEqual(digestDates(new Date("2026-03-09T11:00:00Z")), { date: "2026-03-09", previousDate: "2026-03-08" });
});

test("scoreboard validation rejects missing, duplicated, unfinished and wrong-date games", () => {
  assert.equal(scoreboardFacts(board, "2026-10-26").games[0].margin, 35);
  assert.deepEqual(scoreboardFacts({ ...board, events: [] }, "2026-10-26"), { games: [], unplayed: [] });
  for (const value of [{}, { ...board, events: [game, game] }, { ...board, events: [{ ...game, date: "2026-10-25T20:00:00Z" }] },
    { ...board, events: [{ ...game, status: { type: { completed: false } } }] },
    { ...board, events: [{ ...game, competitions: [] }] }]) {
    assert.throws(() => scoreboardFacts(value, "2026-10-26"));
  }
  const postponed = scoreboardFacts({ ...board, events: [{ ...game, status: { type: { name: "STATUS_POSTPONED" } } }] }, "2026-10-26");
  assert.equal(postponed.games.length, 0);
  assert.equal(postponed.unplayed[0].status, "STATUS_POSTPONED");
});

test("full generator uses only runner AI, authenticates the publisher, and verifies the saved edition", async () => {
  const f = fixture();
  const result = await run(f);
  assert.equal(result.status, "published");
  assert.equal(result.date, "2026-10-27");
  assert.deepEqual(f.saved.games_covered, ["CHI 99–134 BOS"]);
  assert.match(f.saved.content, /League date: 2026-10-26/);
  assert.match(f.saved.content, /scoreboard\?dates=20261026/);
  assert.equal(f.saved.metadata.model, "Qwen2.5-7B-Instruct (CPU, Q4_K_M)");
  assert.ok(f.saved.metadata.generation_time_ms >= 0);
  for (const { url, options } of f.calls) {
    assert.equal(options.headers?.Authorization, url.includes("/api/digest") && options.method === "POST" ? "Bearer publisher-secret" : undefined);
    assert.ok(!url.includes("api.openai.com"));
  }
  const request = JSON.parse(f.calls.find(({ url }) => url.startsWith("http://127.0.0.1")).options.body);
  assert.equal(request.response_format.schema.additionalProperties, false);
  assert.equal(request.model, "qwen2.5-7b-instruct");
  assert.equal(request.max_tokens, 1200);
});

test("repeat runs skip generation; replacement requires an explicit manual option", async () => {
  const f = fixture({ existing: { date: "2026-10-27", title: "Old edition" } });
  assert.equal((await run(f)).status, "already-published");
  assert.equal(f.calls.length, 1);
  assert.equal((await run(f, { replaceExisting: true })).status, "published");
  assert.equal(f.saved.title, output.title);
});

test("source disagreement, invalid generation, incomplete responses and model errors never publish", async () => {
  for (const config of [{ celtics: { error: "Unavailable" } },
    { celtics: { ...boston, lastGame: { ...boston.lastGame, homeScore: 100 } } },
    { generated: { title: "No content" } }, { generated: { ...output, title: "" } },
    { status: "incomplete" }, { apiError: true }, { scoreboard: {} }]) {
    const f = fixture(config);
    await assert.rejects(run(f));
    assert.equal(f.calls.filter(({ url, options }) => url.includes("/api/digest") && options.method === "POST").length, 0);
    assert.equal(f.saved, null);
  }
});

test("a verified empty game day produces an honest edition with no fabricated matchups", async () => {
  const f = fixture({ scoreboard: { ...board, events: [] }, generated: { title: "Quiet league night", content: "There were no completed games." } });
  await run(f);
  assert.deepEqual(f.saved.games_covered, []);
  assert.deepEqual(f.saved.stats_highlighted, ["0 completed games"]);
});

test("non-transient model errors preserve existing content without repeated generation", async () => {
  const f = fixture({ apiError: true });
  await assert.rejects(run(f), /invalid_model/);
  assert.equal(f.calls.filter(({ url }) => url.startsWith("http://127.0.0.1")).length, 1);
  assert.equal(f.saved, null);
});
