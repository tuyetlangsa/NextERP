/**
 * Shapes mirror the backend Scheduling module (`Rpom.Application.Schedules`,
 * `ScheduleTemplates`, `SwapRequests`). Field names match the API exactly.
 */

export type ScheduleStatus = "DRAFT" | "PUBLISHED" | "DELETED";

export const SCHEDULE_STATUS_LABELS: Record<ScheduleStatus, string> = {
  DRAFT: "Nháp",
  PUBLISHED: "Đã đăng",
  DELETED: "Đã huỷ",
};

/** GET /api/schedules */
export interface ScheduleRow {
  id: number;
  weekStartDate: string;
  status: ScheduleStatus;
  publishedAt: string | null;
  assignmentCount?: number;
  filledCount?: number;
  sourceTemplateName?: string | null;
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

export type ScheduleGenerationType = "MANUAL" | "AUTO";

export const GENERATION_TYPE_LABELS: Record<ScheduleGenerationType, string> = {
  MANUAL: "Tạo thủ công",
  AUTO: "Tự động",
};

/** GET /api/schedules/{id} */
export interface ScheduleDetail {
  id: number;
  weekStartDate: string;
  status: ScheduleStatus;
  publishedAt: string | null;
  sourceTemplateId?: number | null;
  sourceTemplateName?: string | null;
  generationType?: ScheduleGenerationType;
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

/** PUT /api/schedules/assignments/{id} — warnings are non-blocking. */
export interface EditAssignmentResponse {
  assignmentId: number;
  staffAccountId: number | null;
  version: number;
  warnings: string[];
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

export interface ScheduleTemplateUpsert {
  name: string;
  description?: string | null;
  lines: Omit<ScheduleTemplateLine, "id">[];
}

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
