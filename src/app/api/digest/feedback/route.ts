import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const FEEDBACK_FILE = path.join(DATA_DIR, "digest-feedback.json");

interface FeedbackEntry {
  date: string;
  reaction: "fire" | "thumbsdown";
  recorded_at: string;
}

interface AggregatedFeedback {
  date: string;
  fire: number;
  thumbsdown: number;
  total: number;
}

async function readFeedback(): Promise<FeedbackEntry[]> {
  try {
    const raw = await fs.readFile(FEEDBACK_FILE, "utf-8");
    return JSON.parse(raw) as FeedbackEntry[];
  } catch {
    return [];
  }
}

async function writeFeedback(entries: FeedbackEntry[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FEEDBACK_FILE, JSON.stringify(entries, null, 2));
}

export async function GET() {
  const entries = await readFeedback();

  // Aggregate by date
  const map = new Map<string, AggregatedFeedback>();
  for (const entry of entries) {
    if (!map.has(entry.date)) {
      map.set(entry.date, { date: entry.date, fire: 0, thumbsdown: 0, total: 0 });
    }
    const agg = map.get(entry.date)!;
    agg[entry.reaction]++;
    agg.total++;
  }

  const aggregated = Array.from(map.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return NextResponse.json({ feedback: aggregated });
}

export async function POST(req: NextRequest) {
  let body: { date?: string; reaction?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.date || !body.reaction) {
    return NextResponse.json({ error: "Missing required fields: date, reaction" }, { status: 400 });
  }

  const validReactions = ["fire", "thumbsdown"];
  if (!validReactions.includes(body.reaction)) {
    return NextResponse.json(
      { error: `Invalid reaction. Must be one of: ${validReactions.join(", ")}` },
      { status: 400 }
    );
  }

  const entry: FeedbackEntry = {
    date: body.date,
    reaction: body.reaction as "fire" | "thumbsdown",
    recorded_at: new Date().toISOString(),
  };

  const entries = await readFeedback();
  entries.push(entry);
  await writeFeedback(entries);

  return NextResponse.json({ success: true, entry }, { status: 201 });
}
