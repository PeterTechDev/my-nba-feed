import type { ProductEvent } from "./productEvents";
import { teams } from "./teams";

export const yourTeamsCopy = {
  title: "Your teams",
  focusLabel: "Focus team",
  focusHelper: "Drives scores, schedule, and briefing.",
  followingLabel: "Following for news",
  followingHelper: "Headlines only — scores stay tied to your focus team.",
  done: "Done",
  change: "Change",
  back: "Back",
  emptyFollowing: "No other teams yet. Add teams to see their headlines.",
  saveError: "Couldn't save your teams. Try again.",
  loading: "Loading your teams",
  discard: "Discard",
  discardPrompt: "Discard your changes?",
  keepEditing: "Keep editing",
} as const;

const knownTeamIds = new Set(teams.map((team) => team.id));

/** Keep an explicit follow list. The focus team is not added. */
export function normalizeFollowing(ids: readonly number[]): number[] {
  const seen = new Set<number>();
  const following: number[] = [];
  for (const id of ids) {
    if (!knownTeamIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    following.push(id);
  }
  return following;
}

export function sameIds(left: readonly number[], right: readonly number[]) {
  if (left.length !== right.length) return false;
  const rightIds = new Set(right);
  return left.every((id) => rightIds.has(id));
}

export function yourTeamsSaveEvents(
  before: { focusId: number; followingIds: readonly number[] },
  after: { focusId: number; followingIds: readonly number[] },
): ProductEvent[] {
  const events: ProductEvent[] = [];
  if (before.focusId !== after.focusId) {
    events.push({ name: "team_selected", team_id: after.focusId, source: "your_teams" });
  }
  const previous = normalizeFollowing(before.followingIds);
  const next = normalizeFollowing(after.followingIds);
  if (!sameIds(previous, next)) {
    events.push({ name: "teams_following_updated", count: next.length });
  }
  return events;
}

type PersistedStore = { persist?: { hasHydrated: () => boolean } };

/**
 * A persisted store is ready once it has hydrated. When browser storage is
 * unavailable (blocked cookies, some privacy modes) zustand returns the store
 * without a `persist` API at all, so the in-memory defaults are the final state.
 */
export function isStoreReady(store: PersistedStore) {
  return !store.persist || store.persist.hasHydrated();
}

/** After a failed Done, Esc and Close drop the draft instead of trapping the dialog. */
export function yourTeamsCloseAction(input: { saveError: boolean; confirmDiscard: boolean; dirty: boolean }) {
  if (input.saveError) return "close" as const;
  if (input.confirmDiscard) return "keep-editing" as const;
  if (input.dirty) return "confirm-discard" as const;
  return "close" as const;
}
