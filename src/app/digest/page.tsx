"use client";
import { useEffect, useState } from "react";
import {
  Flame,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Clock,
  Zap,
  BarChart2,
  Coffee,
  BookMarked,
  Trophy,
  Activity,
} from "lucide-react";
import MarkdownContent from "@/components/MarkdownContent";
import type { DigestEntry } from "@/app/api/digest/route";

// ---- Style config ----

const STYLE_META: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  hype: {
    label: "Hype",
    color: "text-orange-400",
    bg: "bg-orange-500/15 border-orange-500/30",
    icon: Zap,
  },
  analytical: {
    label: "Analytical",
    color: "text-blue-400",
    bg: "bg-blue-500/15 border-blue-500/30",
    icon: BarChart2,
  },
  casual: {
    label: "Casual",
    color: "text-green-400",
    bg: "bg-green-500/15 border-green-500/30",
    icon: Coffee,
  },
  storyteller: {
    label: "Storyteller",
    color: "text-purple-400",
    bg: "bg-purple-500/15 border-purple-500/30",
    icon: BookMarked,
  },
};

// ---- Helper ----

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---- Feedback row ----

interface FeedbackAgg {
  date: string;
  fire: number;
  thumbsdown: number;
  total: number;
}

interface FeedbackRowProps {
  date: string;
  feedbackMap: Map<string, FeedbackAgg>;
  onReact: (date: string, reaction: "fire" | "thumbsdown") => void;
  reacted: Map<string, string>;
}

function FeedbackRow({ date, feedbackMap, onReact, reacted }: FeedbackRowProps) {
  const agg = feedbackMap.get(date);
  const myReaction = reacted.get(date);

  return (
    <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/5">
      <span className="text-xs text-white/30">Vibe check:</span>
      <button
        onClick={() => onReact(date, "fire")}
        disabled={!!myReaction}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm transition border ${
          myReaction === "fire"
            ? "bg-orange-500/20 border-orange-500/40 text-orange-400"
            : "border-white/10 text-white/40 hover:text-orange-400 hover:border-orange-500/30 hover:bg-orange-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
        }`}
      >
        <Flame className="w-3.5 h-3.5" />
        <span>{agg?.fire ?? 0}</span>
      </button>
      <button
        onClick={() => onReact(date, "thumbsdown")}
        disabled={!!myReaction}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm transition border ${
          myReaction === "thumbsdown"
            ? "bg-red-500/20 border-red-500/40 text-red-400"
            : "border-white/10 text-white/40 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
        }`}
      >
        <ThumbsDown className="w-3.5 h-3.5" />
        <span>{agg?.thumbsdown ?? 0}</span>
      </button>
    </div>
  );
}

// ---- Digest card ----

interface DigestCardProps {
  digest: DigestEntry;
  feedbackMap: Map<string, FeedbackAgg>;
  onReact: (date: string, reaction: "fire" | "thumbsdown") => void;
  reacted: Map<string, string>;
  expanded?: boolean;
  bordered?: boolean;
}

function DigestCard({
  digest,
  feedbackMap,
  onReact,
  reacted,
  expanded = true,
  bordered = false,
}: DigestCardProps) {
  const meta = STYLE_META[digest.style] ?? STYLE_META.casual;
  const StyleIcon = meta.icon;

  return (
    <div
      className={`rounded-2xl overflow-hidden ${
        bordered ? "border border-[#2a2a2a] bg-[#161616]" : ""
      }`}
    >
      {/* Color accent bar */}
      <div
        className="h-0.5"
        style={{ background: `linear-gradient(90deg, var(--team-primary), transparent)` }}
      />

      <div className="p-5 sm:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-start gap-2 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${meta.bg} ${meta.color}`}
              >
                <StyleIcon className="w-3 h-3" />
                {meta.label}
              </span>
              <span className="text-xs text-white/30 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(digest.date)}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold leading-snug">{digest.title}</h2>
          </div>
        </div>

        {/* Content */}
        {expanded && (
          <>
            <MarkdownContent content={digest.content} className="mb-5" />

            {/* Games covered */}
            {digest.games_covered.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/30 mb-2 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5" />
                  Games covered
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {digest.games_covered.map((game) => (
                    <span
                      key={game}
                      className="px-2.5 py-0.5 rounded-full text-xs bg-white/5 border border-white/8 text-white/60"
                    >
                      {game}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Stats highlighted */}
            {digest.stats_highlighted.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/30 mb-2 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  Key stats
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {digest.stats_highlighted.map((stat) => (
                    <span
                      key={stat}
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        background: "color-mix(in srgb, var(--team-primary) 15%, transparent)",
                        border: "1px solid color-mix(in srgb, var(--team-primary) 30%, transparent)",
                        color: "var(--team-primary)",
                      }}
                    >
                      {stat}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            {digest.metadata?.model && (
              <p className="text-[10px] text-white/20 mt-3">
                Generated by {digest.metadata.model}
                {digest.metadata.generation_time_ms
                  ? ` · ${(digest.metadata.generation_time_ms / 1000).toFixed(1)}s`
                  : ""}
              </p>
            )}

            {/* Feedback */}
            <FeedbackRow
              date={digest.date}
              feedbackMap={feedbackMap}
              onReact={onReact}
              reacted={reacted}
            />
          </>
        )}
      </div>
    </div>
  );
}

// ---- Archive item ----

interface ArchiveItemProps {
  digest: DigestEntry;
  feedbackMap: Map<string, FeedbackAgg>;
  onReact: (date: string, reaction: "fire" | "thumbsdown") => void;
  reacted: Map<string, string>;
}

function ArchiveItem({ digest, feedbackMap, onReact, reacted }: ArchiveItemProps) {
  const [open, setOpen] = useState(false);
  const meta = STYLE_META[digest.style] ?? STYLE_META.casual;

  return (
    <div className="rounded-xl border border-[#2a2a2a] bg-[#161616] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/3 transition"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
            <span className="text-xs text-white/30">{formatDate(digest.date)}</span>
          </div>
          <p className="text-sm font-medium truncate mt-0.5">{digest.title}</p>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-white/30 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/30 shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-white/5">
          <DigestCard
            digest={digest}
            feedbackMap={feedbackMap}
            onReact={onReact}
            reacted={reacted}
            expanded
            bordered={false}
          />
        </div>
      )}
    </div>
  );
}

// ---- Main page ----

export default function DigestPage() {
  const [todayDigest, setTodayDigest] = useState<DigestEntry | null>(null);
  const [isToday, setIsToday] = useState(false);
  const [archive, setArchive] = useState<DigestEntry[]>([]);
  const [feedbackMap, setFeedbackMap] = useState<Map<string, FeedbackAgg>>(new Map());
  const [reacted, setReacted] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  const today = getTodayStr();

  useEffect(() => {
    const loadAll = async () => {
      try {
        // Load latest digest + last 14 days of archive in parallel
        const [latestRes, archiveRes, feedbackRes] = await Promise.all([
          fetch("/api/digest"),
          fetch("/api/digest?range=15"),
          fetch("/api/digest/feedback"),
        ]);

        const [latestData, archiveData, feedbackData] = await Promise.all([
          latestRes.json(),
          archiveRes.json(),
          feedbackRes.json(),
        ]);

        setTodayDigest(latestData.digest ?? null);
        setIsToday(latestData.isToday ?? false);

        // Archive = all digests except the one shown at top
        const allDigests: DigestEntry[] = archiveData.digests ?? [];
        const topDate = latestData.digest?.date;
        setArchive(allDigests.filter((d) => d.date !== topDate));

        // Build feedback map
        const map = new Map<string, FeedbackAgg>();
        for (const fb of feedbackData.feedback ?? []) {
          map.set(fb.date, fb);
        }
        setFeedbackMap(map);
      } catch {
        // silently handle — empty state shown
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, []);

  const handleReact = async (date: string, reaction: "fire" | "thumbsdown") => {
    if (reacted.has(date)) return;

    // Optimistic update
    setReacted((prev) => new Map(prev).set(date, reaction));
    setFeedbackMap((prev) => {
      const next = new Map(prev);
      const existing = next.get(date) ?? { date, fire: 0, thumbsdown: 0, total: 0 };
      next.set(date, {
        ...existing,
        [reaction]: existing[reaction] + 1,
        total: existing.total + 1,
      });
      return next;
    });

    try {
      await fetch("/api/digest/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, reaction }),
      });
    } catch {
      // best-effort — keep optimistic state
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen p-4 sm:p-8 max-w-3xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-white/5 rounded-lg" />
          <div className="h-64 bg-white/5 rounded-2xl" />
          <div className="h-32 bg-white/5 rounded-2xl" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-3xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="w-6 h-6" style={{ color: "var(--team-primary)" }} />
        <div>
          <h1 className="text-2xl font-bold">AI Digest</h1>
          <p className="text-sm text-white/40">Daily NBA breakdown, generated fresh every morning</p>
        </div>
      </div>

      {/* Today's digest */}
      {todayDigest ? (
        <div className="mb-10">
          {!isToday && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-sm text-amber-300/80">
                No digest yet for today ({today}) — showing last available.
              </p>
            </div>
          )}
          <DigestCard
            digest={todayDigest}
            feedbackMap={feedbackMap}
            onReact={handleReact}
            reacted={reacted}
            expanded
            bordered
          />
        </div>
      ) : (
        <div className="mb-10 flex flex-col items-center justify-center py-16 rounded-2xl border border-[#2a2a2a] bg-[#161616] text-center">
          <Clock className="w-10 h-10 text-white/20 mb-3" />
          <p className="text-white/60 font-medium">No digest yet today</p>
          <p className="text-sm text-white/30 mt-1">Check back after 8 AM for today&apos;s breakdown</p>
        </div>
      )}

      {/* Archive */}
      {archive.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/30 mb-3">
            Archive — last 14 days
          </h2>
          <div className="space-y-2">
            {archive.map((d) => (
              <ArchiveItem
                key={d.date}
                digest={d}
                feedbackMap={feedbackMap}
                onReact={handleReact}
                reacted={reacted}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
