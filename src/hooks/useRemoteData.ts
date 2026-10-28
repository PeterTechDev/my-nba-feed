"use client";
import { useCallback, useEffect, useState } from "react";
import { protectedSpoilerUrl, spoilerHeaders, subscribeSpoilerPrefs } from "@/lib/api";

interface Snapshot { data: unknown; loading: boolean; error: boolean }
interface Entry {
  snapshot: Snapshot;
  listeners: Set<() => void>;
  updatedAt: number;
  mode?: string;
  pending?: Promise<unknown>;
  controller?: AbortController;
  timer?: ReturnType<typeof setInterval>;
}
const entries = new Map<string, Entry>();
const initial: Snapshot = { data: null, loading: true, error: false };

function getEntry(url: string): Entry {
  let entry = entries.get(url);
  if (!entry) {
    entry = { snapshot: initial, listeners: new Set(), updatedAt: 0 };
    entries.set(url, entry);
  }
  return entry;
}

export function fetchRemoteData<T>(url: string, force = false): Promise<T> {
  const entry = getEntry(url);
  const mode = protectedSpoilerUrl(url) ? spoilerHeaders()["x-nba-spoilers"] : "";
  if (entry.pending && entry.mode === mode) return entry.pending as Promise<T>;
  if (!force && entry.mode === mode && !entry.snapshot.error && entry.snapshot.data !== null && Date.now() - entry.updatedAt < 30000) {
    return Promise.resolve(entry.snapshot.data as T);
  }
  if (entry.pending) entry.controller?.abort();
  const publish = (snapshot: Snapshot) => {
    entry.snapshot = snapshot;
    entry.listeners.forEach((listener) => listener());
  };
  const controller = new AbortController();
  entry.controller = controller;
  entry.mode = mode;
  const timeout = setTimeout(() => controller.abort(), 15000);
  publish({ ...entry.snapshot, loading: entry.snapshot.data === null, error: false });
  const headers = mode ? spoilerHeaders() : undefined;
  const promise = fetch(url, { signal: controller.signal, headers })
    .then(async (response) => {
      if (!response.ok) throw new Error("Request failed");
      const data = await response.json();
      if (!data || data.error) throw new Error("Data unavailable");
      entry.updatedAt = Date.now();
      publish({ data, loading: false, error: false });
      return data;
    })
    .catch((error) => {
      if (entry.controller !== controller) throw error;
      publish({ ...entry.snapshot, loading: false, error: true });
      throw error;
    })
    .finally(() => {
      clearTimeout(timeout);
      if (entry.pending === promise) entry.pending = undefined;
      if (entry.controller === controller) entry.controller = undefined;
    });
  entry.pending = promise;
  return promise as Promise<T>;
}

export function useRemoteData<T>(url: string | null, refreshMs = 0) {
  const [state, setState] = useState<Snapshot & { url: string | null }>({ url: null, ...initial });
  useEffect(() => {
    if (!url) return;
    const entry = getEntry(url);
    const sync = () => setState({ url, ...entry.snapshot });
    entry.listeners.add(sync);
    sync();
    void fetchRemoteData(url).catch(() => {});
    const refresh = () => {
      if (document.visibilityState === "visible") void fetchRemoteData(url, true).catch(() => {});
    };
    if (refreshMs && !entry.timer) entry.timer = setInterval(refresh, refreshMs);
    const stopPrefs = protectedSpoilerUrl(url) ? subscribeSpoilerPrefs(refresh) : undefined;
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      entry.listeners.delete(sync);
      stopPrefs?.();
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      if (!entry.listeners.size && entry.timer) {
        clearInterval(entry.timer);
        entry.timer = undefined;
      }
      // StrictMode immediately subscribes again; keep that shared request alive.
      queueMicrotask(() => {
        if (!entry.listeners.size) {
          entry.controller?.abort();
          entries.delete(url);
        }
      });
    };
  }, [url, refreshMs]);
  const retry = useCallback(() => {
    if (url) void fetchRemoteData(url, true).catch(() => {});
  }, [url]);
  const current = state.url === url;
  return {
    data: current ? state.data as T | null : null,
    loading: Boolean(url) && (!current || state.loading),
    error: current && state.error,
    retry,
  };
}
