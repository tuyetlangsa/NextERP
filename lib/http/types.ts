/**
 * Wire-format contract with Rpom-backend (ASP.NET Core).
 * Success: `ApiResult<T> = { isSuccess: true, data: T }` wrapped in HTTP 2xx.
 * Failure: RFC 7807 ProblemDetails wrapped in HTTP 4xx/5xx.
 *
 * See backend `src/Rpom.Api/Results/ApiResult.cs` + `CustomResults.cs`.
 */

export interface ApiResult<T> {
  isSuccess: boolean;
  data: T | null;
}

export interface ValidationErrorItem {
  code: string;
  description: string;
}

/**
 * RFC 7807 ProblemDetails as emitted by backend `CustomResults.Problem`.
 * - `title` carries our `Error.Code`
 * - `detail` carries our `Error.Description`
 * - `status` is the HTTP status code matched from `ErrorType`
 * - `extensions.errors` (optional) contains per-field validation messages
 */
export interface ProblemDetails {
  type?: string;
  title?: string;
  detail?: string;
  status?: number;
  errors?: ValidationErrorItem[];
}
