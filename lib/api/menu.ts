"use client";

import { http } from "@/lib/http/client";
import type { Uom } from "@/types/api/menu";
import type { ListQuery } from "./restaurant";

export interface UomUpsert {
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

export const uomsApi = {
  list: (q: ListQuery = {}) => http.get<Uom[]>("/api/uoms", { params: q }),
  get: (id: number) => http.get<Uom>(`/api/uoms/${id}`),
  create: (body: UomUpsert) => http.post<Uom>("/api/uoms", body),
  update: (id: number, body: UomUpsert) => http.put<Uom>(`/api/uoms/${id}`, body),
  remove: (id: number) => http.delete<null>(`/api/uoms/${id}`),
};
