"use client";
import { createContext, useContext } from "react";
import { useSpoilerMode } from "@/hooks/useSpoilerMode";

interface SpoilerContextValue {
  spoilerFree: boolean;
  hideScores: boolean;
  hideHeadlines: boolean;
  toggleSpoiler: () => void;
  setHideScores: (hideScores: boolean) => void;
  setHideHeadlines: (hideHeadlines: boolean) => void;
}

const SpoilerContext = createContext<SpoilerContextValue>({
  spoilerFree: true,
  hideScores: true,
  hideHeadlines: true,
  toggleSpoiler: () => {},
  setHideScores: () => {},
  setHideHeadlines: () => {},
});

export function SpoilerModeProvider({ children }: { children: React.ReactNode }) {
  const value = useSpoilerMode();
  return <SpoilerContext.Provider value={value}>{children}</SpoilerContext.Provider>;
}

export function useSpoilerContext() {
  return useContext(SpoilerContext);
}
