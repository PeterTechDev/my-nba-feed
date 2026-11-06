"use client";
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { teams, getChartColor, getTeamById, getCeltics } from "@/lib/teams";
import { yourTeamsCopy, normalizeFollowing, sameIds, isStoreReady, yourTeamsSaveEvents, commitYourTeamsPreferences } from "@/lib/yourTeams";
import { recordProductEvent } from "@/lib/productEvents";
import { useFavoriteTeams } from "@/hooks/useFavoriteTeams";
import { useTeam } from "@/hooks/useTeam";
import Modal from "./Modal";

const east = teams.filter((team) => team.conference === "East");
const west = teams.filter((team) => team.conference === "West");
/** Visual order of the picker grid, used for arrow-key navigation. */
const pickerOrder = [...east, ...west].map((team) => team.id);

/**
 * Radio-group keyboard pattern: arrows and Home/End move the selection
 * without leaving the picker; Enter, Space or a click confirms it.
 */
function nextPickerId(currentId: number, key: string): number | null {
  const index = pickerOrder.indexOf(currentId);
  const last = pickerOrder.length - 1;
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return pickerOrder[index >= last ? 0 : index + 1];
    case "ArrowLeft":
    case "ArrowUp":
      return pickerOrder[index <= 0 ? last : index - 1];
    case "Home":
      return pickerOrder[0];
    case "End":
      return pickerOrder[last];
    default:
      return null;
  }
}

export function YourTeamsForm({
  ready,
  picking,
  focusId,
  followingIds,
  saveError,
  onOpenPicker,
  onBack,
  onMove,
  onPick,
  onToggle,
  onDone,
}: {
  ready: boolean;
  picking: boolean;
  focusId: number;
  followingIds: number[];
  saveError: boolean;
  onOpenPicker: () => void;
  onBack: () => void;
  /** Arrow-key movement inside the picker: selects without closing it. */
  onMove?: (id: number) => void;
  onPick: (id: number) => void;
  onToggle: (id: number) => void;
  onDone: () => void;
}) {
  const focus = getTeamById(focusId) ?? getCeltics();

  if (!ready) {
    return (
      <div role="status" aria-label={yourTeamsCopy.loading} className="space-y-6">
        <section aria-labelledby="your-teams-focus-label">
          <h3 id="your-teams-focus-label" className="text-base font-semibold">{yourTeamsCopy.focusLabel}</h3>
          <p className="mt-1 text-sm text-white/70">{yourTeamsCopy.focusHelper}</p>
          <div className="mt-3 h-14 rounded-xl bg-white/5 motion-safe:animate-pulse" />
        </section>
        <section aria-labelledby="your-teams-following-label">
          <h3 id="your-teams-following-label" className="text-base font-semibold">{yourTeamsCopy.followingLabel}</h3>
          <p className="mt-1 text-sm text-white/70">{yourTeamsCopy.followingHelper}</p>
          <div className="mt-3 h-24 rounded-xl bg-white/5 motion-safe:animate-pulse" />
        </section>
      </div>
    );
  }

  if (picking) {
    const handlePickerKey = (event: KeyboardEvent<HTMLDivElement>) => {
      const nextId = nextPickerId(focus.id, event.key);
      if (nextId === null) return;
      event.preventDefault();
      onMove?.(nextId);
    };
    return (
      <div>
        <button type="button" onClick={onBack} className="mb-4 min-h-11 rounded-lg px-3 text-sm text-white/80 hover:bg-white/10">
          {yourTeamsCopy.back}
        </button>
        <div role="radiogroup" aria-labelledby="your-teams-focus-label" onKeyDown={handlePickerKey} className="space-y-6">
          <h3 id="your-teams-focus-label" className="text-base font-semibold">{yourTeamsCopy.focusLabel}</h3>
          {(["East", "West"] as const).map((conference) => (
            <div key={conference}>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/70">{conference}ern Conference</h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 sm:gap-3">
                {(conference === "East" ? east : west).map((team) => {
                  const selected = team.id === focus.id;
                  return (
                    <button
                      key={team.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      tabIndex={selected ? 0 : -1}
                      aria-label={`${team.city} ${team.name}`}
                      onClick={() => onPick(team.id)}
                      className="relative flex min-h-11 flex-col items-center gap-1.5 rounded-xl p-3 hover:bg-white/10"
                      style={selected
                        ? { border: `2px solid ${getChartColor(team.primaryColor)}`, backgroundColor: `${team.primaryColor}20` }
                        : { border: "2px solid transparent" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={team.logo} alt="" width={40} height={40} className="h-10 w-10 object-contain" />
                      <span className="text-center text-xs leading-tight text-white/80">{team.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); onDone(); }}>
      <section aria-labelledby="your-teams-focus-label" aria-describedby="your-teams-focus-help">
        <h3 id="your-teams-focus-label" className="text-base font-semibold">{yourTeamsCopy.focusLabel}</h3>
        <p id="your-teams-focus-help" className="mt-1 text-sm text-white/70">{yourTeamsCopy.focusHelper}</p>
        <div id="your-teams-current-focus" tabIndex={-1} className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={focus.logo} alt="" width={40} height={40} className="h-10 w-10 shrink-0 object-contain" />
          <p className="min-w-0 flex-1 text-sm font-medium">{focus.city} {focus.name}</p>
          <button type="button" onClick={onOpenPicker} className="min-h-11 shrink-0 rounded-lg border border-white/15 px-3 text-sm font-medium hover:bg-white/10">
            {yourTeamsCopy.change}
          </button>
        </div>
      </section>
      <section aria-labelledby="your-teams-following-label" aria-describedby="your-teams-following-help" className="mt-6">
        <h3 id="your-teams-following-label" className="text-base font-semibold">{yourTeamsCopy.followingLabel}</h3>
        <p id="your-teams-following-help" className="mt-1 text-sm text-white/70">{yourTeamsCopy.followingHelper}</p>
        {followingIds.length === 0 && <p className="mt-3 text-sm text-white/70">{yourTeamsCopy.emptyFollowing}</p>}
        <div className="mt-4 space-y-6">
          {(["East", "West"] as const).map((conference) => (
            <div key={conference}>
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-white/70">{conference}ern Conference</h4>
              <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {(conference === "East" ? east : west).map((team) => (
                  <li key={team.id}>
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 hover:bg-white/10">
                      <input
                        type="checkbox"
                        className="h-4 w-4 shrink-0 accent-amber-500"
                        checked={followingIds.includes(team.id)}
                        onChange={() => onToggle(team.id)}
                      />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={team.logo} alt="" width={28} height={28} className="h-7 w-7 object-contain" />
                      <span className="text-sm text-white/80">{team.city} {team.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
      {saveError && <p role="alert" className="mt-4 text-sm text-amber-200">{yourTeamsCopy.saveError}</p>}
      <div className="sticky bottom-0 mt-6 border-t border-white/10 bg-[#141414] py-4">
        <button type="submit" className="min-h-11 w-full rounded-lg bg-white/10 px-4 text-sm font-medium hover:bg-white/20">
          {yourTeamsCopy.done}
        </button>
      </div>
    </form>
  );
}

/** If a store's hydration fails (corrupt saved JSON), it never reports finished. Do not leave the dialog on its skeleton. */
const hydrationFallbackMs = 1000;

export default function YourTeamsDialog({ onClose }: { onClose: () => void }) {
  const selectedTeam = useTeam((state) => state.selectedTeam);
  const favoriteTeamIds = useFavoriteTeams((state) => state.favoriteTeamIds);
  const [ready, setReady] = useState(false);
  const [picking, setPicking] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [focusId, setFocusId] = useState(selectedTeam.id);
  const [followingIds, setFollowingIds] = useState<number[]>(favoriteTeamIds);
  const [initial, setInitial] = useState<{ focusId: number; followingIds: number[] } | null>(null);
  const applied = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const dirty = initial !== null
    && (initial.focusId !== focusId || !sameIds(initial.followingIds, normalizeFollowing(followingIds)));

  useLayoutEffect(() => {
    if (!ready) return;
    const panel = panelRef.current;
    const target = confirmDiscard
      ? panel?.querySelector<HTMLElement>("#your-teams-keep-editing")
      : picking
        ? panel?.querySelector<HTMLElement>("[role='radio'][aria-checked='true']")
        : panel?.querySelector<HTMLElement>("#your-teams-current-focus");
    target?.focus();
  }, [ready, picking, focusId, confirmDiscard]);

  useLayoutEffect(() => {
    let active = true;
    const apply = () => {
      if (!active || applied.current) return;
      applied.current = true;
      const start = {
        focusId: useTeam.getState().selectedTeam.id,
        followingIds: normalizeFollowing(useFavoriteTeams.getState().favoriteTeamIds),
      };
      setInitial(start);
      setFocusId(start.focusId);
      setFollowingIds(start.followingIds);
      setReady(true);
    };
    const sync = () => {
      if (isStoreReady(useTeam) && isStoreReady(useFavoriteTeams)) apply();
    };
    sync();
    const unsubscribers = [useTeam, useFavoriteTeams].map((store) => store.persist?.onFinishHydration(sync));
    const fallback = window.setTimeout(apply, hydrationFallbackMs);
    return () => {
      active = false;
      window.clearTimeout(fallback);
      for (const unsubscribe of unsubscribers) unsubscribe?.();
    };
  }, []);

  function requestClose() {
    if (confirmDiscard) {
      // Esc or Close while the prompt is showing means "keep editing".
      setConfirmDiscard(false);
      return;
    }
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  }

  function save() {
    const focus = getTeamById(focusId) ?? getCeltics();
    const following = normalizeFollowing(followingIds);
    const previous = {
      focusId: useTeam.getState().selectedTeam.id,
      followingIds: useFavoriteTeams.getState().favoriteTeamIds,
    };
    const outcome = commitYourTeamsPreferences(window.localStorage, { focus, followingIds: following });
    useTeam.persist?.rehydrate();
    useFavoriteTeams.persist?.rehydrate();
    if (!outcome.committed) {
      setSaveError(true);
      return;
    }
    for (const event of yourTeamsSaveEvents(previous, { focusId: focus.id, followingIds: following })) {
      recordProductEvent(event);
    }
    onClose();
  }

  return (
    <Modal title={yourTeamsCopy.title} onClose={requestClose} wide sheet closeOnBackdrop={!dirty}>
      <div ref={panelRef}>
        {confirmDiscard && (
          <div role="alert" aria-labelledby="your-teams-discard-prompt" className="mb-5 rounded-xl border border-amber-300/30 bg-amber-300/5 p-4">
            <p id="your-teams-discard-prompt" className="text-sm font-medium">{yourTeamsCopy.discardPrompt}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button id="your-teams-keep-editing" type="button" onClick={() => setConfirmDiscard(false)}
                className="min-h-11 rounded-lg bg-white/10 px-4 text-sm font-medium hover:bg-white/20">
                {yourTeamsCopy.keepEditing}
              </button>
              <button type="button" onClick={onClose}
                className="min-h-11 rounded-lg border border-white/15 px-4 text-sm font-medium hover:bg-white/10">
                {yourTeamsCopy.discard}
              </button>
            </div>
          </div>
        )}
        <YourTeamsForm
          ready={ready}
          picking={picking}
          focusId={focusId}
          followingIds={followingIds}
          saveError={saveError}
          onOpenPicker={() => setPicking(true)}
          onBack={() => setPicking(false)}
          onMove={(id) => { setSaveError(false); setFocusId(id); }}
          onPick={(id) => { setSaveError(false); setFocusId(id); setPicking(false); }}
          onToggle={(id) => {
            setSaveError(false);
            setFollowingIds((current) => current.includes(id) ? current.filter((teamId) => teamId !== id) : [...current, id]);
          }}
          onDone={save}
        />
      </div>
    </Modal>
  );
}
