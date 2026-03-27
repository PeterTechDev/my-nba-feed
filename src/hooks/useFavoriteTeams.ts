"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { teams, Team } from "@/lib/teams";

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
    { name: "nba-feed-favorite-teams" }
  )
);

/** Returns the full Team objects for the user's favorites (in the order selected) */
export function useFavoriteTeamObjects(): Team[] {
  const { favoriteTeamIds } = useFavoriteTeams();
  return favoriteTeamIds
    .map((id) => teams.find((t) => t.id === id))
    .filter((t): t is Team => !!t);
}
