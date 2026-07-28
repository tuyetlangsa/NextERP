import type { ScheduleAssignmentRow, ScheduleDetail } from "@/types/api/schedule";

/** API DateOnly is yyyy-MM-dd; guard against datetime strings breaking grid keys. */
export function normalizeIsoDate(value: string): string {
  return value.length >= 10 ? value.slice(0, 10) : value;
}

export function normalizeAssignment(row: ScheduleAssignmentRow): ScheduleAssignmentRow {
  return { ...row, workDate: normalizeIsoDate(row.workDate) };
}

export function normalizeScheduleDetail(detail: ScheduleDetail): ScheduleDetail {
  return {
    ...detail,
    weekStartDate: normalizeIsoDate(detail.weekStartDate),
    assignments: detail.assignments.map(normalizeAssignment),
  };
}
