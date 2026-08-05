import type {
  ScheduleAssignmentRow,
  ScheduleDetail,
  ScheduleGenerationType,
  ScheduleRow,
  SwapRequestRow,
  SwapStatus,
} from "@/types/api/schedule";

/** API DateOnly is yyyy-MM-dd; guard against datetime strings breaking grid keys. */
export function normalizeIsoDate(value: string): string {
  return value.length >= 10 ? value.slice(0, 10) : value;
}

function asGenerationType(value: unknown): ScheduleGenerationType {
  const raw = String(value ?? "").toUpperCase();
  return raw === "AUTO" ? "AUTO" : "MANUAL";
}

function pickStr(r: Record<string, unknown>, camel: string, pascal: string): string {
  return String(r[camel] ?? r[pascal] ?? "");
}

function pickTime(r: Record<string, unknown>, camel: string, pascal: string): string {
  const v = r[camel] ?? r[pascal];
  if (v == null) return "";
  if (typeof v === "string") return v.length >= 5 ? v.slice(0, 5) : v;
  if (typeof v === "object") {
    const o = v as { hour?: number; minute?: number; Hours?: number; Minutes?: number };
    const h = o.hour ?? o.Hours;
    const m = o.minute ?? o.Minutes;
    if (typeof h === "number" && typeof m === "number") {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  }
  return String(v);
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

export function normalizeSwapRequest(row: SwapRequestRow | Record<string, unknown>): SwapRequestRow {
  const r = row as Record<string, unknown>;
  const workReq = pickStr(r, "requesterWorkDate", "RequesterWorkDate");
  const workTgt = pickStr(r, "targetWorkDate", "TargetWorkDate");
  return {
    id: Number(r.id ?? r.Id),
    requesterStaffAccountId: Number(r.requesterStaffAccountId ?? r.RequesterStaffAccountId),
    requesterName: pickStr(r, "requesterName", "RequesterName"),
    requesterRoleName: pickStr(r, "requesterRoleName", "RequesterRoleName"),
    targetStaffAccountId: Number(r.targetStaffAccountId ?? r.TargetStaffAccountId),
    targetName: pickStr(r, "targetName", "TargetName"),
    requesterWorkDate: workReq ? normalizeIsoDate(workReq) : "",
    requesterShiftName: pickStr(r, "requesterShiftName", "RequesterShiftName"),
    requesterBeginTime: pickTime(r, "requesterBeginTime", "RequesterBeginTime"),
    requesterEndTime: pickTime(r, "requesterEndTime", "RequesterEndTime"),
    targetWorkDate: workTgt ? normalizeIsoDate(workTgt) : "",
    targetShiftName: pickStr(r, "targetShiftName", "TargetShiftName"),
    targetBeginTime: pickTime(r, "targetBeginTime", "TargetBeginTime"),
    targetEndTime: pickTime(r, "targetEndTime", "TargetEndTime"),
    earliestShiftStartAt: String(r.earliestShiftStartAt ?? r.EarliestShiftStartAt ?? ""),
    status: String(r.status ?? r.Status).toUpperCase() as SwapStatus,
    createdAt: String(r.createdAt ?? r.CreatedAt ?? ""),
    reason: (() => {
      const v = r.reason ?? r.Reason;
      if (v == null || v === "") return null;
      return String(v);
    })(),
    reviewNote: (() => {
      const v = r.reviewNote ?? r.ReviewNote;
      if (v == null || v === "") return null;
      return String(v);
    })(),
    reviewedByStaffAccountId: (() => {
      const v = r.reviewedByStaffAccountId ?? r.ReviewedByStaffAccountId;
      if (v == null || v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    })(),
    reviewedByStaffAccountName: (() => {
      const v = r.reviewedByStaffAccountName ?? r.ReviewedByStaffAccountName;
      if (v == null || v === "") return null;
      return String(v);
    })(),
  };
}

export function normalizeSwapList(rows: SwapRequestRow[] | unknown): SwapRequestRow[] {
  if (!Array.isArray(rows)) return [];
  return rows.map(r => normalizeSwapRequest(r as SwapRequestRow));
}
