"use client";
import { useState } from "react";
import { useSpoilerContext } from "./SpoilerModeProvider";

function ProtectedScore({ label, children }: { label: string; children: React.ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  return <div className="space-y-2">
    <div className="flex flex-wrap items-center gap-2">
      {revealed && <span role="status" className="text-sm text-amber-200">{label} revealed</span>}
      <button type="button" aria-pressed={revealed} onClick={() => setRevealed((value) => !value)}
        className="min-h-11 rounded-lg border border-white/20 px-3 text-sm text-white/80 hover:bg-white/10">
        {revealed ? "Hide" : "Reveal"} {label}
      </button>
    </div>
    {revealed && children}
  </div>;
}

export default function ScoreReveal({ scope, label, children }: { scope: string; label: string; children: React.ReactNode }) {
  const { hideScores } = useSpoilerContext();
  return hideScores ? <ProtectedScore key={scope} label={label}>{children}</ProtectedScore> : <>{children}</>;
}
