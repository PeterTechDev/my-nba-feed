export interface DigestEntry {
  date: string;
  style: "hype" | "analytical" | "casual" | "storyteller";
  title: string;
  content: string;
  games_covered: string[];
  stats_highlighted: string[];
  metadata: { model: string; generation_time_ms: number };
  created_at: string;
  redacted?: boolean;
}

export interface FeedbackAgg {
  date: string;
  fire: number;
  thumbsdown: number;
  total: number;
}

export function isDigestDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function parseDigest(value: unknown): DigestEntry {
  if (!value || typeof value !== "object") throw new Error("Invalid digest");
  const body = value as Record<string, unknown>;
  if (!isDigestDate(body.date) || !["hype", "analytical", "casual", "storyteller"].includes(String(body.style)) ||
    typeof body.title !== "string" || !body.title.trim() || body.title.length > 300 ||
    typeof body.content !== "string" || !body.content.trim() || body.content.length > 100000) {
    throw new Error("Invalid date, style, title or content");
  }
  for (const field of ["games_covered", "stats_highlighted"]) {
    const list = body[field];
    if (list !== undefined && (!Array.isArray(list) || list.length > 100 ||
      list.some((item) => typeof item !== "string" || item.length > 300))) throw new Error("Invalid " + field);
  }
  const metadata = body.metadata as DigestEntry["metadata"] | undefined;
  if (metadata !== undefined && (!metadata || typeof metadata.model !== "string" || metadata.model.length > 100 ||
    !Number.isFinite(metadata.generation_time_ms) || metadata.generation_time_ms < 0)) throw new Error("Invalid metadata");
  return {
    date: body.date, style: body.style as DigestEntry["style"], title: body.title.trim(), content: body.content,
    games_covered: (body.games_covered as string[] | undefined) ?? [],
    stats_highlighted: (body.stats_highlighted as string[] | undefined) ?? [],
    metadata: metadata ?? { model: "unknown", generation_time_ms: 0 }, created_at: new Date().toISOString(),
  };
}

export function redactDigest(entry: DigestEntry, reveal: string | null): DigestEntry {
  if (reveal && reveal === entry.date) return entry;
  const candidate = entry.content.match(/League date:\s*(\d{4}-\d{2}-\d{2})/i)?.[1];
  const content = candidate && isDigestDate(candidate) ? `## Sources\n\nLeague date: ${candidate}.` : "";
  return { ...entry, title: "NBA daily breakdown", content, games_covered: [], stats_highlighted: [], redacted: true };
}
