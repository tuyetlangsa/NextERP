"use client";

import { http } from "@/lib/http/client";
import type { Area, Counter, RestaurantTable } from "@/types/api/restaurant";

/**
 * Master-data CRUD for Restaurant aggregate (Counter / Area / Table).
 *
 * NOTE: backend CRUD endpoints for these entities are not yet implemented
 * (only read-only `/api/lookups/counters` exists today). Routes below match
 * the planned REST conventions and will work once endpoints land. Until then,
 * UI consumers should use the mock provider in `data/mock.ts`.
 */

export interface ListQuery {
  search?: string;
  isActive?: boolean;
  pageIndex?: number;
  pageSize?: number;
}

export interface CounterUpsert {
  name: string;
  note?: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface AreaUpsert {
  counterId: number;
  name: string;
  description?: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface TableUpsert {
  areaId: number;
  code: string;
  seatCount: number;
  description?: string | null;
  isActive: boolean;
}

export const countersApi = {
  list: (q: ListQuery = {}) => http.get<Counter[]>("/api/counters", { params: q }),
  get: (id: number) => http.get<Counter>(`/api/counters/${id}`),
  create: (body: CounterUpsert) => http.post<Counter, CounterUpsert>("/api/counters", body),
  update: (id: number, body: CounterUpsert) => http.put<Counter, CounterUpsert>(`/api/counters/${id}`, body),
  remove: (id: number) => http.delete<void>(`/api/counters/${id}`),
};

export const areasApi = {
  list: (q: ListQuery & { counterId?: number } = {}) => http.get<Area[]>("/api/areas", { params: q }),
  get: (id: number) => http.get<Area>(`/api/areas/${id}`),
  create: (body: AreaUpsert) => http.post<Area, AreaUpsert>("/api/areas", body),
  update: (id: number, body: AreaUpsert) => http.put<Area, AreaUpsert>(`/api/areas/${id}`, body),
  remove: (id: number) => http.delete<void>(`/api/areas/${id}`),
};

export const tablesApi = {
  list: (q: ListQuery & { areaId?: number; counterId?: number } = {}) =>
    http.get<RestaurantTable[]>("/api/tables", { params: q }),
  get: (id: number) => http.get<RestaurantTable>(`/api/tables/${id}`),
  create: (body: TableUpsert) => http.post<RestaurantTable, TableUpsert>("/api/tables", body),
  update: (id: number, body: TableUpsert) => http.put<RestaurantTable, TableUpsert>(`/api/tables/${id}`, body),
  remove: (id: number) => http.delete<void>(`/api/tables/${id}`),
};
