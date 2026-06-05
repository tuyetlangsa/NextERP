"use client";

import { http } from "@/lib/http/client";
import { setAccessToken } from "@/lib/http/auth-storage";
import type { LoginRequest, LoginResponse, MeResponse } from "@/types/api/auth";

export const authApi = {
  /** POST /api/auth/login — persists access token on success. */
  async login(request: LoginRequest): Promise<LoginResponse> {
    const data = await http.post<LoginResponse, LoginRequest>("/api/auth/login", request);
    setAccessToken(data.accessToken);
    return data;
  },

  /** GET /api/auth/me — current session info + permissions. */
  async me(): Promise<MeResponse> {
    return http.get<MeResponse>("/api/auth/me");
  },

  /** Local-only sign out — clears stored token. */
  logout(): void {
    setAccessToken(null);
  },
};
