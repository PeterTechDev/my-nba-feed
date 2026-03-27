"use client";
import { useEffect, useState } from "react";

const STORAGE_KEY = "nba-feed-last-visit";

interface LastVisitState {
  /** ISO string of the previous visit, null on first visit */
  lastVisitAt: string | null;
  /** Whether we have finished reading from localStorage */
  ready: boolean;
}

/**
 * Stores the current visit timestamp and exposes the *previous* visit time.
 * On first visit, lastVisitAt is null (no separator shown).
 */
export function useLastVisit(): LastVisitState {
  const [state, setState] = useState<LastVisitState>({
    lastVisitAt: null,
    ready: false,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      // Update last-visit to now for the NEXT session
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
      setState({ lastVisitAt: stored, ready: true });
    } catch {
      // localStorage unavailable (SSR or private mode)
      setState({ lastVisitAt: null, ready: true });
    }
  }, []);

  return state;
}
