"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useTeam } from "./useTeam";
import { fetchGameData, GameInfo, TeamRecord } from "@/lib/api";

interface GameDataState {
  lastGame: GameInfo | null;
  nextGame: GameInfo | null;
  record: TeamRecord;
  loading: boolean;
  error: string | null;
}

const defaultState: GameDataState = {
  lastGame: null,
  nextGame: null,
  record: { wins: 0, losses: 0 },
  loading: true,
  error: null,
};

const GameDataContext = createContext<GameDataState>(defaultState);

export function useGameData() {
  return useContext(GameDataContext);
}

export { GameDataContext };

// Hook for the provider to use
export function useGameDataFetcher(): GameDataState {
  const { selectedTeam } = useTeam();
  const [state, setState] = useState<GameDataState>(defaultState);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    fetchGameData(selectedTeam.id).then((data) => {
      if (cancelled) return;
      setState({
        lastGame: data.lastGame,
        nextGame: data.nextGame,
        record: data.record,
        loading: false,
        error: data.error,
      });
    });

    return () => { cancelled = true; };
  }, [selectedTeam.id]);

  return state;
}
