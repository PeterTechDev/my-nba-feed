"use client";
import { createContext, useContext } from "react";
import { useSpoilerMode } from "@/hooks/useSpoilerMode";

interface SpoilerContextValue {
  spoilerFree: boolean;
  toggleSpoiler: () => void;
}

const SpoilerContext = createContext<SpoilerContextValue>({
  spoilerFree: true,
  toggleSpoiler: () => {},
});

export function SpoilerModeProvider({ children }: { children: React.ReactNode }) {
  const value = useSpoilerMode();
  return <SpoilerContext.Provider value={value}>{children}</SpoilerContext.Provider>;
}

export function useSpoilerContext() {
  return useContext(SpoilerContext);
}
