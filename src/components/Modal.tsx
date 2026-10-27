"use client";
import { useEffect, useRef, type ReactNode } from "react";

export default function Modal({ title, onClose, children, wide = false }: {
  title: string; onClose: () => void; children: ReactNode; wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current!;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
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
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className={`m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] overflow-y-auto rounded-2xl border border-white/10 bg-[#141414] p-0 text-white backdrop:bg-black/75 ${wide ? "max-w-3xl" : "max-w-md"}`}
    >
      <div className="p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="min-h-11 rounded-lg px-3 text-sm text-white/80 hover:bg-white/10">
            Close
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
