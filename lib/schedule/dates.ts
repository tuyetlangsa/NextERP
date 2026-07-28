export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Thứ 2 của tuần chứa `date` (ISO week, Mon-start). */
export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

export function endOfWeek(monday: Date): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  return d;
}

/** Thứ 2 của tuần kế tiếp — mốc sớm nhất backend cho phép tạo lịch. */
export function nextMonday(from: Date): Date {
  const mon = startOfWeek(from);
  mon.setDate(mon.getDate() + 7);
  return mon;
}

const DD_MM = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

/** "20/07 - 26/07/2026" */
export function weekLabel(weekStartDate: string): string {
  const s = parseIsoDate(weekStartDate);
  const e = endOfWeek(s);
  return `${DD_MM(s)} - ${DD_MM(e)}/${e.getFullYear()}`;
}

const DOW_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"] as const;

/** Các ngày T2→CN của tuần, dùng làm cột lưới. */
export function weekDays(weekStartDate: string): {
  iso: string;
  label: string;
  dayNum: number;
}[] {
  const mon = parseIsoDate(weekStartDate);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return { iso: formatIsoDate(d), label: DOW_SHORT[d.getDay()], dayNum: d.getDate() };
  });
}

/** "T5, 14/07/2026" */
export function formatDateLong(iso: string): string {
  const d = parseIsoDate(iso);
  return `${DOW_SHORT[d.getDay()]}, ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/** "09:00:00" → "09:00" */
export function shortTime(value: string | undefined): string {
  return value ? value.slice(0, 5) : "";
}
