"use client";

/**
 * Persistent JWT storage. Single source of truth read by the axios interceptor
 * and by the React session context.
 *
 * NOTE: localStorage is XSS-readable. Acceptable for v1 capstone; v2 should
 * move to HttpOnly cookie + refresh token rotation.
 */

const KEY = "rpom.accessToken";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}

export function setAccessToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(KEY, token);
  else window.localStorage.removeItem(KEY);
}
