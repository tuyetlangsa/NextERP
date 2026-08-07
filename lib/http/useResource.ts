"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  /** Refetch; resolves with the latest successful payload (or null on failure / superseded). */
  reload: () => Promise<T | null>;
  setData: (next: T | null) => void;
}

/**
 * Wraps a `() => Promise<BaseResponse<T>>` fetcher with loading + error state.
 * Optional `fallback` is used when the request is `isOffline` so dev can keep
 * working with mock data when the backend isn't up.
 * Set `enabled: false` to skip fetch until enabled becomes true (false→true loads once).
 */
export function useResource<T>(
  fetcher: () => Promise<BaseResponse<T>>,
  options: {
    fallback?: T;
    deps?: ReadonlyArray<unknown>;
    enabled?: boolean;
  } = {}
): ResourceHandle<T> {
  const { fallback, deps = [], enabled = true } = options;
  const [data, setData] = useState<T | null>(fallback ?? null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [isApiError, setIsApiError] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const requestIdRef = useRef(0);
  const prevEnabledRef = useRef<boolean | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async (): Promise<T | null> => {
    const myRequestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    setIsApiError(false);
    setIsOffline(false);

    try {
      const res = await fetcherRef.current();

      // Superseded by a newer load / disable — leave state to the latest owner.
      if (myRequestId !== requestIdRef.current) return null;

      if (res.isSuccess) {
        setData(res.data);
        setLoading(false);
        return res.data;
      }

      if (res.statusCode === 0) {
        setIsOffline(true);
        setError(res.detail);
        if (fallback !== undefined) setData(fallback);
        setLoading(false);
        return fallback ?? null;
      }

      setIsApiError(true);
      setError(res.detail || res.title);
      setLoading(false);
      return null;
    } catch (e) {
      if (myRequestId !== requestIdRef.current) return null;
      setIsApiError(true);
      setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
      setLoading(false);
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    const prev = prevEnabledRef.current;
    prevEnabledRef.current = enabled;

    if (!enabled) {
      // Invalidate in-flight so stale responses cannot clear/overwrite after leaving tab.
      requestIdRef.current += 1;
      setLoading(false);
      return;
    }

    // First mount with enabled=true, or re-enter (false → true): fetch once.
    if (prev === null || prev === false) {
      void load();
    }
  }, [enabled, load]);

  return { data, loading, error, isApiError, isOffline, reload: load, setData };
}
