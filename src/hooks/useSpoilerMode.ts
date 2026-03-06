"use client";
import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "nba-feed-spoiler-settings";

interface SpoilerSettings {
  hideScores: boolean;
  hideHeadlines: boolean;
}

export function useSpoilerMode() {
  const [settings, setSettings] = useState<SpoilerSettings>({
    hideScores: true,
    hideHeadlines: true,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setSettings({ hideScores: true, hideHeadlines: true });
      setMounted(true);
      return;
    }

    try {
      const parsed = JSON.parse(stored) as Partial<SpoilerSettings>;
      setSettings({
        hideScores: parsed.hideScores ?? true,
        hideHeadlines: parsed.hideHeadlines ?? true,
      });
    } catch {
      setSettings({
        hideScores: stored === "true",
        hideHeadlines: stored === "true",
      });
    }
    setMounted(true);
  }, []);

  const toggleSpoiler = useCallback(() => {
    setSettings((prev) => {
      const nextValue = !(prev.hideScores && prev.hideHeadlines);
      const next = { hideScores: nextValue, hideHeadlines: nextValue };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const setHideScores = useCallback((hideScores: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, hideScores };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const setHideHeadlines = useCallback((hideHeadlines: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, hideHeadlines };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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
