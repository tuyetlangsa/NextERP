/**
 * Unified envelope returned by every `http.*` call (success or failure).
 *
 * Backend Rpom emits two distinct response bodies:
 *   - success → `ApiResult<T> = { isSuccess: true, data: T }` (HTTP 2xx)
 *   - failure → RFC 7807 ProblemDetails (HTTP 4xx/5xx) with our `Error.Code`
 *               in `title`, description in `detail`, and validation field
 *               errors under `extensions.errors`.
 *
 * The http client normalises both into a single `BaseResponse<T>` shape so
 * callers never need to try/catch — they branch on `isSuccess` and use
 * `data!` on the happy path.
 */

interface GenericResponse<T> {
  isSuccess: boolean;
  message: string;
  data: T | null;
  type: string | null;
  title: string | null;
  status: number | null;
  detail: string | null;
  extensions: Record<string, unknown> | null;
  /** Raw HTTP status injected by the http layer (`0` on network error). */
  statusCode: number;
}

export interface SuccessResponse<T> extends GenericResponse<T> {
  isSuccess: true;
  data: T;
}

export interface ErrorResponse extends GenericResponse<null> {
  isSuccess: false;
  data: null;
  type: string;
  title: string;
  status: number;
  detail: string;
}

export interface ValidationErrorItem {
  code: string;
  description: string;
}

export interface ValidationErrorResponse extends ErrorResponse {
  extensions: { errors: ValidationErrorItem[] };
}

export type BaseResponse<T> =
  | SuccessResponse<T>
  | ErrorResponse
  | ValidationErrorResponse;

export interface PagedResponse<T> extends SuccessResponse<{ items: T }> {
  extensions: {
    pageNumber: number;
    totalItems: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}
