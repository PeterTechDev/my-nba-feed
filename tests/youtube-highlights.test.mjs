import assert from "node:assert/strict";
import { test } from "node:test";
import { syncYouTubeHighlights, endpoint } from "../scripts/sync-youtube-highlights.mjs";
import { teams } from "../src/lib/teams.ts";
import { NBA_CHANNEL_ID, highlightMatch, parseHighlightPublication, recentHighlights } from "../src/lib/youtubeHighlights.ts";

const now = new Date("2026-10-27T11:15:00Z");
const title = "BULLS at CELTICS | FULL GAME HIGHLIGHTS | October 26, 2026";
const clip = { id: "DTNqMLNVBC8", title, date: "2026-10-26", awayTeamId: 5, homeTeamId: 2,
  thumbnail: "https://i.ytimg.com/vi/DTNqMLNVBC8/hqdefault.jpg", duration: 600, retrievedAt: now.toISOString() };
const upload = (id = clip.id, videoTitle = title, published = "2026-10-27T04:00:00Z") => ({ snippet: { title: videoTitle }, contentDetails: { videoId: id, videoPublishedAt: published } });

function fixture({ pages = [{ items: [upload()] }], saved = { syncedAt: null, videos: [] }, failure = "", details = {}, acknowledge = true, confirm = true } = {}) {
  const requests = [];
  let page = 0;
  return {
    requests, get saved() { return saved; },
    fetcher: async (url, options) => {
      requests.push({ url, options });
      assert.equal(options.redirect, "error");
      assert.ok(!url.includes("youtube-key") && !url.includes("publisher-secret"));
      if (url.startsWith(endpoint)) {
        assert.equal(options.headers.Authorization, "Bearer publisher-secret");
        assert.equal(options.headers["x-goog-api-key"], undefined);
        if (options.method === "POST") {
          if (failure === "publication") return Response.json({ error: "offline" }, { status: 503 });
          const body = JSON.parse(options.body);
          if (confirm) saved = { ...body, videos: [...saved.videos, ...body.videos] };
          return Response.json({ success: acknowledge }, { status: 201 });
        }
        return Response.json(saved);
      }
      const resource = new URL(url).pathname.split("/").at(-1);
      assert.equal(new URL(url).origin, "https://www.googleapis.com");
      assert.equal(options.headers["x-goog-api-key"], "youtube-key");
      assert.equal(options.headers.Authorization, undefined);
      if (failure === resource) return Response.json({ error: "quota" }, { status: 403 });
      if (resource === "channels") return Response.json({ items: [{ id: NBA_CHANNEL_ID, contentDetails: { relatedPlaylists: { uploads: "UUWJ2lWNubArHWmf3FIHbfcQ" } } }] });
      if (resource === "playlistItems") return Response.json(pages[page++]);
      if (resource === "videos") return Response.json({ items: [{ id: clip.id,
        snippet: { channelId: NBA_CHANNEL_ID, title, thumbnails: { high: { url: clip.thumbnail } } },
        contentDetails: { duration: "PT10M" }, status: { privacyStatus: "public", embeddable: true }, ...details }] });
      throw new Error("Unexpected destination");
    },
  };
}
const run = (f, extra = {}) => syncYouTubeHighlights({ apiKey: "youtube-key", publishToken: "publisher-secret", now, fetcher: f.fetcher, ...extra });

test("titles identify the actual matchup and game date, excluding Shorts and single-player videos", () => {
  assert.deepEqual(highlightMatch(title, teams), { date: "2026-10-26", awayTeamId: 5, homeTeamId: 2 });
  assert.deepEqual(highlightMatch("EXTENDED: LAKERS at 76ERS | FULL GAME HIGHLIGHTS | October 25, 2026", teams), { date: "2026-10-25", awayTeamId: 14, homeTeamId: 23 });
  for (const invalid of ["Celtics win by 20", "Tatum player highlights", title.replace("October 26", "February 30"), title.replace("BULLS", "UNKNOWN"), title.replace("BULLS", "CELTICS")]) assert.equal(highlightMatch(invalid, teams), null);
});

test("sync paginates NBA uploads, prefers the standard game recap, publishes once and verifies persistence", async () => {
  const f = fixture({ pages: [
    { items: [upload("EXTENDED123", "EXTENDED: " + title), upload("SHORT000001", "Player dunk #shorts")], nextPageToken: "page2" },
    { items: [upload(), upload("OLDVIDEO123", title, "2026-09-01T00:00:00Z")] },
  ] });
  assert.deepEqual(await run(f), { status: "synced", apiRequests: 4, added: 1 });
  assert.deepEqual(f.saved.videos, [clip]);
  const lookup = f.requests.find((request) => request.url.includes("/videos?"));
  assert.equal(new URL(lookup.url).searchParams.get("id"), clip.id);
  const before = f.requests.length;
  assert.deepEqual(await run(f), { status: "already-synced", apiRequests: 0, added: 0 });
  assert.equal(f.requests.length, before + 1, "A repeated run only reads persisted state");
});

test("previously saved games are not looked up again, and failed syncs preserve them", async () => {
  const existing = { syncedAt: "2026-10-26T11:15:00Z", videos: [{ ...clip, retrievedAt: "2026-10-26T12:00:00Z" }] };
  const f = fixture({ saved: existing });
  assert.deepEqual(await run(f), { status: "synced", apiRequests: 2, added: 0 });
  assert.equal(f.saved.videos.length, 1);
  assert.ok(!f.requests.some((request) => request.url.includes("/videos?")));
  for (const failure of ["channels", "playlistItems", "videos", "publication"]) {
    const failed = fixture({ failure });
    await assert.rejects(run(failed), /failed/);
    assert.equal(failed.saved.syncedAt, null);
    assert.equal(failed.saved.videos.length, 0);
  }
  await assert.rejects(run(fixture({ confirm: false })), /persistence was not confirmed/);
});

test("a private or non-embeddable video is never published as playable", async () => {
  for (const status of [{ privacyStatus: "private", embeddable: true }, { privacyStatus: "public", embeddable: false }]) {
    const f = fixture({ details: { status } });
    assert.equal((await run(f)).added, 0);
    assert.equal(f.saved.videos.length, 0);
  }
});

test("publication validation rejects mismatched games, unsafe thumbnails, stale data and duplicates", () => {
  const parse = (videos) => parseHighlightPublication({ syncedAt: now.toISOString(), videos }, teams, now);
  assert.deepEqual(parse([clip]).videos, [clip]);
  for (const changes of [{ id: 12345678901 }, { date: "2026-10-25" }, { homeTeamId: 14 }, { duration: -1 }, { thumbnail: "https://evil.test/x" },
    { thumbnail: "https://i.ytimg.com.evil.test/vi/DTNqMLNVBC8/hqdefault.jpg" }, { retrievedAt: "2026-09-01T00:00:00Z" }]) assert.throws(() => parse([{ ...clip, ...changes }]));
  assert.throws(() => parse([clip, clip]));
  assert.equal(recentHighlights({ videos: [clip] }, new Date("2026-11-27T11:15:00Z")).length, 0);
});

test("missing keys fail before network requests", async () => {
  let called = false;
  await assert.rejects(syncYouTubeHighlights({ publishToken: "publisher", fetcher: () => { called = true; } }), /YOUTUBE_API_KEY/);
  await assert.rejects(syncYouTubeHighlights({ apiKey: "key", fetcher: () => { called = true; } }), /DIGEST_PUBLISH_TOKEN/);
  assert.equal(called, false);
});
