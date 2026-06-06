import type { BaseResponse } from "./types";

/**
 * Build a user-facing string from an API error response.
 *
 * Backend Rpom returns RFC 7807 ProblemDetails. For `General.Validation`
 * failures the per-field messages live in `extensions.errors[]`, while
 * `detail` is only the generic "One or more validation errors occurred".
 * Showing just `detail` masks the real reason, so we splice the field
 * errors in when present.
 */
export function formatApiError<T>(res: BaseResponse<T>): string {
  if (res.isSuccess) return "";
  const extensions = res.extensions as { errors?: Array<{ description?: string }> } | null;
  const fieldErrors = extensions?.errors;
  if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
    return fieldErrors
      .map(e => e.description)
      .filter((s): s is string => Boolean(s))
      .join("\n");
  }
  return res.detail || res.title || "Lỗi không xác định";
}
