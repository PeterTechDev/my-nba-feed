"use client";
import { ReactNode } from "react";
import { GameDataContext, useGameDataFetcher } from "@/hooks/useGameData";

export default function GameDataProvider({ children }: { children: ReactNode }) {
  const gameData = useGameDataFetcher();
  return (
    <GameDataContext.Provider value={gameData}>
      {children}
    </GameDataContext.Provider>
  );
}
