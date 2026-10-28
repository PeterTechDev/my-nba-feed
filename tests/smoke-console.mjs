const EXACT_503 = new Set(["/api/games"]);

export function isTolerated503(message, allow = process.env.SMOKE_ALLOW_MISSING_API_KEY) {
  if (allow !== "1") return false;
  const location = message.location()?.url ?? "";
  let path = "";
  try { path = new URL(location).pathname; } catch { return false; }
  if (!/\b503\b/.test(message.text())) return false;
  return EXACT_503.has(path);
}
