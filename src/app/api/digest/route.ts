import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isDigestDate, parseDigest, redactDigest, type DigestEntry } from "@/lib/digest";
import { readDigestDocument, updateDigestDocument } from "@/lib/digestStorage";
import { formatNBADate } from "@/lib/nbaDate";

export type { DigestEntry } from "@/lib/digest";

function spoilerHidden(req: NextRequest, kind: "scores" | "headlines") {
  const query = req.nextUrl.searchParams.get(kind === "scores" ? "hideScores" : "hideHeadlines");
  if (query === "1" || query === "true") return true;
  if (query === "0" || query === "false") return false;
  const header = req.headers?.get?.("x-nba-spoilers") ?? "";
  if (!header || header === "off") return false;
  return header.split(",").some((part) => part.trim() === kind);
}

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  const range = req.nextUrl.searchParams.get("range");
  if (date && !isDigestDate(date)) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  if (range && (!/^\d+$/.test(range) || Number(range) < 1 || Number(range) > 90)) {
    return NextResponse.json({ error: "Range must be between 1 and 90" }, { status: 400 });
  }
  const protect = spoilerHidden(req, "scores") || spoilerHidden(req, "headlines");
  const reveal = req.nextUrl.searchParams.get("reveal");
  const show = (entry: DigestEntry) => protect ? redactDigest(entry, reveal) : entry;
  const json = (body: unknown) => NextResponse.json(body, protect
    ? { headers: new Headers({ Vary: "x-nba-spoilers", "Cache-Control": "private, no-store" }) } : undefined);
  try {
    const digests = await readDigestDocument<DigestEntry[]>("digests.json", []);
    const sorted = [...digests].sort((a, b) => b.date.localeCompare(a.date));
    if (range) {
      const results = sorted.slice(0, Number(range)).map(show);
      return json({ digests: results, count: results.length });
    }
    if (date) {
      const digest = sorted.find((entry) => entry.date === date) ?? null;
      return json({ digest: digest ? show(digest) : null });
    }
    const today = formatNBADate();
    const digest = sorted.find((entry) => entry.date === today) ?? sorted[0] ?? null;
    return json({ digest: digest ? show(digest) : null, isToday: digest?.date === today });
  } catch {
    return NextResponse.json({ error: "Digest storage is unavailable. Please retry." }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const token = process.env.DIGEST_PUBLISH_TOKEN;
  if (!token) return NextResponse.json({ error: "Digest publishing is not configured" }, { status: 503 });
  const supplied = req.headers.get("authorization")?.replace(/^Bearer /i, "") ?? "";
  if (Buffer.byteLength(supplied) !== Buffer.byteLength(token) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let entry: DigestEntry;
  try {
    entry = parseDigest(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid digest payload" }, { status: 400 });
  }
  try {
    await updateDigestDocument<DigestEntry[]>("digests.json", [], (digests) =>
      [...digests.filter((digest) => digest.date !== entry.date), entry].sort((a, b) => b.date.localeCompare(a.date)));
    return NextResponse.json({ success: true, digest: entry }, { status: 201 });
  } catch (error) {
    // Only authenticated publishers receive storage diagnostics; public reads stay generic.
    return NextResponse.json({ error: "Digest could not be saved. Please retry.",
      details: error instanceof Error ? error.message : "Unknown storage failure" }, { status: 503 });
  }
}
