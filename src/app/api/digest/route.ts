import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isDigestDate, parseDigest, type DigestEntry } from "@/lib/digest";
import { readDigestDocument, updateDigestDocument } from "@/lib/digestStorage";
import { formatNBADate } from "@/lib/nbaDate";

export type { DigestEntry } from "@/lib/digest";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  const range = req.nextUrl.searchParams.get("range");
  if (date && !isDigestDate(date)) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  if (range && (!/^\d+$/.test(range) || Number(range) < 1 || Number(range) > 90)) {
    return NextResponse.json({ error: "Range must be between 1 and 90" }, { status: 400 });
  }
  try {
    const digests = await readDigestDocument<DigestEntry[]>("digests.json", []);
    const sorted = [...digests].sort((a, b) => b.date.localeCompare(a.date));
    if (range) {
      const results = sorted.slice(0, Number(range));
      return NextResponse.json({ digests: results, count: results.length });
    }
    if (date) return NextResponse.json({ digest: sorted.find((entry) => entry.date === date) ?? null });
    const today = formatNBADate();
    const digest = sorted.find((entry) => entry.date === today) ?? sorted[0] ?? null;
    return NextResponse.json({ digest, isToday: digest?.date === today });
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
  } catch {
    return NextResponse.json({ error: "Digest could not be saved. Please retry." }, { status: 503 });
  }
}
