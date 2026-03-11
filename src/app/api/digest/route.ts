import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DIGESTS_FILE = path.join(DATA_DIR, "digests.json");

export interface DigestEntry {
  date: string; // YYYY-MM-DD
  style: "hype" | "analytical" | "casual" | "storyteller";
  title: string;
  content: string; // markdown
  games_covered: string[];
  stats_highlighted: string[];
  metadata: {
    model: string;
    generation_time_ms: number;
  };
  created_at: string; // ISO timestamp
}

async function readDigests(): Promise<DigestEntry[]> {
  try {
    const raw = await fs.readFile(DIGESTS_FILE, "utf-8");
    return JSON.parse(raw) as DigestEntry[];
  } catch {
    return [];
  }
}

async function writeDigests(digests: DigestEntry[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  // Keep sorted by date desc
  const sorted = [...digests].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  await fs.writeFile(DIGESTS_FILE, JSON.stringify(sorted, null, 2));
}

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const date = searchParams.get("date");
  const range = searchParams.get("range");

  const digests = await readDigests();

  if (range) {
    const n = parseInt(range, 10);
    if (isNaN(n) || n < 1) {
      return NextResponse.json({ error: "Invalid range" }, { status: 400 });
    }
    const results = digests.slice(0, n);
    return NextResponse.json({ digests: results, count: results.length });
  }

  if (date) {
    const entry = digests.find((d) => d.date === date);
    if (!entry) {
      return NextResponse.json({ digest: null, message: `No digest found for ${date}` });
    }
    return NextResponse.json({ digest: entry });
  }

  // Default: return today's digest, or latest if none today
  const today = getTodayStr();
  const todayDigest = digests.find((d) => d.date === today);
  if (todayDigest) {
    return NextResponse.json({ digest: todayDigest, isToday: true });
  }

  const latest = digests[0] ?? null;
  return NextResponse.json({ digest: latest, isToday: false });
}

export async function POST(req: NextRequest) {
  let body: Partial<DigestEntry>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate required fields
  const required = ["date", "style", "title", "content"] as const;
  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
    }
  }

  const validStyles = ["hype", "analytical", "casual", "storyteller"];
  if (!validStyles.includes(body.style!)) {
    return NextResponse.json(
      { error: `Invalid style. Must be one of: ${validStyles.join(", ")}` },
      { status: 400 }
    );
  }

  const entry: DigestEntry = {
    date: body.date!,
    style: body.style!,
    title: body.title!,
    content: body.content!,
    games_covered: body.games_covered ?? [],
    stats_highlighted: body.stats_highlighted ?? [],
    metadata: body.metadata ?? { model: "unknown", generation_time_ms: 0 },
    created_at: new Date().toISOString(),
  };

  const digests = await readDigests();
  // Replace existing entry for same date, or add new
  const idx = digests.findIndex((d) => d.date === entry.date);
  if (idx !== -1) {
    digests[idx] = entry;
  } else {
    digests.push(entry);
  }

  await writeDigests(digests);

  return NextResponse.json({ success: true, digest: entry }, { status: 201 });
}
