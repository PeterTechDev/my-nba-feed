import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// Host only, anchored at the end. A query or a suffix on another domain does not match.
const PREVIEW_HOST = /-petertechdevs-projects\.vercel\.app$/i;

export function previewBaseURL(raw) {
  if (!raw) return null;
  let url;
  try { url = new URL(raw); } catch { return null; }
  if (url.protocol !== "https:") return null;
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
