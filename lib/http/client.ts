"use client";

import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
} from "axios";
import { getAccessToken, setAccessToken } from "./auth-storage";
import type { BaseResponse, ErrorResponse, SuccessResponse } from "./types";

const BASE_URL =
  process.env.NEXT_PUBLIC_RPOM_API_URL ?? "http://localhost:5000";

export interface HttpOptions {
  token?: string | null;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Query-string params; values that are `undefined`, `null`, or `""` are dropped. */
  params?: object;
}

function cleanParams(params: object | undefined): Record<string, unknown> | undefined {
  if (!params) return undefined;
  const entries = Object.entries(params as Record<string, unknown>).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  return entries.length ? Object.fromEntries(entries) : undefined;
}

const instance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 100_000,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

interface RpomApiSuccessBody<T> {
  isSuccess: true;
  data: T;
}

interface RpomProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  extensions?: Record<string, unknown>;
  errors?: unknown;
}

/**
 * Branch on payload shape:
 *  - `{ isSuccess: true, data }` → unwrap as SuccessResponse.
 *  - ProblemDetails → wrap as ErrorResponse with all PD fields populated.
 */
function normalize<T>(statusCode: number, raw: unknown): BaseResponse<T> {
  if (raw && typeof raw === "object" && "isSuccess" in raw && (raw as RpomApiSuccessBody<T>).isSuccess) {
    const body = raw as RpomApiSuccessBody<T>;
    return {
      isSuccess: true,
      message: "",
      data: body.data,
      type: null,
      title: null,
      status: null,
      detail: null,
      extensions: null,
      statusCode,
    } satisfies SuccessResponse<T>;
  }

  const pd = (raw ?? {}) as RpomProblemDetails;
  const extensions =
    pd.extensions ??
    (pd.errors !== undefined ? ({ errors: pd.errors } as Record<string, unknown>) : null);

  return {
    isSuccess: false,
    message: pd.detail ?? pd.title ?? "Request failed",
    data: null,
    type: pd.type ?? "about:blank",
    title: pd.title ?? `http_${statusCode}`,
    status: pd.status ?? statusCode,
    detail: pd.detail ?? `Request failed with status ${statusCode}`,
    extensions,
    statusCode,
  } satisfies ErrorResponse;
}

async function handleRequest<T>(
  method: "get" | "post" | "put" | "patch" | "delete",
  url: string,
  data?: unknown,
  options: HttpOptions = {}
): Promise<BaseResponse<T>> {
  const config: AxiosRequestConfig = {
    method,
    url,
    data,
    timeout: options.timeoutMs,
    signal: options.signal,
    params: cleanParams(options.params),
  };

  const token = options.token ?? getAccessToken();
  if (token) {
    config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
  }

  try {
    const response = await instance.request<unknown>(config);
    return normalize<T>(response.status, response.data);
  } catch (err) {
    const error = err as AxiosError<unknown>;
    if (error.response) {
      // 401 → clear stored token so next render redirects to login.
      if (error.response.status === 401) setAccessToken(null);
      return normalize<T>(error.response.status, error.response.data);
    }
    // No response = network/timeout/abort. statusCode = 0.
    return normalize<T>(0, {
      title: "network_error",
      detail: error.message || "Không thể kết nối tới máy chủ",
    });
  }
}

export const http = {
  get: <T>(url: string, options?: HttpOptions) =>
    handleRequest<T>("get", url, undefined, options),
  post: <T>(url: string, data?: unknown, options?: HttpOptions) =>
    handleRequest<T>("post", url, data, options),
  put: <T>(url: string, data?: unknown, options?: HttpOptions) =>
    handleRequest<T>("put", url, data, options),
  patch: <T>(url: string, data?: unknown, options?: HttpOptions) =>
    handleRequest<T>("patch", url, data, options),
  delete: <T>(url: string, options?: HttpOptions) =>
    handleRequest<T>("delete", url, undefined, options),
};

export type { BaseResponse } from "./types";
