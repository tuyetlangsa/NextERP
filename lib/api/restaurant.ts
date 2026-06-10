"use client";

import { http } from "@/lib/http/client";
import type {
  Area,
  AreaMenuCategoriesReplaceRequest,
  AreaMenuCategoriesReplaceResult,
  AreaMenuCategoriesResponse,
  Counter,
  RestaurantTable,
} from "@/types/api/restaurant";

export interface ListQuery {
  search?: string;
  isActive?: boolean;
  /** Optional canonical Category root code (eg "HANG_BAN"). Only used by categoriesApi. */
  rootCode?: string;
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

export interface TableBatchCreate {
  areaId: number;
  codePrefix: string;
  startNumber: number;
  count: number;
  seatCount: number;
  description?: string | null;
  isActive: boolean;
}

export interface TableBatchResult {
  createdCount: number;
  createdIds: number[];
}

export const countersApi = {
  list: (q: ListQuery = {}) => http.get<Counter[]>("/api/counters", { params: q }),
  get: (id: number) => http.get<Counter>(`/api/counters/${id}`),
  create: (body: CounterUpsert) => http.post<Counter>("/api/counters", body),
  update: (id: number, body: CounterUpsert) => http.put<Counter>(`/api/counters/${id}`, body),
  remove: (id: number) => http.delete<null>(`/api/counters/${id}`),
};

export const areasApi = {
  list: (q: ListQuery & { counterId?: number } = {}) =>
    http.get<Area[]>("/api/areas", { params: q }),
  get: (id: number) => http.get<Area>(`/api/areas/${id}`),
  create: (body: AreaUpsert) => http.post<Area>("/api/areas", body),
  update: (id: number, body: AreaUpsert) => http.put<Area>(`/api/areas/${id}`, body),
  remove: (id: number) => http.delete<null>(`/api/areas/${id}`),
};

export const areaMenuCategoriesApi = {
  get: (areaId: number) =>
    http.get<AreaMenuCategoriesResponse>(`/api/areas/${areaId}/menu-categories`),
  replace: (areaId: number, body: AreaMenuCategoriesReplaceRequest) =>
    http.put<AreaMenuCategoriesReplaceResult>(`/api/areas/${areaId}/menu-categories`, body),
};

export const tablesApi = {
  list: (q: ListQuery & { areaId?: number; counterId?: number } = {}) =>
    http.get<RestaurantTable[]>("/api/tables", { params: q }),
  get: (id: number) => http.get<RestaurantTable>(`/api/tables/${id}`),
  create: (body: TableUpsert) => http.post<RestaurantTable>("/api/tables", body),
  update: (id: number, body: TableUpsert) => http.put<RestaurantTable>(`/api/tables/${id}`, body),
  batchCreate: (body: TableBatchCreate) => http.post<TableBatchResult>("/api/tables/batch", body),
  remove: (id: number) => http.delete<null>(`/api/tables/${id}`),
};
