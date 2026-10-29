import { timingSafeEqual } from "node:crypto";
import { fetchBallDontLieSource } from "@/lib/ballDontLie";
import { LEAGUE_DOCUMENT, validateGames, type LeagueSnapshot } from "@/lib/leagueSnapshot";
import { updateDocument } from "@/lib/documentStorage";
import { getNBASeason } from "@/lib/nbaDate";

export async function POST(request: Request) {
  const expected = process.env.DIGEST_PUBLISH_TOKEN;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer /i, "") ?? "";
  if (!expected || Buffer.byteLength(supplied) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const text = await request.text();
    if (text.length > 3500000) return Response.json({ error: "Publication too large" }, { status: 413 });
    const body = JSON.parse(text);
    const season = getNBASeason();
    if (body.action === "page") {
      if (body.cursor !== undefined && (!Number.isSafeInteger(body.cursor) || body.cursor < 0)) return Response.json({ error: "Invalid cursor" }, { status: 400 });
      const params = new URLSearchParams({ per_page: "100", start_date: `${season - 1}-01-01`, end_date: `${season + 2}-12-31` });
      if (body.cursor !== undefined) params.set("cursor", String(body.cursor));
      const response = await fetchBallDontLieSource(`https://api.balldontlie.io/v1/games?${params}`, 0);
      if (!response.ok) return response;
      const page = await response.json();
      return Response.json({ data: validateGames(page.data), meta: page.meta });
    }
    if (body.action !== "publish" || typeof body.syncedAt !== "string" || !Number.isFinite(Date.parse(body.syncedAt)) || Math.abs(Date.now() - Date.parse(body.syncedAt)) > 3600000) return Response.json({ error: "Invalid publication" }, { status: 400 });
    const games = validateGames(body.games);
    if (!games.length || !games.some(game => game.season === season)) return Response.json({ error: "Incomplete catalog" }, { status: 400 });
    const saved = await updateDocument<LeagueSnapshot | null>(LEAGUE_DOCUMENT, null, current => {
      if (current && current.syncedAt > body.syncedAt) throw new Error("Newer catalog already published");
      return { syncedAt: body.syncedAt, games };
    });
    return Response.json({ success: true, syncedAt: saved!.syncedAt, count: saved!.games.length });
  } catch {
    return Response.json({ error: "Game synchronization failed; previous catalog preserved" }, { status: 502 });
  }
}
