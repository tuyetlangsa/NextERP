/**
 * Shapes mirror the backend Scheduling module (`Rpom.Application.Schedules`,
 * `ScheduleTemplates`, `SwapRequests`). Field names match the API exactly.
 */

export type ScheduleStatus = "DRAFT" | "PUBLISHED" | "DELETED";

export const SCHEDULE_STATUS_LABELS: Record<ScheduleStatus, string> = {
  DRAFT: "Nháp",
  PUBLISHED: "Đã đăng",
  DELETED: "Đã xóa",
};

export type ScheduleGenerationType = "MANUAL" | "AUTO";

export const GENERATION_TYPE_LABELS: Record<ScheduleGenerationType, string> = {
  MANUAL: "Thủ công",
  AUTO: "Tự động",
};

/** GET /api/schedules */
export interface ScheduleRow {
  id: number;
  weekStartDate: string;
  status: ScheduleStatus;
  publishedAt: string | null;
  generationType: ScheduleGenerationType;
  sourceTemplateId: number | null;
  sourceTemplateName: string | null;
}

/** One cell of the shift × Mon–Sun grid. `staffAccountId` null = ô trống. */
export interface ScheduleAssignmentRow {
  id: number;
  workDate: string;
  shiftId: number;
  shiftName: string;
  roleId: number;
  roleName: string;
  staffAccountId: number | null;
  staffFullName: string | null;
  version: number;
}

/** GET /api/schedules/{id} */
export interface ScheduleDetail {
  id: number;
  weekStartDate: string;
  status: ScheduleStatus;
  publishedAt: string | null;
  generationType: ScheduleGenerationType;
  sourceTemplateId: number | null;
  sourceTemplateName: string | null;
  assignments: ScheduleAssignmentRow[];
}

/** POST /api/schedules/generate | /duplicate */
export interface GenerateScheduleResponse {
  id: number;
  weekStartDate: string;
  status: ScheduleStatus;
  assignmentCount: number;
  filledCount: number;
}

/** PUT /api/schedules/assignments/{id} | POST /api/schedules/{id}/assignments — warnings are non-blocking. */
export interface EditAssignmentResponse {
  assignmentId: number;
  staffAccountId: number | null;
  version: number;
  warnings: AssignmentWarning[] | string[];
}

export interface AssignmentWarning {
  code: string;
  severity: string;
  message: string;
}

/** GET /api/schedules/assignments/{id}/preview */
export interface PreviewAssignmentResponse {
  hasWarnings: boolean;
  warnings: AssignmentWarning[];
}

/** PUT /api/schedules/{id}/assignments/batch */
export interface BatchAssignmentItem {
  assignmentId: number;
  staffAccountId: number | null;
  expectedVersion: number;
}

export interface BatchAssignmentItemResult {
  assignmentId: number;
  staffAccountId: number | null;
  version: number;
  warnings: AssignmentWarning[];
}

export interface BatchAssignmentResponse {
  results: BatchAssignmentItemResult[];
}

/** GET /api/schedule-templates */
export interface ScheduleTemplateRow {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  lineCount: number;
}

/** weekday × shift × role → số người cần */
export interface ScheduleTemplateLine {
  id: number;
  dayOfWeek: number; // 1=Mon … 7=Sun
  shiftId: number;
  roleId: number;
  requiredCount: number;
}

/** GET /api/schedule-templates/{id} */
export interface ScheduleTemplateDetail {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  lines: ScheduleTemplateLine[];
  createdAt: string;
  updatedAt: string;
}

/** POST /api/schedule-templates — BE always creates with IsActive = true. */
export interface ScheduleTemplateCreate {
  name: string;
  description?: string | null;
  lines: Omit<ScheduleTemplateLine, "id">[];
}

/** PUT /api/schedule-templates/{id} — name/description/isActive + full line set. */
export interface ScheduleTemplateUpdate {
  name: string;
  description?: string | null;
  isActive: boolean;
  lines: Omit<ScheduleTemplateLine, "id">[];
}

/** @deprecated Prefer ScheduleTemplateCreate / ScheduleTemplateUpdate. */
export type ScheduleTemplateUpsert = ScheduleTemplateCreate;

export type SwapStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED";

export const SWAP_STATUS_LABELS: Record<SwapStatus, string> = {
  PENDING: "Đang duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Đã từ chối",
  CANCELLED: "Đã hủy",
  EXPIRED: "Quá hạn",
};

/** GET /api/swap-requests */
export interface SwapRequestRow {
  id: number;
  requesterStaffAccountId: number;
  requesterName: string;
  targetStaffAccountId: number;
  targetName: string;
  earliestShiftStartAt: string;
  status: SwapStatus;
  createdAt: string;
}
