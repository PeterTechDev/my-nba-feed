import { NextRequest, NextResponse } from "next/server";
import { isDigestDate, type DigestEntry, type FeedbackAgg } from "@/lib/digest";
import { readDigestDocument, updateDigestDocument } from "@/lib/digestStorage";

export async function GET() {
  try {
    const feedback = await readDigestDocument<FeedbackAgg[]>("digest-feedback.json", []);
    return NextResponse.json({ feedback });
  } catch {
    return NextResponse.json({ error: "Digest reactions are unavailable" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || !isDigestDate(body.date) || !["fire", "thumbsdown"].includes(body.reaction)) {
    return NextResponse.json({ error: "Invalid date or reaction" }, { status: 400 });
  }
  const { date, reaction }: { date: string; reaction: "fire" | "thumbsdown" } = body;
  try {
    const digests = await readDigestDocument<DigestEntry[]>("digests.json", []);
    if (!digests.some((digest) => digest.date === date)) return NextResponse.json({ error: "Digest not found" }, { status: 404 });
    const feedback = await updateDigestDocument<FeedbackAgg[]>("digest-feedback.json", [], (entries) => {
      const previous = entries.find((entry) => entry.date === date) ?? { date, fire: 0, thumbsdown: 0, total: 0 };
      return [...entries.filter((entry) => entry.date !== date), {
        ...previous, [reaction]: previous[reaction] + 1, total: previous.total + 1,
      }].sort((a, b) => b.date.localeCompare(a.date));
    });
    return NextResponse.json({ success: true, feedback: feedback.find((entry) => entry.date === date) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Reaction could not be saved. Please retry." }, { status: 503 });
  }
}
