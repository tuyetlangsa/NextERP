import { shortTime } from "@/lib/schedule/dates";
import type { ShiftLookupItem } from "@/types/api/restaurant";

function asTimeString(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    // Keep "HH:mm:ss" or "HH:mm" as-is (shortTime for display later).
    return value.trim();
  }
  const hhmm = shortTime(value);
  return hhmm ? `${hhmm}:00` : "";
}

/**
 * Normalize lookup shift rows from GET /api/lookups/shifts.
 * Accepts camelCase / PascalCase and TimeOnly string or object payloads.
 * Also unwraps a mistaken `{ data: Shift[] }` envelope if passed through.
 */
export function normalizeShiftLookups(raw: unknown): ShiftLookupItem[] {
  let list: unknown = raw;
  if (list && typeof list === "object" && !Array.isArray(list)) {
    const obj = list as Record<string, unknown>;
    if (Array.isArray(obj.data)) list = obj.data;
    else if (Array.isArray(obj.Data)) list = obj.Data;
  }
  if (!Array.isArray(list)) return [];

  return list
    .map(item => {
      if (!item || typeof item !== "object") return null;
      const r = item as Record<string, unknown>;
      const id = Number(r.id ?? r.Id);
      if (!Number.isFinite(id) || id <= 0) return null;
      return {
        id,
        code: String(r.code ?? r.Code ?? ""),
        name: String(r.name ?? r.Name ?? `Ca #${id}`),
        beginTime: asTimeString(r.beginTime ?? r.BeginTime),
        endTime: asTimeString(r.endTime ?? r.EndTime),
        isNextDay: Boolean(r.isNextDay ?? r.IsNextDay ?? false),
      } satisfies ShiftLookupItem;
    })
    .filter((x): x is ShiftLookupItem => x != null)
    .sort((a, b) => shortTime(a.beginTime).localeCompare(shortTime(b.beginTime)));
}
