"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "./api";
import { useAcl } from "./provider";

/**
 * Fetches a list endpoint and re-fetches whenever the dashboard snapshot
 * changes, so a sale made in one panel shows up in every table.
 */
export function useResource<T>(path: string | null) {
  const { revision } = useAcl();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!path) return;
      try {
        const next = await apiGet<T>(path, signal);
        if (!signal?.aborted) {
          setData(next);
          setError(null);
        }
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Request failed");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [path],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, revision]);

  return { data, loading, error, reload: () => load() };
}

/** Debounce for search inputs so every keystroke is not a request. */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
