import type { ProductEvent } from "./productEvents";
import { teams, type Team } from "./teams";

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

export const focusStorageKey = "nba-feed-team";
export const followingStorageKey = "nba-feed-favorite-teams";
const focusStorageVersion = 2;
const followingStorageVersion = 1;

export type YourTeamsSaveResult = { committed: boolean; restored: boolean };

/**
 * localStorage applies each setItem on its own. QuotaExceededError aborts that
 * one write and there is no multi-key transaction (MDN Storage.setItem).
 * Zustand persist also updates memory before setItem, so a thrown write leaves
 * the feed ahead of storage. This writes the focus key, then the follow key,
 * and puts the previous focus string back if the follow write throws.
 * If that restore also throws, the stored pair can be the new focus with the
 * previous follows. Callers must re-read storage; this does not claim the two
 * keys commit atomically.
 */
export function commitYourTeamsPreferences(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
  next: { focus: Team; followingIds: readonly number[] },
): YourTeamsSaveResult {
  const followingIds = normalizeFollowing(next.followingIds);
  const previousFocus = storage.getItem(focusStorageKey);
  const focusValue = JSON.stringify({ state: { selectedTeam: next.focus }, version: focusStorageVersion });
  const followingValue = JSON.stringify({ state: { favoriteTeamIds: followingIds }, version: followingStorageVersion });
  let focusWritten = false;
  try {
    storage.setItem(focusStorageKey, focusValue);
    focusWritten = true;
    storage.setItem(followingStorageKey, followingValue);
  } catch {
    if (!focusWritten) return { committed: false, restored: true };
    try {
      if (previousFocus === null) storage.removeItem(focusStorageKey);
      else storage.setItem(focusStorageKey, previousFocus);
      return { committed: false, restored: true };
    } catch {
      return { committed: false, restored: false };
    }
  }
  return { committed: true, restored: true };
}
