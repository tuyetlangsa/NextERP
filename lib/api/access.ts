"use client";

import { http } from "@/lib/http/client";
import type {
  ListRolesResponse,
  PagedStaffAccounts,
  StaffAccountDetail,
  CreateStaffAccountRequest,
  UpdateStaffAccountRequest,
  StaffPageAccessResponse,
  RolePageDefaultResponse,
  StaffPermissionsResponse,
  RolePermissionDefaultResponse,
  MyMenuResponse,
} from "@/types/api/access";

export const accessApi = {
  // current account's accessible navigation tree (Start Menu / desktop guard)
  myMenu: () => http.get<MyMenuResponse>("/api/access/my-menu"),

  // roles + accounts
  listRoles: () => http.get<ListRolesResponse>("/api/access/roles"),
  listAccounts: (params: { roleId?: number; search?: string; pageNumber?: number; pageSize?: number }) =>
    http.get<PagedStaffAccounts>("/api/access/staff-accounts", { params }),
  getAccount: (id: number) => http.get<StaffAccountDetail>(`/api/access/staff-accounts/${id}`),
  createAccount: (body: CreateStaffAccountRequest) =>
    http.post<{ id: number; username: string; fullName: string; roleId: number }>("/api/access/staff-accounts", body),
  updateAccount: (id: number, body: UpdateStaffAccountRequest) =>
    http.put<StaffAccountDetail>(`/api/access/staff-accounts/${id}`, body),
  resetPassword: (id: number, newPassword: string) =>
    http.put<null>(`/api/access/staff-accounts/${id}/password`, { newPassword }),

  // page access (Menu tab)
  getPageAccess: (id: number) => http.get<StaffPageAccessResponse>(`/api/access/staff-accounts/${id}/page-access`),
  setPageAccess: (id: number, pageCodes: string[]) =>
    http.put<{ staffAccountId: number; grantedPageCodes: string[] }>(`/api/access/staff-accounts/${id}/page-access`, { pageCodes }),
  getRolePageDefault: (roleCode: string) =>
    http.get<RolePageDefaultResponse>(`/api/access/role-page-defaults/${encodeURIComponent(roleCode)}`),

  // permissions (Quyền chức năng tab)
  getPermissions: (id: number) => http.get<StaffPermissionsResponse>(`/api/access/staff-accounts/${id}/permissions`),
  setPermissions: (id: number, permissionCodes: string[]) =>
    http.put<{ staffAccountId: number; grantedPermissionCodes: string[] }>(`/api/access/staff-accounts/${id}/permissions`, { permissionCodes }),
  getRolePermissionDefault: (roleCode: string) =>
    http.get<RolePermissionDefaultResponse>(`/api/access/role-permission-defaults/${encodeURIComponent(roleCode)}`),
};
