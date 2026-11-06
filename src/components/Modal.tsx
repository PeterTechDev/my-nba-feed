"use client";
import { useLayoutEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

function trapDialogFocus(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return;
  const dialog = event.currentTarget;
  const focusable = [...dialog.querySelectorAll<HTMLElement>("button, [href], input, select, textarea")].filter((element) => !element.hasAttribute("disabled") && element.tabIndex >= 0);
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!first || !last) return;
  const active = document.activeElement;
  if (event.shiftKey && (active === first || active === dialog)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || active === dialog)) {
    event.preventDefault();
    first.focus();
  }
}

export default function Modal({ title, onClose, children, wide = false, sheet = false }: {
  title: string; onClose: () => void; children: ReactNode; wide?: boolean; sheet?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onKeyDown={trapDialogFocus}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className={sheet
        ? "m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] scroll-pt-24 overflow-y-auto rounded-2xl border border-white/10 bg-[#141414] p-0 text-white backdrop:bg-black/75 max-w-3xl max-sm:m-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:w-full max-sm:max-w-none max-sm:rounded-none"
        : wide
          ? "m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] scroll-pt-24 overflow-y-auto rounded-2xl border border-white/10 bg-[#141414] p-0 text-white backdrop:bg-black/75 max-w-3xl"
          : "m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] scroll-pt-24 overflow-y-auto rounded-2xl border border-white/10 bg-[#141414] p-0 text-white backdrop:bg-black/75 max-w-md"}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/10 bg-[#141414] px-5 py-3 sm:px-6">
        <h2 className="text-xl font-bold">{title}</h2>
        <button type="button" onClick={onClose} className="min-h-11 shrink-0 rounded-lg px-3 text-sm text-white/80 hover:bg-white/10">
          Close
        </button>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </dialog>
  );
}
