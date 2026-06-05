"use client";

import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";
import { getAccessToken, setAccessToken } from "./auth-storage";
import { ApiError, problemToApiError } from "./errors";
import type { ApiResult, ProblemDetails } from "./types";

const BASE_URL =
  process.env.NEXT_PUBLIC_RPOM_API_URL ?? "http://localhost:5000";

const instance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

instance.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Response normalization:
 * - On 2xx with `isSuccess: true` → unwrap to `data` field.
 * - On 2xx with `isSuccess: false` (defensive) → throw ApiError.
 * - On non-2xx → parse ProblemDetails and throw ApiError. 401 also clears
 *   the stored access token so the next render redirects to login.
 */
instance.interceptors.response.use(
  (response: AxiosResponse<ApiResult<unknown>>) => {
    const body = response.data;
    if (body && typeof body === "object" && "isSuccess" in body) {
      if (!body.isSuccess) {
        throw new ApiError({
          status: response.status,
          code: "unexpected_failure",
          detail: "Backend returned isSuccess=false without ProblemDetails",
        });
      }
      // Replace body with unwrapped data; downstream sees `response.data === T`.
      (response as AxiosResponse<unknown>).data = body.data;
    }
    return response;
  },
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;
      const problem = error.response.data as ProblemDetails | undefined;
      if (status === 401) setAccessToken(null);
      throw problemToApiError(status, problem);
    }
    if (axios.isAxiosError(error)) {
      throw new ApiError({
        status: 0,
        code: "network_error",
        detail: error.message,
      });
    }
    throw error;
  }
);

/** Generic typed HTTP service. Each method returns the unwrapped `T`. */
export const http = {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await instance.get<unknown, AxiosResponse<T>>(url, config);
    return res.data;
  },
  async post<T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig): Promise<T> {
    const res = await instance.post<unknown, AxiosResponse<T>, B>(url, body, config);
    return res.data;
  },
  async put<T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig): Promise<T> {
    const res = await instance.put<unknown, AxiosResponse<T>, B>(url, body, config);
    return res.data;
  },
  async patch<T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig): Promise<T> {
    const res = await instance.patch<unknown, AxiosResponse<T>, B>(url, body, config);
    return res.data;
  },
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await instance.delete<unknown, AxiosResponse<T>>(url, config);
    return res.data;
  },
};
