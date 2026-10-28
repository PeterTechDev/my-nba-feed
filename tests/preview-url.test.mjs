import assert from "node:assert/strict";
import { test } from "node:test";
import { previewBaseURL } from "./preview-url.mjs";

const good = [
  "https://my-nba-feed-git-main-petertechdevs-projects.vercel.app",
  "https://my-nba-feed-abc-petertechdevs-projects.vercel.app/standings",
  "https://preview-petertechdevs-projects.vercel.app/",
  "https://a-b-c-petertechdevs-projects.vercel.app/path?q=1",
  "https://TEAM-petertechdevs-projects.vercel.app",
];

const bad = [
  "https://evil.com/?x=-petertechdevs-projects.vercel.app",
  "https://x-petertechdevs-projects.vercel.app.evil.com",
  "http://my-nba-feed-petertechdevs-projects.vercel.app",
  "https://petertechdevs-projects.vercel.app",
  "https://not-petertechdevs-projects.vercel.app.attacker.com/ok",
];

test("preview BASE_URL accepts only an https host ending in the project suffix", () => {
  assert.deepEqual(good.map(previewBaseURL), [
    "https://my-nba-feed-git-main-petertechdevs-projects.vercel.app",
    "https://my-nba-feed-abc-petertechdevs-projects.vercel.app",
    "https://preview-petertechdevs-projects.vercel.app",
    "https://a-b-c-petertechdevs-projects.vercel.app",
    "https://team-petertechdevs-projects.vercel.app",
  ]);
  assert.deepEqual(bad.map(previewBaseURL), [null, null, null, null, null]);
});
