"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Team, getCeltics, teams } from "@/lib/teams";

interface TeamStore {
  selectedTeam: Team;
  setTeam: (team: Team) => void;
}

export const useTeam = create<TeamStore>()(
  persist(
    (set) => ({
      selectedTeam: getCeltics(),
      setTeam: (team) => set({ selectedTeam: team }),
    }),
    {
      name: "nba-feed-team", version: 1,
      migrate: (persisted) => {
        const saved = persisted as Partial<TeamStore>;
        return { selectedTeam: teams.find((team) => team.abbreviation === saved?.selectedTeam?.abbreviation) ?? getCeltics() };
      },
    }
  )
);
