import { pathToFileURL } from "node:url";

export async function syncStandings({ publishToken, fetcher = fetch, wait = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  if (!publishToken) throw new Error("DIGEST_PUBLISH_TOKEN is required");
  for (let attempt = 0; attempt < 60; attempt++) {
    const response = await fetcher("https://my-nba-feed.vercel.app/api/standings", {
      method: "POST", headers: { Authorization: `Bearer ${publishToken}` },
      redirect: "error", signal: AbortSignal.timeout(20000),
    });
    if (response.ok && (await response.json()).complete) return;
    if (!response.ok && response.status !== 429) throw new Error(`Standings sync failed (${response.status})`);
    const seconds = Math.max(15, Math.min(300, Number(response.headers.get("retry-after")) || 15));
    await wait(seconds * 1000);
  }
  throw new Error("Standings sync exceeded its retry budget; previous snapshot preserved");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await syncStandings({ publishToken: process.env.DIGEST_PUBLISH_TOKEN });
  console.log("Standings snapshot updated");
}
