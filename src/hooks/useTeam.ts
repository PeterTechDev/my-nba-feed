"use client";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { getCeltics, migrateLegacyTeamId, teams, type Team } from "@/lib/teams";
import { normalizeFollowing } from "@/lib/yourTeams";

/** One persisted record for the focus team and the followed teams. */
export const yourTeamsStorageKey = "nba-feed-your-teams";
const legacyFocusKey = "nba-feed-team";
const legacyFollowingKey = "nba-feed-favorite-teams";
const persistedVersion = 1;

type PersistedPreferences = { selectedTeam: Team; favoriteTeamIds: number[] };

interface TeamPreferences {
  selectedTeam: Team;
  favoriteTeamIds: number[];
  setTeam: (team: Team) => void;
  setFavorites: (ids: number[]) => void;
  toggleTeam: (id: number) => void;
  clearFavorites: () => void;
  /** One set(), so persist writes the pair with one setItem. */
  commit: (focus: Team, followingIds: readonly number[]) => void;
}

function parseEnvelope(raw: string | null): { state: Record<string, unknown>; version: number } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { state?: Record<string, unknown>; version?: number };
    if (!parsed || typeof parsed !== "object") return null;
    return { state: parsed.state ?? {}, version: typeof parsed.version === "number" ? parsed.version : 0 };
  } catch {
    return null;
  }
}

export function focusFromLegacy(raw: string | null): Team {
  const abbreviation = (parseEnvelope(raw)?.state.selectedTeam as { abbreviation?: string } | undefined)?.abbreviation;
  if (!abbreviation) return getCeltics();
  return teams.find((team) => team.abbreviation === abbreviation) ?? getCeltics();
}

export function followsFromLegacy(raw: string | null): number[] {
  const stored = parseEnvelope(raw);
  if (!stored) return [];
  const ids = Array.isArray(stored.state.favoriteTeamIds) ? stored.state.favoriteTeamIds as number[] : [];
  const mapped = ids.map((id) => stored.version === 0 ? migrateLegacyTeamId(id) : id);
  return normalizeFollowing([...new Set(mapped)]);
}

/**
 * True when this browser already has a team preference: the current Your teams
 * record, or either legacy key that record is migrated from. A thrown read
 * (storage denied) is not a saved preference.
 */
export function hasSavedTeamPreference(getItem: (key: string) => string | null): boolean {
  try {
    const canonical = getItem(yourTeamsStorageKey);
    if (usableCanonical(typeof canonical === "string" ? canonical : null)) return true;
    return getItem(legacyFocusKey) != null || getItem(legacyFollowingKey) != null;
  } catch {
    return false;
  }
}

/** A canonical record is only authoritative when it is the current version and names real teams. */
export function usableCanonical(raw: string | null): string | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const stored = parseEnvelope(raw);
  if (!stored || stored.version !== persistedVersion) return null;
  const selected = stored.state.selectedTeam as { abbreviation?: unknown } | undefined;
  const teamOk = typeof selected?.abbreviation === "string"
    && teams.some((team) => team.abbreviation === selected.abbreviation);
  const follows = stored.state.favoriteTeamIds;
  const followsOk = Array.isArray(follows)
    && follows.every((id) => typeof id === "number" && teams.some((team) => team.id === id));
  if (!teamOk || !followsOk) return null;
  return raw;
}

function legacyRecord(backend: StateStorage): string | null {
  const focusRaw = backend.getItem(legacyFocusKey);
  const followRaw = backend.getItem(legacyFollowingKey);
  if (focusRaw instanceof Promise || followRaw instanceof Promise) return null;
  if (focusRaw == null && followRaw == null) return null;
  return JSON.stringify({
    state: {
      selectedTeam: focusFromLegacy(typeof focusRaw === "string" ? focusRaw : null),
      favoriteTeamIds: followsFromLegacy(typeof followRaw === "string" ? followRaw : null),
    },
    version: persistedVersion,
  });
}

/**
 * createJSONStorage owns JSON.parse/stringify of { state, version }.
 * getStorage() must not touch localStorage: createJSONStorage drops the store
 * when that call throws, and later set() updates memory without throwing.
 * A missing, empty, or unreadable canonical value falls back to legacy keys.
 * Those keys are never written or removed here.
 */
export function createYourTeamsStorage(getBackend: () => StateStorage) {
  return createJSONStorage<PersistedPreferences>(() => ({
    getItem(name) {
      const backend = getBackend();
      const current = backend.getItem(name);
      if (current instanceof Promise) return current;
      if (name !== yourTeamsStorageKey) return current;
      const usable = usableCanonical(current);
      if (usable != null) return usable;
      return legacyRecord(backend);
    },
    setItem(name, value) {
      return getBackend().setItem(name, value);
    },
    removeItem(name) {
      return getBackend().removeItem(name);
    },
  }));
}

function writePreferences(
  set: (partial: Partial<Pick<TeamPreferences, "selectedTeam" | "favoriteTeamIds">>) => void,
  get: () => TeamPreferences,
  partial: Partial<Pick<TeamPreferences, "selectedTeam" | "favoriteTeamIds">>,
) {
  const previous = { selectedTeam: get().selectedTeam, favoriteTeamIds: get().favoriteTeamIds };
  try {
    set(partial);
  } catch (error) {
    try { set(previous); } catch { /* the stored record was not replaced */ }
    throw error;
  }
}

export const useTeamPreferences = create<TeamPreferences>()(persist(
  (set, get) => ({
    selectedTeam: getCeltics(),
    favoriteTeamIds: [],
    setTeam: (team) => writePreferences(set, get, { selectedTeam: team }),
    setFavorites: (ids) => writePreferences(set, get, { favoriteTeamIds: normalizeFollowing(ids) }),
    toggleTeam: (id) => {
      const current = get().favoriteTeamIds;
      const next = current.includes(id) ? current.filter((teamId) => teamId !== id) : [...current, id];
      writePreferences(set, get, { favoriteTeamIds: normalizeFollowing(next) });
    },
    clearFavorites: () => writePreferences(set, get, { favoriteTeamIds: [] }),
    commit: (focus, followingIds) => writePreferences(set, get, {
      selectedTeam: focus,
      favoriteTeamIds: normalizeFollowing(followingIds),
    }),
  }),
  {
    name: yourTeamsStorageKey,
    version: persistedVersion,
    partialize: (state) => ({ selectedTeam: state.selectedTeam, favoriteTeamIds: state.favoriteTeamIds }),
    storage: createYourTeamsStorage(() => window.localStorage),
    merge: (persisted, current) => {
      const saved = persisted as Partial<PersistedPreferences> | undefined;
      const selectedTeam = saved?.selectedTeam?.abbreviation
        ? teams.find((team) => team.abbreviation === saved.selectedTeam?.abbreviation) ?? current.selectedTeam
        : current.selectedTeam;
      const favoriteTeamIds = Array.isArray(saved?.favoriteTeamIds) ? normalizeFollowing(saved.favoriteTeamIds) : current.favoriteTeamIds;
      return { ...current, selectedTeam, favoriteTeamIds };
    },
  },
));

export const useTeam = useTeamPreferences;
