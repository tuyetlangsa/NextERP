"use client";

import { http } from "@/lib/http/client";
import { setAccessToken } from "@/lib/http/auth-storage";
import type { BaseResponse } from "@/lib/http/types";
import type { LoginRequest, LoginResponse, MeResponse } from "@/types/api/auth";

export const authApi = {
  /** POST /api/auth/login — persists access token on success. */
  async login(request: LoginRequest): Promise<BaseResponse<LoginResponse>> {
    const res = await http.post<LoginResponse>("/api/auth/login", request);
    if (res.isSuccess) setAccessToken(res.data.accessToken);
    return res;
  },

  me: () => http.get<MeResponse>("/api/auth/me"),

  logout(): void {
    setAccessToken(null);
  },
};
