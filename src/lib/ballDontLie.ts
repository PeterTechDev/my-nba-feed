import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import { updateDigestDocument } from "./digestStorage";

interface Budget { key: string; calls: number[]; blockedUntil: number; rosterDeniedUntil: number }
const EMPTY: Budget = { key: "", calls: [], blockedUntil: 0, rosterDeniedUntil: 0 };
class UpstreamError extends Error {
  constructor(public status: number, public retryAfter = 60) { super(`BallDontLie API ${status}`); }
}

export async function fetchBallDontLie(url: string, revalidate: number): Promise<Response> {
  const target = new URL(url);
  if (target.origin !== "https://api.balldontlie.io" || !["/v1/games", "/v1/players/active"].includes(target.pathname)) throw new Error("Invalid BallDontLie URL");
  const key = process.env.BALLDONTLIE_KEY;
  if (!key) return Response.json({ error: "API key not configured" }, { status: 503 });
  const identity = createHash("sha256").update(key).digest("hex");
  const roster = target.pathname === "/v1/players/active";
  try {
    // Keep the existing Data Cache; reserve quota only when a cached response needs refreshing.
    const read = unstable_cache(async () => {
      await updateDigestDocument<Budget>("bdl-budget.json", EMPTY, (stored) => {
        const now = Date.now();
        const state = stored.key === identity ? stored : { ...EMPTY, key: identity };
        if (roster && state.rosterDeniedUntil > now) throw new UpstreamError(403);
        if (state.blockedUntil > now) throw new UpstreamError(429, Math.ceil((state.blockedUntil - now) / 1000));
        const calls = state.calls.filter((time) => time > now - 60000);
        if (calls.length >= 5) throw new UpstreamError(429, Math.max(1, Math.ceil((calls[0] + 60000 - now) / 1000)));
        return { ...state, calls: [...calls, now] };
      });
      const response = await fetch(target, { headers: { Authorization: key }, cache: "no-store", signal: AbortSignal.timeout(10000) });
      if (!response.ok) {
        let retryAfter = 60;
        if (response.status === 429) {
          const value = response.headers.get("retry-after");
          const seconds = Number(value);
          retryAfter = Math.max(60, Number.isFinite(seconds) ? seconds : Math.ceil((Date.parse(value ?? "") - Date.now()) / 1000) || 60);
        }
        if (response.status === 429 || roster && [401, 403].includes(response.status)) {
          await updateDigestDocument<Budget>("bdl-budget.json", EMPTY, (state) => ({
            ...state,
            blockedUntil: response.status === 429 ? Math.max(state.blockedUntil, Date.now() + retryAfter * 1000) : state.blockedUntil,
            rosterDeniedUntil: roster && [401, 403].includes(response.status) ? Date.now() + 3600000 : state.rosterDeniedUntil,
          }));
        }
        throw new UpstreamError(response.status, retryAfter);
      }
      return response.json();
    }, ["bdl-v1", identity, target.href], { revalidate });
    return Response.json(await read());
  } catch (error) {
    if (!(error instanceof UpstreamError)) throw error;
    return Response.json({ error: error.message }, { status: error.status, headers: { "Retry-After": String(error.retryAfter) } });
  }
}
