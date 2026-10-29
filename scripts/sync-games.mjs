import { pathToFileURL } from "node:url";
import { setTimeout } from "node:timers/promises";

export async function syncGames({ token, fetcher = fetch, sleep = setTimeout, now = () => new Date() }) {
  if (!token?.trim()) throw new Error("DIGEST_PUBLISH_TOKEN is required");
  const endpoint = "https://my-nba-feed.vercel.app/api/sync/games";
  const request = async body => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const response = await fetcher(endpoint, { method: "POST", redirect: "error", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
      if (response.status === 429 && attempt < 4) {
        const retry = Number(response.headers.get("retry-after"));
        await sleep(Math.max(60, Math.min(Number.isFinite(retry) ? retry : 60, 300)) * 1000);
        continue;
      }
      if (!response.ok) throw new Error(`Game sync failed (HTTP ${response.status})`);
      return response.json();
    }
  };
  const games = [], cursors = new Set();
  let cursor;
  const syncedAt = now().toISOString();
  for (let page = 0; page < 60; page++) {
    if (page) await sleep(16000);
    const batch = await request({ action: "page", ...(cursor === undefined ? {} : { cursor }) });
    if (!Array.isArray(batch.data)) throw new Error("Invalid games response");
    games.push(...batch.data);
    const next = batch.meta?.next_cursor;
    if (next == null) {
      if (!games.length) throw new Error("Empty catalog; previous data preserved");
      const saved = await request({ action: "publish", syncedAt, games });
      if (!saved.success || saved.count !== games.length || saved.syncedAt !== syncedAt) throw new Error("Publication not confirmed");
      return { pages: page + 1, games: games.length, syncedAt };
    }
    if (!Number.isSafeInteger(next) || cursors.has(next)) throw new Error("Invalid games pagination");
    cursors.add(next); cursor = next;
  }
  throw new Error("Catalog exceeded page limit; previous data preserved");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  syncGames({ token: process.env.DIGEST_PUBLISH_TOKEN }).then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error.message); process.exitCode = 1; });
}
