/**
 * Mirrors backend `src/Rpom.Application/Access/Login/Login.cs` Response record
 * (camelCase wire format).
 */

export interface LoginRequest {
  username: string;
  password: string;
}

export interface ShiftSessionSummary {
  id: number;
  staffAccountId: number;
  counterId?: number | null;
  kitchenStationId?: number | null;
  status: "OPEN" | "CLOSED";
  openedAt: string;
  closedAt?: string | null;
}

export interface LoginResponse {
  accessToken: string;
  expiresAt: string;
  staffAccountId: number;
  username: string;
  fullName: string;
  roleCode: string;
  shiftSession: ShiftSessionSummary | null;
}

export interface MeResponse {
  staffAccountId: number;
  username: string;
  fullName: string;
  roleCode: string;
  permissions: string[];
}
