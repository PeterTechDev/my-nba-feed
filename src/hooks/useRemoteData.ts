"use client";
import { useEffect, useState } from "react";

export async function fetchRemoteData<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("Request failed");
  const data = await response.json();
  if (!data || data.error) throw new Error("Data unavailable");
  return data as T;
}

export function useRemoteData<T>(url: string | null) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    url: string | null; attempt: number; data: T | null; loading: boolean; error: boolean;
  }>({ url: null, attempt: -1, data: null, loading: false, error: false });

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    let cancelled = false;
    const timer = setTimeout(() => controller.abort(), 15000);
    setState({ url, attempt, data: null, loading: true, error: false });

    fetchRemoteData<T>(url, controller.signal)
      .then((data) => {
        if (!cancelled) setState({ url, attempt, data, loading: false, error: false });
      })
      .catch(() => {
        if (!cancelled) setState({ url, attempt, data: null, loading: false, error: true });
      })
      .finally(() => clearTimeout(timer));

    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, [url, attempt]);

  // Clear the previous selection before the new request effect runs.
  const current = state.url === url && state.attempt === attempt;
  return {
    data: current ? state.data : null,
    loading: Boolean(url) && (!current || state.loading),
    error: current && state.error,
    retry: () => setAttempt((value) => value + 1),
  };
}
