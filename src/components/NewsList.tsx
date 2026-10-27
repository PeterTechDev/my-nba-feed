"use client";
import { Fragment, useState } from "react";
import { ExternalLink } from "lucide-react";
import { formatNewsAge, getNewsTitle, type NewsItem } from "@/lib/api";
import { newsVisitBoundary } from "@/lib/news";
import { useLastVisit } from "@/hooks/useLastVisit";
import { useSpoilerContext } from "./SpoilerModeProvider";
import DataError from "./DataError";

export interface NewsListProps {
  news: NewsItem[];
  loading: boolean;
  error: boolean;
  retry: () => void;
  subject: string;
  showWarning?: boolean;
}
export type NewsState = Omit<NewsListProps, "subject" | "showWarning">;

export function NewsLinkWarning() {
  const { hideHeadlines, hideScores } = useSpoilerContext();
  return (hideHeadlines || hideScores) ? <p className="mb-3 text-sm text-white/70">Article links open external sites and may contain spoilers.</p> : null;
}

function NewsStory({ item }: { item: NewsItem }) {
  const { hideHeadlines } = useSpoilerContext();
  const [revealed, setRevealed] = useState(false);
  const hidden = hideHeadlines && item.isSpoiler && !revealed;
  return <>
    <a href={hidden ? undefined : item.link} target={hidden ? undefined : "_blank"} rel={hidden ? undefined : "noopener noreferrer"}
      className={`flex min-h-11 items-center gap-2 break-words text-base font-medium leading-relaxed sm:text-sm ${hidden ? "text-white/70" : "text-white/90 hover:text-white"}`}>
      <span className="min-w-0 flex-1">{getNewsTitle(item, hidden)}</span>
      {!hidden && <><ExternalLink aria-hidden="true" className="h-4 w-4 shrink-0 text-white/70" /><span className="sr-only">(opens in a new tab)</span></>}
    </a>
    <p className="mt-1 text-sm text-white/70">{item.source && `${item.source} · `}{formatNewsAge(item.pubDate)}</p>
    {hideHeadlines && item.isSpoiler && <div className="mt-2 flex flex-wrap items-center gap-2">
      {revealed && <span role="status" className="text-sm text-amber-200">Headline revealed</span>}
      <button type="button" aria-pressed={revealed} aria-label={`${hidden ? "Reveal" : "Hide"} headline from ${item.source || "source"}`}
        onClick={() => setRevealed((value) => !value)} className="min-h-11 rounded-lg border border-white/20 px-3 text-sm text-white/80 hover:bg-white/10">
        {hidden ? "Reveal headline" : "Hide headline"}
      </button>
    </div>}
    {item.related && item.related.length > 0 && <details className="mt-2">
      <summary className="min-h-11 cursor-pointer py-3 text-sm text-white/70 hover:text-white">Related coverage ({item.related.length})</summary>
      <ul className="divide-y divide-white/10">{item.related.map((related) => <li key={`${related.link}:${hideHeadlines}`} className="py-3"><NewsStory item={related} /></li>)}</ul>
    </details>}
  </>;
}

export default function NewsList({ news, loading, error, retry, subject, showWarning = true }: NewsListProps) {
  const { hideHeadlines } = useSpoilerContext();
  const { lastVisitAt, ready } = useLastVisit();
  const boundary = ready ? newsVisitBoundary(news, lastVisitAt) : null;
  if (error) return <DataError subject={subject} retry={retry} />;
  if (loading) return <p role="status" className="text-sm text-white/70">Loading {subject}…</p>;
  if (!news.length) return <div><p className="text-sm text-white/70">No recent {subject} to add.</p><button type="button" onClick={retry} className="mt-2 min-h-11 rounded-lg border border-white/15 px-3 text-sm hover:bg-white/10">Check again</button></div>;
  return <>
    {boundary !== null && boundary > 0 && <p className="mb-3 text-sm text-white/70">{boundary} new {boundary === 1 ? "story" : "stories"} since your last visit</p>}
    {showWarning && <NewsLinkWarning />}
    <ul className="divide-y divide-white/10">{news.map((item, index) => <Fragment key={item.link}>
      {boundary !== null && boundary > 0 && index === boundary && <li className="py-3 text-sm text-white/70">Earlier stories</li>}
      <li className="py-3 first:pt-0"><NewsStory key={`${item.link}:${hideHeadlines}`} item={item} /></li>
    </Fragment>)}</ul>
  </>;
}
