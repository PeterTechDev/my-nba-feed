"use client";
import { useState } from "react";
import { useSpoilerContext } from "./SpoilerModeProvider";

function ProtectedScore({ label, children, inline }: { label: string; children: React.ReactNode; inline: boolean }) {
  const [revealed, setRevealed] = useState(false);
  const result = revealed && <div className="score-reveal">{children}</div>;
  return <div className={inline ? "inline-flex items-center gap-2" : "space-y-2"}>
    {inline && result}
    <div className="flex flex-wrap items-center gap-2">
      {revealed && <span role="status" className={inline ? "sr-only" : "text-sm text-amber-200"}>{label} revealed</span>}
      <button type="button" aria-pressed={revealed} onClick={() => setRevealed((value) => !value)}
        className="min-h-11 rounded-lg border border-white/20 px-3 text-sm text-white/80 hover:bg-white/10">
        {revealed ? "Hide" : "Reveal"} {label}
      </button>
    </div>
    {!inline && result}
  </div>;
}

export default function ScoreReveal({ scope, label, children, inline = false }: { scope: string; label: string; children: React.ReactNode; inline?: boolean }) {
  const { hideScores } = useSpoilerContext();
  return hideScores ? <ProtectedScore key={scope} label={label} inline={inline}>{children}</ProtectedScore> : <>{children}</>;
}
