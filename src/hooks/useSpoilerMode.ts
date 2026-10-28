"use client";
import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "nba-feed-spoiler-settings";

interface SpoilerPrefs {
  hideScores: boolean;
  hideHeadlines: boolean;
}

function setSpoilerPrefs(next: SpoilerPrefs) {
  const host = globalThis as typeof globalThis & {
    __nbaSpoilerBus?: { prefs: SpoilerPrefs; listeners: Set<() => void> };
    __nbaGameOverlays?: { revealed: Map<string, unknown>; listeners: Set<() => void> };
  };
  if (!host.__nbaSpoilerBus) host.__nbaSpoilerBus = { prefs: { hideScores: true, hideHeadlines: true }, listeners: new Set() };
  const bus = host.__nbaSpoilerBus;
  if (bus.prefs.hideScores === next.hideScores && bus.prefs.hideHeadlines === next.hideHeadlines) return;
  const hideScoresAgain = next.hideScores && !bus.prefs.hideScores;
  bus.prefs = { hideScores: next.hideScores, hideHeadlines: next.hideHeadlines };
  if (hideScoresAgain && host.__nbaGameOverlays) {
    host.__nbaGameOverlays.revealed.clear();
    host.__nbaGameOverlays.listeners.forEach((listener) => listener());
  }
  bus.listeners.forEach((listener) => listener());
}

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

  const showScoresAndHeadlines = useCallback(() => {
    const next = { hideScores: false, hideHeadlines: false };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSpoilerPrefs(next);
    setSettings(next);
  }, []);

  const effectiveSettings = mounted ? settings : { hideScores: true, hideHeadlines: true };

  return {
    spoilerFree: effectiveSettings.hideScores && effectiveSettings.hideHeadlines,
    hideScores: effectiveSettings.hideScores,
    hideHeadlines: effectiveSettings.hideHeadlines,
    toggleSpoiler,
    setHideScores,
    setHideHeadlines,
    showScoresAndHeadlines,
    mounted,
  };
}
