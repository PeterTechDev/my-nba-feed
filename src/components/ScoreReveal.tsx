"use client";
import { useState } from "react";
import { useSpoilerContext } from "./SpoilerModeProvider";

function ProtectedScore({ label, children, inline, wording }: { label: string; children: React.ReactNode; inline: boolean; wording?: ScoreWording }) {
  const [revealed, setRevealed] = useState(false);
  const result = revealed && <div className="score-reveal">{children}</div>;
  const revealText = wording?.reveal ?? `Reveal ${label}`;
  const hideText = wording?.hide ?? `Hide ${label}`;
  return <div className={inline ? "inline-flex items-center gap-2" : "space-y-2"}>
    {inline && result}
    <div className="flex flex-wrap items-center gap-2">
      {revealed && <span role="status" className={inline ? "sr-only" : "text-sm text-amber-200"}>{wording?.revealed ?? `${label} revealed`}</span>}
      <button type="button" aria-pressed={revealed} onClick={() => setRevealed((value) => !value)}
        className="min-h-11 rounded-lg border border-white/20 px-3 text-sm text-white/80 hover:bg-white/10">
        {revealed ? hideText : revealText}
      </button>
    </div>
    {!inline && result}
  </div>;
}

export interface ScoreWording { reveal: string; hide: string; revealed: string }

export default function ScoreReveal({ scope, label, children, inline = false, wording }: { scope: string; label: string; children: React.ReactNode; inline?: boolean; wording?: ScoreWording }) {
  const { hideScores } = useSpoilerContext();
  return hideScores ? <ProtectedScore key={scope} label={label} inline={inline} wording={wording}>{children}</ProtectedScore> : <>{children}</>;
}
