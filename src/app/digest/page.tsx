"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Flame, ThumbsDown, ChevronDown, ChevronUp, BookOpen, Clock, Zap, BarChart2, Coffee, BookMarked } from "lucide-react";
import MarkdownContent from "@/components/MarkdownContent";
import DataError from "@/components/DataError";
import { digestContentIsProtected, useSpoilerContext } from "@/components/SpoilerModeProvider";
import { useRemoteData } from "@/hooks/useRemoteData";
import { formatGameDate } from "@/lib/nbaDate";
import type { DigestEntry, FeedbackAgg } from "@/lib/digest";
import { getDigestPresentation } from "@/lib/digestPresentation";

const STYLE_META = {
  hype: { label: "Hype", color: "text-orange-300", bg: "bg-orange-500/15 border-orange-500/30", icon: Zap },
  analytical: { label: "Analytical", color: "text-blue-300", bg: "bg-blue-500/15 border-blue-500/30", icon: BarChart2 },
  casual: { label: "Casual", color: "text-green-300", bg: "bg-green-500/15 border-green-500/30", icon: Coffee },
  storyteller: { label: "Storyteller", color: "text-purple-300", bg: "bg-purple-500/15 border-purple-500/30", icon: BookMarked },
};
function formatDate(date: string) {
  return formatGameDate(date, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
type Reaction = "fire" | "thumbsdown";
interface DigestCardProps {
  digest: DigestEntry;
  feedback?: FeedbackAgg;
  reaction?: Reaction;
  pending: boolean;
  reactionError?: string;
  onReact: (date: string, reaction: Reaction) => void;
}

function DigestCard({ digest, feedback, reaction, pending, reactionError, onReact }: DigestCardProps) {
  const { hideScores, hideHeadlines } = useSpoilerContext();
  const protectedContent = digestContentIsProtected({ hideScores, hideHeadlines });
  const [revealed, setRevealed] = useState(false);
  useEffect(() => setRevealed(false), [digest.date, hideScores, hideHeadlines]);
  const hidden = protectedContent && !revealed;
  const meta = STYLE_META[digest.style] ?? STYLE_META.casual;
  const StyleIcon = meta.icon;
  const presentation = getDigestPresentation(digest);
  return (
    <div className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${meta.bg} ${meta.color}`}>
          <StyleIcon className="w-3 h-3" aria-hidden="true" />{meta.label}
        </span>
        <span className="flex flex-wrap items-center gap-1 text-sm text-white/70">
          <Clock className="w-3.5 h-3.5" aria-hidden="true" />Published <time dateTime={digest.date}>{formatDate(digest.date)}</time>
        </span>
      </div>
      <h2 className="text-lg sm:text-xl font-bold leading-snug break-words">{hidden ? "NBA daily breakdown" : presentation.title}</h2>
      {presentation.coverageDate && <p className="mt-2 text-sm text-white/70">Covers games from {formatDate(presentation.coverageDate)}.</p>}
      {protectedContent && (
        <div className="mt-4">
          <p role={hidden ? undefined : "status"} className="text-sm text-white/70 mb-2">{hidden ? "This digest includes results and player statistics." : "Digest revealed. Default protection is still on."}</p>
          <button type="button" aria-pressed={revealed} onClick={() => setRevealed((value) => !value)}
            className="min-h-11 rounded-lg border border-white/15 px-3 text-sm text-white/80 hover:bg-white/10">
            {hidden ? "Reveal digest" : "Hide digest spoilers"}
          </button>
        </div>
      )}
      {!hidden && <div className="content-reveal">
        <MarkdownContent content={presentation.content} className="mb-5 break-words" />
        {digest.stats_highlighted.length > 0 && <div className="mb-4">
          <h3 className="font-semibold mb-2">Key stats</h3>
          <ul className="space-y-1 text-sm text-white/80">{digest.stats_highlighted.map((stat) => <li key={stat}>{stat}</li>)}</ul>
        </div>}
        {presentation.readerSources && <section className="mt-6" aria-label="Readable sources">
          <h3 className="font-semibold mb-2">Check the sources</h3>
          <MarkdownContent content={presentation.readerSources} className="text-sm break-words [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center" />
        </section>}
        <details className="group border-t border-white/10 pt-2 mt-6">
          <summary className="min-h-11 flex items-center justify-between gap-3 cursor-pointer text-sm text-white/80 hover:text-white">Raw source data and edition details<ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 group-open:rotate-180" /></summary>
          {presentation.sources ? <MarkdownContent content={presentation.sources} className="text-sm break-words" /> : <p className="text-sm text-white/70 my-3">No source links were supplied for this edition.</p>}
          {digest.games_covered.length > 0 && <><h3 className="font-semibold mt-4 mb-2">Games covered</h3><ul className="space-y-1 text-sm text-white/70">{digest.games_covered.map((game) => <li key={game}>{game}</li>)}</ul></>}
          {digest.metadata?.model && <p className="text-sm text-white/70 mt-4">Generated by {digest.metadata.model}{digest.metadata.generation_time_ms ? ` · ${(digest.metadata.generation_time_ms / 1000).toFixed(1)}s` : ""}</p>}
        </details>
        <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-white/10" aria-label={`Reactions for ${formatDate(digest.date)}`}>
          <span className="text-sm text-white/70">Was this useful?</span>
          {(["fire", "thumbsdown"] as const).map((value) => {
            const Icon = value === "fire" ? Flame : ThumbsDown;
            const label = value === "fire" ? "Like this digest" : "Dislike this digest";
            return <button key={value} type="button" aria-label={label} aria-pressed={reaction === value}
              disabled={pending || Boolean(reaction)} onClick={() => onReact(digest.date, value)}
              className={`flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm transition disabled:cursor-not-allowed ${reaction === value ? "border-amber-300/40 bg-amber-400/10 text-amber-200" : "border-white/15 text-white/80 hover:bg-white/10"}`}>
              <Icon className="w-4 h-4" aria-hidden="true" /><span>{feedback?.[value] ?? 0}</span>
            </button>;
          })}
          {pending && <span role="status" className="text-xs text-white/70">Saving reaction…</span>}
          {reaction && <span role="status" className="text-xs text-white/70">Reaction saved</span>}
        </div>
        {reactionError && <p role="alert" className="mt-2 text-sm text-red-300">{reactionError}</p>}
      </div>}
    </div>
  );
}

function ArchiveItem(props: DigestCardProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const { hideScores, hideHeadlines } = useSpoilerContext();
  const hidden = digestContentIsProtected({ hideScores, hideHeadlines });
  const { digest } = props;
  const meta = STYLE_META[digest.style] ?? STYLE_META.casual;
  return <div className="rounded-xl border border-[#2a2a2a] bg-[#161616] overflow-hidden">
    <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)}
      className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
          <time dateTime={digest.date} className="text-sm text-white/70">Published {formatDate(digest.date)}</time>
        </div>
        <p className="text-sm font-medium break-words mt-0.5">{hidden ? "NBA daily breakdown" : getDigestPresentation(digest).title}</p>
      </div>
      {open ? <ChevronUp className="w-4 h-4 text-white/70 shrink-0" aria-hidden="true" /> : <ChevronDown className="w-4 h-4 text-white/70 shrink-0" aria-hidden="true" />}
    </button>
    <div id={panelId} hidden={!open} className="disclosure-panel">{open && <div className="border-t border-white/10"><DigestCard {...props} /></div>}</div>
  </div>;
}

export default function DigestPage() {
  const latest = useRemoteData<{ digest: DigestEntry | null; isToday: boolean }>("/api/digest");
  const archive = useRemoteData<{ digests: DigestEntry[] }>("/api/digest?range=15");
  const feedback = useRemoteData<{ feedback: FeedbackAgg[] }>("/api/digest/feedback");
  const [counts, setCounts] = useState<Map<string, FeedbackAgg>>(new Map());
  const [reacted, setReacted] = useState<Map<string, Reaction>>(new Map());
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const inFlight = useRef(new Set<string>());
  useEffect(() => {
    if (feedback.data) setCounts(new Map(feedback.data.feedback.map((entry) => [entry.date, entry])));
  }, [feedback.data]);
  const handleReact = async (date: string, reaction: Reaction) => {
    if (reacted.has(date) || inFlight.current.has(date)) return;
    inFlight.current.add(date);
    setPending((previous) => new Set(previous).add(date));
    setErrors((previous) => { const next = new Map(previous); next.delete(date); return next; });
    try {
      const response = await fetch("/api/digest/feedback", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, reaction }), signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error("Reaction failed");
      const result = await response.json();
      if (!result.success) throw new Error("Reaction failed");
      setReacted((previous) => new Map(previous).set(date, reaction));
      setCounts((previous) => {
        const next = new Map(previous);
        const existing = next.get(date) ?? { date, fire: 0, thumbsdown: 0, total: 0 };
        const saved = result.feedback as FeedbackAgg | undefined;
        next.set(date, saved?.date === date ? saved : { ...existing, [reaction]: existing[reaction] + 1, total: existing.total + 1 });
        return next;
      });
    } catch {
      setErrors((previous) => new Map(previous).set(date, "Your reaction could not be saved. Please try again."));
    } finally {
      inFlight.current.delete(date);
      setPending((previous) => { const next = new Set(previous); next.delete(date); return next; });
    }
  };
  const cardProps = (digest: DigestEntry): DigestCardProps => ({
    digest, feedback: counts.get(digest.date), reaction: reacted.get(digest.date),
    pending: pending.has(digest.date), reactionError: errors.get(digest.date), onReact: handleReact,
  });
  const todayDigest = latest.data?.digest;
  const older = archive.data?.digests.filter((digest) => digest.date !== todayDigest?.date) ?? [];
  return <main className="min-h-screen p-4 sm:p-8 max-w-3xl mx-auto">
    <div className="flex items-center gap-3 mb-6">
      <BookOpen className="w-6 h-6 text-white/80 shrink-0" aria-hidden="true" />
      <div><h1 className="text-2xl font-bold">AI Digest</h1><p className="text-sm text-white/70">Daily NBA breakdowns</p></div>
    </div>
    {latest.error ? <DataError subject="the latest digest" retry={latest.retry} /> : latest.loading ? (
      <div role="status" aria-label="Loading digest" className="h-64 rounded-2xl bg-white/5 animate-pulse" />
    ) : todayDigest ? <div className="mb-10">
      {!latest.data?.isToday && <p className="mb-3 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">No digest has been published today. Showing the latest available.</p>}
      <div className="rounded-2xl border border-[#2a2a2a] bg-[#161616] overflow-hidden"><DigestCard {...cardProps(todayDigest)} /></div>
    </div> : <div className="mb-10 rounded-2xl border border-[#2a2a2a] bg-[#161616] p-8 text-center">
      <Clock className="mx-auto mb-3 h-10 w-10 text-white/70" aria-hidden="true" />
      <p className="font-medium">No digest available yet</p>
      <p className="text-sm text-white/70 mt-1">Check back for the next NBA breakdown.</p>
      <button type="button" onClick={latest.retry} className="mt-4 min-h-11 rounded-lg bg-white/10 px-4 text-sm hover:bg-white/20">Check again</button>
    </div>}
    {feedback.error && <div className="mt-6"><DataError subject="digest reactions" retry={feedback.retry} /></div>}
    <section className="mt-8" aria-label="Digest archive">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70 mb-3">Archive — recent digests</h2>
      {archive.error ? <DataError subject="the digest archive" retry={archive.retry} /> : archive.loading ? (
        <p role="status" className="text-sm text-white/70">Loading archive…</p>
      ) : older.length > 0 ? <div className="space-y-2">{older.map((digest) => <ArchiveItem key={digest.date} {...cardProps(digest)} />)}</div> :
        <p className="text-sm text-white/70">No earlier digests available.</p>}
    </section>
  </main>;
}
