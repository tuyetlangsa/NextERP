"use client";

import { http } from "@/lib/http/client";
import type {
  EditAssignmentResponse,
  GenerateScheduleResponse,
  ScheduleDetail,
  ScheduleRow,
  ScheduleTemplateDetail,
  ScheduleTemplateRow,
  ScheduleTemplateUpsert,
  SwapRequestRow,
  SwapStatus,
} from "@/types/api/schedule";

/**
 * Backend: `Erp/Schedules`, `Erp/ScheduleTemplates`, `Erp/SwapRequests`.
 * No local fallback — a failed call must surface as an error, otherwise the UI
 * would show "saved" data that never reached the database.
 */
export const scheduleApi = {
  listSchedules: (q: { fromWeek?: string; toWeek?: string } = {}) =>
    http.get<ScheduleRow[]>("/api/schedules", { params: q }),

  getSchedule: (id: number) => http.get<ScheduleDetail>(`/api/schedules/${id}`),

  /** Week must be a Monday, next week or later. */
  generateSchedule: (templateId: number, weekStartDate: string) =>
    http.post<GenerateScheduleResponse>("/api/schedules/generate", {
      templateId,
      weekStartDate,
    }),

  duplicateSchedule: (sourceScheduleId: number, weekStartDate: string) =>
    http.post<GenerateScheduleResponse>("/api/schedules/duplicate", {
      sourceScheduleId,
      weekStartDate,
    }),

  publishSchedule: (id: number) =>
    http.post<null>(`/api/schedules/${id}/publish`),

  /** Soft-delete a DRAFT, freeing the week. */
  scrapSchedule: (id: number) => http.delete<null>(`/api/schedules/${id}`),

  /** `staffAccountId` null clears the slot. 409 khi version cũ. */
  editAssignment: (
    assignmentId: number,
    staffAccountId: number | null,
    expectedVersion: number,
  ) =>
    http.put<EditAssignmentResponse>(
      `/api/schedules/assignments/${assignmentId}`,
      { staffAccountId, expectedVersion },
    ),

  listTemplates: () =>
    http.get<ScheduleTemplateRow[]>("/api/schedule-templates"),

  getTemplate: (id: number) =>
    http.get<ScheduleTemplateDetail>(`/api/schedule-templates/${id}`),

  createTemplate: (body: ScheduleTemplateUpsert) =>
    http.post<ScheduleTemplateDetail>("/api/schedule-templates", body),

  updateTemplate: (id: number, body: ScheduleTemplateUpsert) =>
    http.put<ScheduleTemplateDetail>(`/api/schedule-templates/${id}`, body),

  deleteTemplate: (id: number) =>
    http.delete<null>(`/api/schedule-templates/${id}`),

  listSwapRequests: (status?: SwapStatus) =>
    http.get<SwapRequestRow[]>("/api/swap-requests", { params: { status } }),

  approveSwap: (id: number) =>
    http.post<null>(`/api/swap-requests/${id}/approve`),

  rejectSwap: (id: number, note?: string) =>
    http.post<null>(`/api/swap-requests/${id}/reject`, { note: note ?? null }),
};
