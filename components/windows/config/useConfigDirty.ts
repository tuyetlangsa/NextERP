import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Tracks dirty state for a flat set of string-keyed values.
 * Generic — works for both ConfigValue (key=code, val=string|null)
 * and RoundingConfig (key=keyCode, val=number as string).
 */
export function useConfigDirty<T extends string>(
  initial: Map<T, string>
) {
  const originalRef = useRef(initial);
  const [current, setCurrent] = useState<Map<T, string>>(initial);

  // Reset when initial data changes (e.g. after API response arrives)
  useEffect(() => {
    if (initial.size > 0 && originalRef.current !== initial) {
      originalRef.current = initial;
      setCurrent(new Map(initial));
    }
  }, [initial]);

  const dirtyKeys = useMemo(() => {
    const keys = new Set<T>();
    for (const [k, v] of current) {
      if (originalRef.current.get(k) !== v) keys.add(k);
    }
    return keys;
  }, [current]);

  const isDirty = dirtyKeys.size > 0;

  const setValue = useCallback((key: T, value: string) => {
    setCurrent((prev) => new Map(prev).set(key, value));
  }, []);

  /** Returns only the entries that changed. */
  const getChanges = useCallback((): Map<T, string> => {
    const changes = new Map<T, string>();
    for (const key of dirtyKeys) {
      changes.set(key, current.get(key) ?? "");
    }
    return changes;
  }, [current, dirtyKeys]);

  /** After successful save, snapshot current as new original. */
  const commit = useCallback(() => {
    originalRef.current = new Map(current);
    // Force re-render to clear dirtyKeys
    setCurrent(new Map(current));
  }, [current]);

  const reset = useCallback(() => {
    setCurrent(new Map(originalRef.current));
  }, []);

  return { current, dirtyKeys, isDirty, setValue, getChanges, commit, reset };
}
