"use client";
import { useCallback, useEffect, useState } from "react";

interface Snapshot { data: unknown; loading: boolean; error: boolean }
interface Entry {
  snapshot: Snapshot;
  listeners: Set<() => void>;
  updatedAt: number;
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
  if (entry.pending) return entry.pending as Promise<T>;
  if (!force && !entry.snapshot.error && entry.snapshot.data !== null && Date.now() - entry.updatedAt < 30000) {
    return Promise.resolve(entry.snapshot.data as T);
  }
  const publish = (snapshot: Snapshot) => {
    entry.snapshot = snapshot;
    entry.listeners.forEach((listener) => listener());
  };
  const controller = new AbortController();
  entry.controller = controller;
  const timeout = setTimeout(() => controller.abort(), 15000);
  publish({ ...entry.snapshot, loading: entry.snapshot.data === null, error: false });
  entry.pending = fetch(url, { signal: controller.signal })
    .then(async (response) => {
      if (!response.ok) throw new Error("Request failed");
      const data = await response.json();
      if (!data || data.error) throw new Error("Data unavailable");
      entry.updatedAt = Date.now();
      publish({ data, loading: false, error: false });
      return data;
    })
    .catch((error) => {
      publish({ ...entry.snapshot, loading: false, error: true });
      throw error;
    })
    .finally(() => {
      clearTimeout(timeout);
      entry.pending = undefined;
      entry.controller = undefined;
    });
  return entry.pending as Promise<T>;
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
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      entry.listeners.delete(sync);
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
