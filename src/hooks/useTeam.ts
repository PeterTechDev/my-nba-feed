"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Team, getCeltics } from "@/lib/teams";

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
    { name: "nba-feed-team" }
  )
);
