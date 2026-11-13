"use client";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useTeam } from "@/hooks/useTeam";
import {
  completeOnboarding,
  decideOnboardingPhase,
  loadOnboardingTeams,
  onboardingEscapeAction,
  readTeamList,
} from "@/lib/onboarding";
import { OnboardingScreen } from "./OnboardingScreen";

function trapDialogFocus(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return;
  const dialog = event.currentTarget;
  const focusable = [...dialog.querySelectorAll<HTMLElement>("button, [href], input, select, textarea")]
    .filter((element) => !element.hasAttribute("disabled") && element.tabIndex >= 0);
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!first || !last) return;
  const active = document.activeElement;
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

export default function OnboardingDialog({ onFinished }: { onFinished: (notice: string | null) => void }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [loaded, setLoaded] = useState(() => readTeamList(loadOnboardingTeams));
  const ref = useRef<HTMLDialogElement>(null);

  const finish = (choice: "continue" | "skip") => {
    const selected = loaded.teams.find((team) => team.id === selectedId) ?? null;
    const result = completeOnboarding(
      choice,
      selected,
      useTeam.getState().favoriteTeamIds,
      useTeam.getState().commit,
    );
    if (!result.ok) {
      if (result.reason === "save-failed") setSaveError(true);
      return;
    }
    onFinished(result.notice);
  };

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog?.showModal) return;
    const previousOverflow = document.body.style.overflow;
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = "hidden";
    dialog.querySelector<HTMLElement>("[data-onboarding-focus]")?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    const dialog = ref.current;
    const active = document.activeElement;
    if (!dialog || !(active instanceof HTMLElement) || active.getAttribute("role") !== "radio") return;
    dialog.querySelector<HTMLElement>("[role='radio'][tabindex='0']")?.focus();
  }, [selectedId]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="onboarding-heading"
      aria-describedby="onboarding-promise"
      onCancel={(event) => {
        event.preventDefault();
        finish(onboardingEscapeAction());
      }}
      onKeyDown={trapDialogFocus}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        width: "100vw",
        height: "100dvh",
        maxWidth: "none",
        maxHeight: "none",
        margin: 0,
        padding: 0,
        border: "none",
        background: "#0a0a0a",
      }}
      className="overflow-y-auto text-white backdrop:bg-[#0a0a0a]"
    >
      <OnboardingScreen
        teams={loaded.teams}
        loadError={loaded.error}
        selectedId={selectedId}
        saveError={saveError}
        onSelect={setSelectedId}
        onContinue={() => finish("continue")}
        onSkip={() => finish("skip")}
        onRetry={() => setLoaded(readTeamList(loadOnboardingTeams))}
      />
    </dialog>
  );
}

export function OnboardingFrame({
  phase,
  notice,
  onFinished,
  children,
}: {
  phase: "checking" | "choose" | "ready";
  notice: string | null;
  onFinished?: (notice: string | null) => void;
  children?: ReactNode;
}) {
  if (phase === "checking") return <div aria-busy="true" className="min-h-dvh" />;
  if (phase === "choose") return <OnboardingDialog onFinished={onFinished ?? (() => {})} />;
  return (
    <>
      {notice ? (
        <p role="status" className="border-b border-white/10 bg-[#141414] px-4 py-3 text-center text-sm text-amber-200">
          {notice}
        </p>
      ) : null}
      {children}
    </>
  );
}

export function OnboardingGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<"checking" | "choose" | "ready">("checking");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      setPhase(decideOnboardingPhase((key) => window.localStorage.getItem(key)));
    } catch {
      setPhase("choose");
    }
  }, []);

  if (phase !== "ready") {
    return (
      <OnboardingFrame
        phase={phase}
        notice={null}
        onFinished={(next) => {
          setNotice(next);
          setPhase("ready");
        }}
      />
    );
  }
  return <OnboardingFrame phase="ready" notice={notice}>{children}</OnboardingFrame>;
}
