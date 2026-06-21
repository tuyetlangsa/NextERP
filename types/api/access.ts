// Roles
export interface RoleRow {
  id: number;
  code: string;
  name: string;
  isSystemRole: boolean;
  accountCount: number;
}
export interface ListRolesResponse { roles: RoleRow[]; }

// Account grid
export interface StaffAccountRow {
  id: number;
  username: string;
  fullName: string;
  phone: string | null;
  roleCode: string;
  roleName: string;
  isActive: boolean;
  isLocked: boolean;
}
export interface PagedStaffAccounts {
  items: StaffAccountRow[];
  pageNumber: number | null;
  totalPages: number | null;
  totalCount: number;
}

// Account detail
export interface StaffAccountDetail {
  id: number;
  username: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  roleId: number;
  roleCode: string;
  roleName: string;
  isActive: boolean;
  isLocked: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffAccountRequest {
  username: string;
  password: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  roleId: number;
}
export interface UpdateStaffAccountRequest {
  fullName: string;
  phone?: string | null;
  email?: string | null;
  roleId: number;
  isActive: boolean;
  isLocked: boolean;
}

// Page access (Menu tab)
export interface PageRow { code: string; name: string; granted: boolean; }
export interface PageModuleGroup { code: string; name: string; pages: PageRow[]; }
export interface StaffPageAccessResponse { modules: PageModuleGroup[]; }
export interface RolePageDefaultResponse { roleCode: string; pageCodes: string[]; }

// Permissions (Quyền chức năng tab)
export interface PermissionRow { code: string; name: string; granted: boolean; }
export interface PermissionGroupRow { code: string; name: string; permissions: PermissionRow[]; }
export interface StaffPermissionsResponse { groups: PermissionGroupRow[]; }
export interface RolePermissionDefaultResponse { roleCode: string; permissionCodes: string[]; }
