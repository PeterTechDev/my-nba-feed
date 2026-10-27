"use client";
import { createContext, useContext } from "react";
import { useRemoteData } from "./useRemoteData";
import { useTeam } from "./useTeam";
import { GameInfo, TeamRecord, GamesResponse } from "@/lib/api";

interface GameDataState {
  lastGame: GameInfo | null;
  currentGame: GameInfo | null;
  nextGame: GameInfo | null;
  record: TeamRecord;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

const defaultState: GameDataState = {
  lastGame: null,
  currentGame: null,
  nextGame: null,
  record: { wins: 0, losses: 0 },
  loading: true,
  error: null,
  retry: () => {},
};

const GameDataContext = createContext<GameDataState>(defaultState);

export function useGameData() {
  return useContext(GameDataContext);
}

export { GameDataContext };

export function useGameDataFetcher(): GameDataState {
  const { selectedTeam } = useTeam();
  const { data, loading, error, retry } = useRemoteData<GamesResponse>(`/api/games?teamId=${selectedTeam.id}`);
  return {
    ...defaultState,
    ...data,
    loading,
    error: error ? "Game data is unavailable" : null,
    retry,
  };
}
