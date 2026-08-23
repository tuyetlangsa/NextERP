/**
 * Client-side phone/email format checks that MIRROR the backend
 * (`Rpom.Application/Common/ContactValidation.cs`). Kept in sync so the ERP can give immediate,
 * specific feedback with the same wording the API would return.
 *
 * Format-only: empty is treated as valid here (required-ness is enforced separately per form).
 */

// Local "0" + 9–10 digits, or international "+84" + 9–10 digits. No spaces/dashes.
const PHONE_RE = /^(0\d{9,10}|\+84\d{9,10})$/;
// One "@", a dot in the domain, no whitespace.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const PHONE_FORMAT_ERROR =
  "Số điện thoại không đúng định dạng (VD: 0912345678 hoặc +84912345678).";
export const EMAIL_FORMAT_ERROR = "Email không đúng định dạng.";

/** True when empty (optional) or a well-formed Vietnamese phone. */
export function isValidPhone(value?: string | null): boolean {
  const v = (value ?? "").trim();
  return v.length === 0 || PHONE_RE.test(v);
}

/** True when empty (optional) or a well-formed email. */
export function isValidEmail(value?: string | null): boolean {
  const v = (value ?? "").trim();
  return v.length === 0 || EMAIL_RE.test(v);
}
