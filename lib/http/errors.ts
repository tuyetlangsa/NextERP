import type { ProblemDetails, ValidationErrorItem } from "./types";

/**
 * Thrown by the http client whenever the backend returns a non-success response
 * (any HTTP status outside 2xx, OR a 2xx body with `isSuccess: false`).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: string;
  readonly validationErrors: ValidationErrorItem[];

  constructor(opts: {
    status: number;
    code: string;
    detail: string;
    validationErrors?: ValidationErrorItem[];
  }) {
    super(opts.detail || opts.code || `HTTP ${opts.status}`);
    this.name = "ApiError";
    this.status = opts.status;
    this.code = opts.code;
    this.detail = opts.detail;
    this.validationErrors = opts.validationErrors ?? [];
  }

  get isValidation(): boolean { return this.status === 400; }
  get isUnauthorized(): boolean { return this.status === 401; }
  get isNotFound(): boolean { return this.status === 404; }
  get isConflict(): boolean { return this.status === 409; }
}

export function problemToApiError(status: number, body: ProblemDetails | undefined): ApiError {
  return new ApiError({
    status,
    code: body?.title ?? `http_${status}`,
    detail: body?.detail ?? `Request failed with status ${status}`,
    validationErrors: body?.errors ?? [],
  });
}
