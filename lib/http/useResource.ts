"use client";

import { useCallback, useEffect, useState } from "react";
import type { BaseResponse } from "./types";

export interface ResourceState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** True when API was reachable but returned a non-success body (e.g. 4xx/5xx). */
  isApiError: boolean;
  /** True when the request never reached the server (network down, CORS, abort). */
  isOffline: boolean;
}

interface ResourceHandle<T> extends ResourceState<T> {
  reload: () => Promise<void>;
  setData: (next: T | null) => void;
}

/**
 * Wraps a `() => Promise<BaseResponse<T>>` fetcher with loading + error state.
 * Optional `fallback` is used when the request is `isOffline` so dev can keep
 * working with mock data when the backend isn't up.
 */
export function useResource<T>(
  fetcher: () => Promise<BaseResponse<T>>,
  options: { fallback?: T; deps?: ReadonlyArray<unknown> } = {}
): ResourceHandle<T> {
  const { fallback, deps = [] } = options;
  const [data, setData] = useState<T | null>(fallback ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isApiError, setIsApiError] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsApiError(false);
    setIsOffline(false);

    const res = await fetcher();
    if (res.isSuccess) {
      setData(res.data);
    } else if (res.statusCode === 0) {
      setIsOffline(true);
      setError(res.detail);
      if (fallback !== undefined) setData(fallback);
    } else {
      setIsApiError(true);
      setError(res.detail || res.title);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, isApiError, isOffline, reload: load, setData };
}
