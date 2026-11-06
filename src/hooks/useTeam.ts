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
 * createJSONStorage owns JSON.parse/stringify of { state, version }.
 * The new key is authoritative. Legacy keys are read only when it is absent.
 */
export function createYourTeamsStorage(getBackend: () => StateStorage) {
  return createJSONStorage<PersistedPreferences>(() => {
    const backend = getBackend();
    return {
      getItem(name) {
        const current = backend.getItem(name);
        if (current instanceof Promise || current != null) return current;
        if (name !== yourTeamsStorageKey) return null;
        const focusRaw = backend.getItem(legacyFocusKey);
        const followRaw = backend.getItem(legacyFollowingKey);
        if (focusRaw instanceof Promise || followRaw instanceof Promise) return null;
        if (focusRaw == null && followRaw == null) return null;
        return JSON.stringify({
          state: {
            selectedTeam: focusFromLegacy(focusRaw),
            favoriteTeamIds: followsFromLegacy(followRaw),
          },
          version: persistedVersion,
        });
      },
      setItem(name, value) {
        return backend.setItem(name, value);
      },
      removeItem(name) {
        return backend.removeItem(name);
      },
    };
  });
}

export const useTeamPreferences = create<TeamPreferences>()(persist(
  (set, get) => ({
    selectedTeam: getCeltics(),
    favoriteTeamIds: [],
    setTeam: (team) => set({ selectedTeam: team }),
    setFavorites: (ids) => set({ favoriteTeamIds: normalizeFollowing(ids) }),
    toggleTeam: (id) => {
      const current = get().favoriteTeamIds;
      const next = current.includes(id) ? current.filter((teamId) => teamId !== id) : [...current, id];
      set({ favoriteTeamIds: normalizeFollowing(next) });
    },
    clearFavorites: () => set({ favoriteTeamIds: [] }),
    commit: (focus, followingIds) => {
      const previous = { selectedTeam: get().selectedTeam, favoriteTeamIds: get().favoriteTeamIds };
      try {
        set({ selectedTeam: focus, favoriteTeamIds: normalizeFollowing(followingIds) });
      } catch (error) {
        try { set(previous); } catch { /* memory is already the saved pair; storage rejected the replacement */ }
        throw error;
      }
    },
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
