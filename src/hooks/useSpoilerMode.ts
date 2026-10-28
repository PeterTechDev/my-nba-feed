"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { setSpoilerPrefs, type SpoilerPrefs } from "@/lib/api";

const STORAGE_KEY = "nba-feed-spoiler-settings";

function readStored(): SpoilerPrefs {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return { hideScores: true, hideHeadlines: true };
  try {
    const parsed = JSON.parse(stored) as Partial<SpoilerPrefs>;
    return { hideScores: parsed.hideScores ?? true, hideHeadlines: parsed.hideHeadlines ?? true };
  } catch {
    return { hideScores: stored === "true", hideHeadlines: stored === "true" };
  }
}

export function useSpoilerMode() {
  const [settings, setSettings] = useState<SpoilerPrefs>({
    hideScores: true,
    hideHeadlines: true,
  });
  const [mounted, setMounted] = useState(false);
  const synced = useRef(false);
  if (typeof window !== "undefined" && !synced.current) {
    synced.current = true;
    setSpoilerPrefs(readStored());
  }

  useEffect(() => {
    const next = readStored();
    setSettings(next);
    setSpoilerPrefs(next);
    setMounted(true);
  }, []);

  const toggleSpoiler = useCallback(() => {
    setSettings((prev) => {
      const nextValue = !(prev.hideScores && prev.hideHeadlines);
      const next = { hideScores: nextValue, hideHeadlines: nextValue };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSpoilerPrefs(next);
      return next;
    });
  }, []);

  const setHideScores = useCallback((hideScores: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, hideScores };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSpoilerPrefs(next);
      return next;
    });
  }, []);

  const setHideHeadlines = useCallback((hideHeadlines: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, hideHeadlines };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSpoilerPrefs(next);
      return next;
    });
  }, []);

  const effectiveSettings = mounted ? settings : { hideScores: true, hideHeadlines: true };

  return {
    spoilerFree: effectiveSettings.hideScores && effectiveSettings.hideHeadlines,
    hideScores: effectiveSettings.hideScores,
    hideHeadlines: effectiveSettings.hideHeadlines,
    toggleSpoiler,
    setHideScores,
    setHideHeadlines,
    mounted,
  };
}
