"use client";
import { useEffect, useState } from "react";
import { useSpoilerContext } from "./SpoilerModeProvider";

export default function SpoilerGuard({ label, children }: { label: string; children: React.ReactNode }) {
  const { hideScores } = useSpoilerContext();
  const [revealed, setRevealed] = useState(false);
  useEffect(() => setRevealed(false), [hideScores]);

  return <>
    {hideScores && <div className={revealed ? "mb-4" : "mb-6 rounded-xl border border-white/15 p-4"}>
      <p role={revealed ? "status" : undefined} className="mb-3 text-sm text-white/80">{revealed ? "Results revealed in this view. Default protection is still on." : "This view includes records and statistics that can reveal game results."}</p>
      <button type="button" aria-pressed={revealed} onClick={() => setRevealed((value) => !value)}
        className="min-h-11 rounded-lg border border-white/20 px-4 text-sm hover:bg-white/10">
        {revealed ? `Hide ${label}` : `Reveal ${label}`}
      </button>
    </div>}
    {(!hideScores || revealed) && <div className="content-reveal">{children}</div>}
  </>;
}
