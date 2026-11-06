"use client";
import { useTeamPreferences } from "./useTeam";
import { teams, type Team } from "@/lib/teams";

/** Same persisted record as the focus team. Follows are not a second write. */
export const useFavoriteTeams = useTeamPreferences;

/** Returns the full Team objects for the user's favorites (in the order selected) */
export function useFavoriteTeamObjects(): Team[] {
  const { favoriteTeamIds } = useFavoriteTeams();
  return favoriteTeamIds
    .map((id) => teams.find((team) => team.id === id))
    .filter((team): team is Team => !!team);
}
