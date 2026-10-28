"use client";
import { useEffect, useRef, useState } from "react";
import { useSpoilerContext } from "./SpoilerModeProvider";

export interface ScoreWording { reveal: string; hide: string; revealed: string }

function ProtectedScore({ label, children, inline, scope, wording, placeholder }: { label: string; children: React.ReactNode; inline: boolean; scope: string; wording?: ScoreWording; placeholder?: React.ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const moved = useRef(false);
  const restoresFocus = useRef(placeholder != null);
  const finish = (next: boolean) => {
    moved.current = true;
    setRevealed(next);
  };
  useEffect(() => {
    if (!restoresFocus.current || !moved.current) return;
    buttonRef.current?.focus();
  }, [revealed]);
  const toggle = () => {
    if (revealed) { finish(false); return; }
    const request = (globalThis as typeof globalThis & { __nbaRequestScoreReveal?: (scope: string) => Promise<void> | null }).__nbaRequestScoreReveal?.(scope);
    if (request) { void request.then(() => finish(true)).catch(() => {}); return; }
    finish(true);
  };
  const result = revealed ? <div className="score-reveal">{children}</div> : placeholder ?? null;
  const revealText = wording?.reveal ?? `Reveal ${label}`;
  const hideText = wording?.hide ?? `Hide ${label}`;
  return <div className={inline ? "inline-flex items-center gap-2" : "space-y-2"}>
    {inline && result}
    <div className="flex flex-wrap items-center gap-2">
      {revealed && <span role="status" className={inline ? "sr-only" : "text-sm text-amber-200"}>{wording?.revealed ?? `${label} revealed`}</span>}
      <button ref={buttonRef} type="button" aria-pressed={revealed} onClick={toggle}
        className="min-h-11 rounded-lg border border-white/20 px-3 text-sm text-white/80 hover:bg-white/10">
        {revealed ? hideText : revealText}
      </button>
    </div>
    {!inline && result}
  </div>;
}

export default function ScoreReveal({ scope, label, children, inline = false, wording, placeholder }: { scope: string; label: string; children: React.ReactNode; inline?: boolean; wording?: ScoreWording; placeholder?: React.ReactNode }) {
  const settings = useSpoilerContext();
  const hidden = settings.hideScores;
  return hidden ? <ProtectedScore key={scope} scope={scope} label={label} inline={inline} wording={wording} placeholder={placeholder}>{children}</ProtectedScore> : <>{children}</>;
}
