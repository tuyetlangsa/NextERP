"use client";

import { useEffect, useRef } from "react";
import { syncApi, type Scope } from "@/lib/api/sync";

/**
 * Poll backend `/api/sync/versions` on a timer. When any subscribed scope's
 * version increases compared to the cached "seen" snapshot, invoke `onChange`
 * with the list of changed scopes so the caller can refetch heavy data.
 *
 * - The first poll always fires `onChange` for every scope whose remote value
 *   is non-zero (treating "we just mounted" as "we don't know the truth yet").
 *   That way a fresh window reflects current state even before any new bump.
 * - When the request fails (offline / network), we silently skip — next tick
 *   tries again. Errors are not propagated to UI to keep the polling layer
 *   non-blocking; the underlying `useResource` already surfaces its own
 *   loading/error states.
 *
 * Spec: docs/RPOM_Versioning_Strategy.md §9.
 */
export function useDomainVersion(
  scopes: readonly Scope[],
  onChange: (changedScopes: readonly Scope[]) => void,
  intervalMs: number = 5000
) {
  const seenRef = useRef<Record<string, number> | null>(null);
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  const scopesKey = scopes.join(",");

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      const res = await syncApi.getVersions(scopes);
      if (cancelled || !res.isSuccess) return;

      const remote = res.data.versions;
      const seen = seenRef.current;

      if (seen === null) {
        // First poll — record baseline; do NOT fire onChange for a fresh mount
        // because the caller already triggered the initial fetch.
        seenRef.current = { ...remote };
        return;
      }

      const changed = scopes.filter(s => (remote[s] ?? 0) !== (seen[s] ?? 0));
      if (changed.length) {
        seenRef.current = { ...seen, ...remote };
        cbRef.current(changed);
      }
    };

    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopesKey, intervalMs]);
}
