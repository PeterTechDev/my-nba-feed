"use client";
import { useState } from "react";
import { digestContentIsProtected, useSpoilerContext } from "./SpoilerModeProvider";

export interface ScoreWording { reveal: string; hide: string; revealed: string }

function ProtectedScore({ label, children, inline, scope, wording }: { label: string; children: React.ReactNode; inline: boolean; scope: string; wording?: ScoreWording }) {
  const [revealed, setRevealed] = useState(false);
  const toggle = () => {
    if (revealed) { setRevealed(false); return; }
    const request = (globalThis as typeof globalThis & { __nbaRequestScoreReveal?: (scope: string) => Promise<void> | null }).__nbaRequestScoreReveal?.(scope);
    if (request) { void request.then(() => setRevealed(true)).catch(() => {}); return; }
    setRevealed(true);
  };
  const result = revealed && <div className="score-reveal">{children}</div>;
  const revealText = wording?.reveal ?? `Reveal ${label}`;
  const hideText = wording?.hide ?? `Hide ${label}`;
  return <div className={inline ? "inline-flex items-center gap-2" : "space-y-2"}>
    {inline && result}
    <div className="flex flex-wrap items-center gap-2">
      {revealed && <span role="status" className={inline ? "sr-only" : "text-sm text-amber-200"}>{wording?.revealed ?? `${label} revealed`}</span>}
      <button type="button" aria-pressed={revealed} onClick={toggle}
        className="min-h-11 rounded-lg border border-white/20 px-3 text-sm text-white/80 hover:bg-white/10">
        {revealed ? hideText : revealText}
      </button>
    </div>
    {!inline && result}
  </div>;
}

export default function ScoreReveal({ scope, label, children, inline = false, wording, protectDigest = false }: { scope: string; label: string; children: React.ReactNode; inline?: boolean; wording?: ScoreWording; protectDigest?: boolean }) {
  const settings = useSpoilerContext();
  const hidden = protectDigest ? digestContentIsProtected(settings) : settings.hideScores;
  return hidden ? <ProtectedScore key={scope} scope={scope} label={label} inline={inline} wording={wording}>{children}</ProtectedScore> : <>{children}</>;
}
