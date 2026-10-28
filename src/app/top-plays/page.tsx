"use client";

import { useState } from "react";
import { ExternalLink, EyeOff, Play } from "lucide-react";
import DataError from "@/components/DataError";
import { useSpoilerContext } from "@/components/SpoilerModeProvider";
import { useRemoteData } from "@/hooks/useRemoteData";
import type { StoredHighlight } from "@/lib/youtubeHighlights";
import styles from "./top-plays.module.css";

function NightVideo({ video, featured = false, protectedMedia }: { video: StoredHighlight; featured?: boolean; protectedMedia: boolean }) {
  const [revealed, setRevealed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const hidden = protectedMedia && !revealed;
  const date = new Date(`${video.date}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  const title = `Top ${video.topCount} Plays of the Night`;

  return <article className={featured ? styles.featured : styles.archiveVideo}>
    <div className={`${styles.screen} ${playing ? styles.playing : ""}`}>
      {playing ? <iframe src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&playsinline=1&rel=0`}
        title={`${title} — ${date}`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin" className={styles.player} /> :
        <button type="button" onClick={() => hidden ? setRevealed(true) : setPlaying(true)}
          aria-label={`${hidden ? "Reveal" : "Play"} ${title} — ${date}`} aria-describedby="top-plays-warning"
          className={`${styles.preview} ${hidden ? styles.protected : ""}`}>
          {hidden && featured && <span aria-hidden="true" className={styles.protectedTitle}>TOP {video.topCount}</span>}
          {!hidden && !imageFailed && <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={video.thumbnail} alt="" width={640} height={360} loading={featured ? "eager" : "lazy"}
              onError={() => setImageFailed(true)} className={styles.thumbnail} />
          </>}
          <span className={styles.playButton}>
            {hidden ? <EyeOff aria-hidden="true" className="h-6 w-6" /> : <Play aria-hidden="true" className="h-6 w-6 fill-current" />}
          </span>
          {hidden && <span className={styles.actionLabel}>Reveal preview</span>}
          {!hidden && !imageFailed && featured && <span className={styles.actionLabel}>Play the night</span>}
          {!hidden && imageFailed && <span className="text-sm text-white/70">Preview unavailable · Play video</span>}
          {!hidden && <span className="absolute bottom-3 right-3 rounded bg-black/80 px-2 py-1 text-xs tabular-nums text-white">{Math.floor(video.duration / 60)}:{String(video.duration % 60).padStart(2, "0")}</span>}
        </button>}
    </div>
    <div className={styles.caption}>
      <div>
        <h2 className={featured ? styles.featureTitle : "text-base font-semibold"}>{title}</h2>
        <p className="mt-2 text-sm text-white/70"><time dateTime={video.date}>{date}</time></p>
        {featured && <p className={styles.description}>The night’s best plays, counted down by the NBA. One video, from across the league.</p>}
      </div>
      <div className={styles.actions}>
        <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" aria-describedby="top-plays-warning"
          className="inline-flex min-h-11 items-center gap-2 text-sm text-amber-300 hover:text-amber-200">Watch on YouTube<ExternalLink aria-hidden="true" className="h-4 w-4" /><span className="sr-only">(opens in a new tab)</span></a>
        {playing && <button type="button" onClick={() => setPlaying(false)} className="min-h-11 rounded-lg border border-white/20 px-3 text-sm hover:bg-white/10">Close player</button>}
        {protectedMedia && revealed && <button type="button" onClick={() => { setPlaying(false); setRevealed(false); }} className="min-h-11 text-sm text-white/70 hover:text-white">Hide preview</button>}
      </div>
    </div>
  </article>;
}

export default function TopPlaysPage() {
  const { data, loading, error, retry } = useRemoteData<{ videos: StoredHighlight[] }>("/api/highlights?kind=top-plays");
  const { hideScores, hideHeadlines } = useSpoilerContext();
  const protectedMedia = hideScores || hideHeadlines;
  const [latest, ...earlier] = data?.videos ?? [];

  return <main className={styles.page}>
    <header className={styles.header}>
      <h1 className={styles.title}>Top Plays<span aria-hidden="true">.</span></h1>
      <p className={styles.intro}>Top 10. Top 5.<br /><span>The best of the night.</span></p>
    </header>
    <p id="top-plays-warning" className={styles.warning}>Official NBA videos, updated daily. {protectedMedia ? "Previews stay hidden until you reveal them. " : ""}Videos and YouTube may reveal results.</p>
    {error ? <DataError subject="top plays" retry={retry} /> : loading ?
      <div role="status" aria-label="Loading top plays" className={`${styles.screen} motion-safe:animate-pulse`} /> : latest ? <>
        <NightVideo key={`${latest.id}:${hideScores}:${hideHeadlines}`} video={latest} featured protectedMedia={protectedMedia} />
        {earlier.length > 0 && <section aria-labelledby="previous-nights" className={styles.archive}>
          <h2 id="previous-nights" className="mb-6 text-xl font-semibold">Previous nights</h2>
          <div className={styles.archiveGrid}>
            {earlier.map((video) => <NightVideo key={`${video.id}:${hideScores}:${hideHeadlines}`} video={video} protectedMedia={protectedMedia} />)}
          </div>
        </section>}
      </> : <div className={styles.empty}>
        <h2 className="text-xl font-semibold">No nightly countdowns yet</h2>
        <p className="mt-2 text-sm text-white/70">Recent Top 10 and Top 5 videos will appear after the next NBA video sync.</p>
      </div>}
    <a href="https://www.youtube.com/@NBA/search?query=plays%20of%20the%20night" target="_blank" rel="noopener noreferrer" aria-describedby="top-plays-warning"
      className="mt-8 inline-flex min-h-11 items-center gap-2 text-sm text-white/70 underline underline-offset-4 hover:text-white">Browse nightly countdowns on YouTube<ExternalLink aria-hidden="true" className="h-4 w-4" /><span className="sr-only">(opens in a new tab)</span></a>
  </main>;
}
