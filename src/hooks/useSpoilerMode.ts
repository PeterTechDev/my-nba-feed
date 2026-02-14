"use client";
import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "nba-feed-spoiler-free";

export function useSpoilerMode() {
  const [spoilerFree, setSpoilerFree] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    // Default: spoiler-free ON (true) if no stored value
    setSpoilerFree(stored === null ? true : stored === "true");
    setMounted(true);
  }, []);

  const toggleSpoiler = useCallback(() => {
    setSpoilerFree((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return { spoilerFree: mounted ? spoilerFree : true, toggleSpoiler, mounted };
}
