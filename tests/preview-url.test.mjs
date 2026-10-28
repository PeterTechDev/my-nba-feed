import assert from "node:assert/strict";
import { test } from "node:test";
import { previewBaseURL } from "./preview-url.mjs";

test("preview BASE_URL accepts only this project's https host with an empty port", () => {
  assert.deepEqual([
    "https://my-nba-feed-git-main-petertechdevs-projects.vercel.app",
    "https://my-nba-feed-git-cursor-pet-30-petertechdevs-projects.vercel.app/schedule",
    "https://my-nba-feed-abc123def-petertechdevs-projects.vercel.app/",
    "https://MY-NBA-FEED-git-Main-petertechdevs-projects.vercel.app",
    // Node's URL parser treats :443 as the default https port and clears url.port.
    "https://my-nba-feed-git-main-petertechdevs-projects.vercel.app:443/path",
  ].map(previewBaseURL), [
    "https://my-nba-feed-git-main-petertechdevs-projects.vercel.app",
    "https://my-nba-feed-git-cursor-pet-30-petertechdevs-projects.vercel.app",
    "https://my-nba-feed-abc123def-petertechdevs-projects.vercel.app",
    "https://my-nba-feed-git-main-petertechdevs-projects.vercel.app",
    "https://my-nba-feed-git-main-petertechdevs-projects.vercel.app",
  ]);

  for (const raw of [
    "https://user:pass@my-nba-feed-git-main-petertechdevs-projects.vercel.app",
    "https://good@evil.com",
    // :8443 is kept; url.port is "8443", unlike :443.
    "https://my-nba-feed-git-main-petertechdevs-projects.vercel.app:8443/",
    "https://my-nba-feed-git-máin-petertechdevs-projects.vercel.app",
    "https://xn--my-nba-feed-git-main-petertechdevs-projects.vercel.app",
    "https://evil.com\\@my-nba-feed-git-main-petertechdevs-projects.vercel.app",
    "https://my-nba-feed-git-main-petertechdevs-projects.vercel.app\\.evil.com",
    "https://other-app-git-main-petertechdevs-projects.vercel.app",
    "https://extra.my-nba-feed-git-main-petertechdevs-projects.vercel.app",
    "http://my-nba-feed-git-main-petertechdevs-projects.vercel.app",
    "https://evil.com/?x=my-nba-feed-git-main-petertechdevs-projects.vercel.app",
    "https://my-nba-feed-abc-petertechdevs-projects.vercel.app",
  ]) assert.equal(previewBaseURL(raw), null, raw);
});
