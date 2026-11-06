"use client";
import { useState, type ReactNode } from "react";
import YourTeamsDialog from "./YourTeamsDialog";

export default function TeamSelector({ children, className, label }: { children?: ReactNode; className?: string; label?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={className ?? "team-action min-h-11 shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition w-full sm:w-auto"}
      >
        {children ?? "Your teams"}
      </button>
      {open && <YourTeamsDialog onClose={() => setOpen(false)} />}
    </>
  );
}
