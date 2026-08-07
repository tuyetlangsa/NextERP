"use client";

import { http } from "@/lib/http/client";
import type { CustomerDisplay, CustomerDisplayRegisterResult } from "@/types/api/customerDisplay";

export interface CustomerDisplayListQuery {
  search?: string;
  isActive?: boolean;
}

export interface CustomerDisplayCreate {
  posTerminalId: number;
  name: string;
  idleMediaUrl?: string | null;
}

export interface CustomerDisplayUpdate {
  name: string;
  idleMediaUrl?: string | null;
}

export const customerDisplaysApi = {
  list: (q: CustomerDisplayListQuery = {}) =>
    http.get<CustomerDisplay[]>("/api/customer-displays", { params: q }),
  get: (id: number) => http.get<CustomerDisplay>(`/api/customer-displays/${id}`),
  create: (body: CustomerDisplayCreate) =>
    http.post<CustomerDisplayRegisterResult>("/api/customer-displays", body),
  update: (id: number, body: CustomerDisplayUpdate) =>
    http.put<{ id: number; name: string; idleMediaUrl: string | null }>(
      `/api/customer-displays/${id}`,
      body
    ),
  inactivate: (id: number) =>
    http.post<{ id: number; isActive: boolean }>(`/api/customer-displays/${id}/inactivate`),
};
