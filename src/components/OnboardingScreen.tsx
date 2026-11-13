"use client";
import type { KeyboardEvent } from "react";
import { continueLabel, nextOnboardingTeamId, onboardingCopy } from "@/lib/onboarding";
import type { Team } from "@/lib/teams";
import { yourTeamsCopy } from "@/lib/yourTeams";

export function OnboardingScreen({
  teams,
  loadError,
  selectedId,
  saveError,
  onSelect,
  onContinue,
  onSkip,
  onRetry,
}: {
  teams: readonly Team[];
  loadError: boolean;
  selectedId: number | null;
  saveError: boolean;
  onSelect: (id: number) => void;
  onContinue: () => void;
  onSkip: () => void;
  onRetry: () => void;
}) {
  const selected = teams.find((team) => team.id === selectedId) ?? null;
  const activeId = selectedId ?? teams[0]?.id ?? null;
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const nextId = nextOnboardingTeamId(selectedId, event.key, teams.map((team) => team.id));
    if (nextId == null) return;
    event.preventDefault();
    onSelect(nextId);
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 py-6 sm:px-8">
      <h1 id="onboarding-heading" tabIndex={-1} data-onboarding-focus={loadError ? undefined : ""} className="text-2xl font-bold tracking-tight" style={{ outline: "none" }}>{onboardingCopy.heading}</h1>
      <p id="onboarding-promise" className="mt-2 text-sm text-white/70">{onboardingCopy.subcopy}</p>
      {loadError ? (
        <div className="mt-8">
          <p role="alert" className="text-sm text-amber-200">{onboardingCopy.loadError}</p>
          <button
            type="button"
            data-onboarding-focus=""
            onClick={onRetry}
            className="mt-4 min-h-11 min-w-11 rounded-lg bg-white px-4 text-sm font-semibold text-black"
          >
            {onboardingCopy.retry}
          </button>
        </div>
      ) : (
        <div
          role="radiogroup"
          aria-labelledby="onboarding-heading"
          aria-describedby="onboarding-promise"
          onKeyDown={onKeyDown}
          className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6"
        >
          {teams.map((team) => {
            const checked = team.id === selectedId;
            return (
              <button
                key={team.id}
                type="button"
                role="radio"
                aria-checked={checked}
                aria-label={`${team.city} ${team.name}`}
                tabIndex={team.id === activeId ? 0 : -1}
                onClick={() => onSelect(team.id)}
                className="flex min-h-11 min-w-11 flex-col items-center gap-2 rounded-xl p-2 hover:bg-white/10"
                style={{
                  border: "2px solid transparent",
                  boxShadow: checked ? "inset 0 0 0 2px #fbbf24" : undefined,
                  backgroundColor: checked ? "rgba(251, 191, 36, 0.16)" : undefined,
                }}
              >
                <span className="block shrink-0 overflow-hidden rounded-md bg-white/10" style={{ width: 48, height: 48 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={team.logo} alt="" width={48} height={48} className="h-12 w-12 object-contain" />
                </span>
                <span className="text-center text-xs leading-tight text-white/80">{team.city} {team.name}</span>
              </button>
            );
          })}
        </div>
      )}
      <div className={loadError ? "mt-6" : "sticky bottom-0 mt-auto bg-[#0a0a0a] pt-4"}>
        {saveError && <p role="alert" className="mb-3 text-sm text-amber-200">{yourTeamsCopy.saveError}</p>}
        {!loadError && (
          <button
            id="onboarding-continue"
            type="button"
            disabled={!selected}
            onClick={onContinue}
            className="min-h-11 w-full rounded-lg bg-white px-4 text-sm font-semibold text-black disabled:opacity-40"
          >
            {selected ? continueLabel(selected) : onboardingCopy.continue}
          </button>
        )}
        <button
          id="onboarding-skip"
          type="button"
          onClick={onSkip}
          className={loadError
            ? "mt-3 min-h-11 rounded-lg px-3 text-sm text-white/70 hover:bg-white/10 hover:text-white"
            : "mt-2 min-h-11 w-full rounded-lg px-4 text-sm text-white/70 hover:bg-white/10 hover:text-white"}
        >
          {onboardingCopy.skip}
        </button>
      </div>
    </div>
  );
}
