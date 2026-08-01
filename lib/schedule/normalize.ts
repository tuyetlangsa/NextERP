import type {
  ScheduleAssignmentRow,
  ScheduleDetail,
  ScheduleGenerationType,
  ScheduleRow,
} from "@/types/api/schedule";

/** API DateOnly is yyyy-MM-dd; guard against datetime strings breaking grid keys. */
export function normalizeIsoDate(value: string): string {
  return value.length >= 10 ? value.slice(0, 10) : value;
}

function asGenerationType(value: unknown): ScheduleGenerationType {
  const raw = String(value ?? "").toUpperCase();
  return raw === "AUTO" ? "AUTO" : "MANUAL";
}

/** Accept camelCase or PascalCase list payloads from the API envelope. */
export function normalizeScheduleRow(row: ScheduleRow | Record<string, unknown>): ScheduleRow {
  const r = row as Record<string, unknown>;
  return {
    id: Number(r.id ?? r.Id),
    weekStartDate: normalizeIsoDate(String(r.weekStartDate ?? r.WeekStartDate ?? "")),
    status: String(r.status ?? r.Status) as ScheduleRow["status"],
    publishedAt: (r.publishedAt ?? r.PublishedAt ?? null) as string | null,
    generationType: asGenerationType(r.generationType ?? r.GenerationType),
    sourceTemplateId: (r.sourceTemplateId ?? r.SourceTemplateId ?? null) as number | null,
    sourceTemplateName: (r.sourceTemplateName ?? r.SourceTemplateName ?? null) as string | null,
  };
}

export function normalizeScheduleList(rows: ScheduleRow[] | unknown): ScheduleRow[] {
  if (!Array.isArray(rows)) return [];
  return rows.map(r => normalizeScheduleRow(r as ScheduleRow));
}

export function normalizeAssignment(row: ScheduleAssignmentRow): ScheduleAssignmentRow {
  return { ...row, workDate: normalizeIsoDate(row.workDate) };
}

export function normalizeScheduleDetail(detail: ScheduleDetail | Record<string, unknown>): ScheduleDetail {
  const d = detail as Record<string, unknown>;
  const assignments = (d.assignments ?? d.Assignments ?? []) as ScheduleAssignmentRow[];
  return {
    id: Number(d.id ?? d.Id),
    weekStartDate: normalizeIsoDate(String(d.weekStartDate ?? d.WeekStartDate ?? "")),
    status: String(d.status ?? d.Status) as ScheduleDetail["status"],
    publishedAt: (d.publishedAt ?? d.PublishedAt ?? null) as string | null,
    generationType: asGenerationType(d.generationType ?? d.GenerationType),
    sourceTemplateId: (d.sourceTemplateId ?? d.SourceTemplateId ?? null) as number | null,
    sourceTemplateName: (d.sourceTemplateName ?? d.SourceTemplateName ?? null) as string | null,
    assignments: assignments.map(a => {
      const x = a as unknown as Record<string, unknown>;
      return normalizeAssignment({
        id: Number(x.id ?? x.Id),
        workDate: String(x.workDate ?? x.WorkDate ?? ""),
        shiftId: Number(x.shiftId ?? x.ShiftId),
        shiftName: String(x.shiftName ?? x.ShiftName ?? ""),
        roleId: Number(x.roleId ?? x.RoleId),
        roleName: String(x.roleName ?? x.RoleName ?? ""),
        staffAccountId: (x.staffAccountId ?? x.StaffAccountId ?? null) as number | null,
        staffFullName: (x.staffFullName ?? x.StaffFullName ?? null) as string | null,
        version: Number(x.version ?? x.Version ?? 0),
      });
    }),
  };
}
