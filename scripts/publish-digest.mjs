import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { parseDigest } from "../src/lib/digest.ts";

const endpoint = "https://my-nba-feed.vercel.app/api/digest";
const fields = ["date", "style", "title", "content", "games_covered", "stats_highlighted", "metadata"];
const sameDigest = (a, b) => fields.every((field) => JSON.stringify(a?.[field]) === JSON.stringify(b?.[field]));

export async function publishDigest(payload, token, fetcher = fetch) {
  if (!token?.trim()) throw new Error("DIGEST_PUBLISH_TOKEN is missing");
  const digest = parseDigest(payload);
  const read = async () => {
    const response = await fetcher(`${endpoint}?date=${digest.date}`, {
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`Digest read failed (HTTP ${response.status})`);
    return (await response.json()).digest;
  };
  const existing = await read();
  if (existing) {
    if (!sameDigest(existing, digest)) throw new Error("An edition already exists for this date; refusing to overwrite it");
    return { status: "already-published", date: digest.date };
  }
  const response = await fetcher(endpoint, {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(20000),
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(digest),
  });
  if (response.status !== 201 || !(await response.json()).success) {
    throw new Error(`Digest publication failed (HTTP ${response.status})`);
  }
  if (!sameDigest(await read(), digest)) throw new Error("Publication was not confirmed by a fresh read");
  return { status: "published", date: digest.date };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (!process.argv[2]) throw new Error("Usage: npm run digest:publish -- data/digest-YYYY-MM-DD.json");
    const content = await readFile(process.argv[2], "utf8");
    if (content.length > 150000) throw new Error("Digest file is too large");
    const result = await publishDigest(JSON.parse(content), process.env.DIGEST_PUBLISH_TOKEN);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(error instanceof SyntaxError ? "Invalid digest JSON" : error.message);
    process.exitCode = 1;
  }
}
