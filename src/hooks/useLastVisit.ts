"use client";
import { useEffect, useState } from "react";

const STORAGE_KEY = "nba-feed-last-visit";
// All feed sections share one previous-visit timestamp for this page session.
let previousVisit: string | null | undefined;

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
      if (previousVisit === undefined) {
        previousVisit = localStorage.getItem(STORAGE_KEY);
        localStorage.setItem(STORAGE_KEY, new Date().toISOString());
      }
      setState({ lastVisitAt: previousVisit, ready: true });
    } catch {
      // localStorage unavailable (SSR or private mode)
      setState({ lastVisitAt: null, ready: true });
    }
  }, []);

  return state;
}
