import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// Full hostname, case-insensitive. Nine-character deployment ids, or a git branch slug.
const PREVIEW_HOST = /^my-nba-feed-(?:[a-z0-9]{9}|git-[a-z0-9-]+)-petertechdevs-projects\.vercel\.app$/i;

export function previewBaseURL(raw) {
  if (!raw || raw.includes("\\")) return null;
  let url;
  try { url = new URL(raw); } catch { return null; }
  if (url.protocol !== "https:") return null;
  // WHATWG drops the default https port, so :443 arrives here as "".
  if (url.port !== "") return null;
  if (url.username || url.password) return null;
  if (!PREVIEW_HOST.test(url.hostname)) return null;
  return url.origin;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const origin = previewBaseURL(process.env.PREVIEW_URL || "");
  if (!origin) {
    console.log("::error::BASE_URL host rejeitado");
    process.exit(1);
  }
  if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV, `BASE_URL=${origin}\n`);
}
