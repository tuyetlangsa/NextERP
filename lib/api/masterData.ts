"use client";

import { http } from "@/lib/http/client";
import type { ListQuery } from "@/lib/api/restaurant";
import type {
  CancellationReason,
  CancellationReasonUpsert,
  KitchenStation,
  KitchenStationUpsert,
  Shift,
  ShiftUpsert,
} from "@/types/api/masterData";

export const kitchenStationsApi = {
  list: (q: ListQuery = {}) =>
    http.get<KitchenStation[]>("/api/kitchen-stations", { params: q }),
  get: (id: number) => http.get<KitchenStation>(`/api/kitchen-stations/${id}`),
  create: (body: KitchenStationUpsert) =>
    http.post<KitchenStation>("/api/kitchen-stations", body),
  update: (id: number, body: KitchenStationUpsert) =>
    http.put<KitchenStation>(`/api/kitchen-stations/${id}`, body),
  remove: (id: number) => http.delete<null>(`/api/kitchen-stations/${id}`),
};

export const cancellationReasonsApi = {
  list: (q: ListQuery = {}) =>
    http.get<CancellationReason[]>("/api/cancellation-reasons", { params: q }),
  get: (id: number) =>
    http.get<CancellationReason>(`/api/cancellation-reasons/${id}`),
  create: (body: CancellationReasonUpsert) =>
    http.post<CancellationReason>("/api/cancellation-reasons", body),
  update: (id: number, body: CancellationReasonUpsert) =>
    http.put<CancellationReason>(`/api/cancellation-reasons/${id}`, body),
  remove: (id: number) =>
    http.delete<null>(`/api/cancellation-reasons/${id}`),
};

export const shiftsApi = {
  list: (q: ListQuery = {}) => http.get<Shift[]>("/api/shifts", { params: q }),
  get: (id: number) => http.get<Shift>(`/api/shifts/${id}`),
  create: (body: ShiftUpsert) => http.post<Shift>("/api/shifts", body),
  update: (id: number, body: ShiftUpsert) =>
    http.put<Shift>(`/api/shifts/${id}`, body),
  remove: (id: number) => http.delete<null>(`/api/shifts/${id}`),
};
