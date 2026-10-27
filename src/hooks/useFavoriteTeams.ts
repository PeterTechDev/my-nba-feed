"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { teams, Team, migrateLegacyTeamId } from "@/lib/teams";

interface FavoriteTeamsStore {
  favoriteTeamIds: number[];
  toggleTeam: (id: number) => void;
  setFavorites: (ids: number[]) => void;
  clearFavorites: () => void;
}

export const useFavoriteTeams = create<FavoriteTeamsStore>()(
  persist(
    (set) => ({
      favoriteTeamIds: [],
      toggleTeam: (id) =>
        set((state) => ({
          favoriteTeamIds: state.favoriteTeamIds.includes(id)
            ? state.favoriteTeamIds.filter((tid) => tid !== id)
            : [...state.favoriteTeamIds, id],
        })),
      setFavorites: (ids) => set({ favoriteTeamIds: ids }),
      clearFavorites: () => set({ favoriteTeamIds: [] }),
    }),
    {
      name: "nba-feed-favorite-teams", version: 1,
      migrate: (persisted, version) => {
        const saved = persisted as Partial<FavoriteTeamsStore>;
        const ids = Array.isArray(saved?.favoriteTeamIds) ? saved.favoriteTeamIds : [];
        return { favoriteTeamIds: [...new Set(ids.map((id) => version === 0 ? migrateLegacyTeamId(id) : id))]
          .filter((id) => teams.some((team) => team.id === id)) };
      },
    }
  )
);

/** Returns the full Team objects for the user's favorites (in the order selected) */
export function useFavoriteTeamObjects(): Team[] {
  const { favoriteTeamIds } = useFavoriteTeams();
  return favoriteTeamIds
    .map((id) => teams.find((t) => t.id === id))
    .filter((t): t is Team => !!t);
}
