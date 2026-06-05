"use client";

import { http } from "@/lib/http/client";

/**
 * Closed scope catalog mirroring backend `VersionScopes`. Flat enum, no per-id.
 * See `docs/RPOM_Versioning_Strategy.md` §5.
 */
export const Scopes = {
  Menu: "MENU",
  Pricing: "PRICING",
  FloorPlan: "FLOOR_PLAN",
  Kitchen: "KITCHEN",
  Access: "ACCESS",
  Config: "CONFIG",
} as const;

export type Scope = (typeof Scopes)[keyof typeof Scopes];

export interface VersionsResponse {
  versions: Record<string, number>;
}

export const syncApi = {
  getVersions: (scopes: readonly Scope[]) =>
    http.get<VersionsResponse>("/api/sync/versions", {
      params: { scopes: scopes.join(",") },
    }),
};
