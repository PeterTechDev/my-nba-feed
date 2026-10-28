"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useRemoteData } from "./useRemoteData";
import { useTeam } from "./useTeam";
import { GameInfo, TeamRecord, GamesResponse, mergeGameReveal, noteGames, revealedGameOverlay, subscribeGameReveals } from "@/lib/api";

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

function useGameOverlay(teamId: string) {
  const [overlay, setOverlay] = useState<GamesResponse | undefined>(undefined);
  useEffect(() => {
    setOverlay(revealedGameOverlay(teamId));
    return subscribeGameReveals(() => setOverlay(revealedGameOverlay(teamId)));
  }, [teamId]);
  return overlay;
}

export function useGameDataFetcher(): GameDataState {
  const { selectedTeam } = useTeam();
  const teamId = String(selectedTeam.id);
  const { data, loading, error, retry } = useRemoteData<GamesResponse>(`/api/games?teamId=${selectedTeam.id}`, 30000);
  const overlay = useGameOverlay(teamId);
  useEffect(() => { if (data) noteGames(teamId, data); }, [data, teamId]);
  return {
    ...defaultState,
    ...(data ? mergeGameReveal(data, overlay) : null),
    loading,
    error: error ? "Game data is unavailable" : null,
    retry,
  };
}
