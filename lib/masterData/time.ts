/** Parse API TimeOnly "HH:mm:ss" → form input "HH:mm". */
export function toTimeInput(value: string): string {
  if (!value) return "";
  return value.length >= 5 ? value.slice(0, 5) : value;
}

function timeToMinutes(t: string): number {
  const parts = t.split(":");
  const h = Number(parts[0] ?? 0);
  const m = Number(parts[1] ?? 0);
  return h * 60 + m;
}

/** True when end time is earlier than begin (overnight shift). */
export function computeIsNextDay(beginTime: string, endTime: string): boolean {
  if (!beginTime || !endTime) return false;
  return timeToMinutes(endTime) < timeToMinutes(beginTime);
}
