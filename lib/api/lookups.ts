"use client";

import { http } from "@/lib/http/client";
import type {
  AreaLookupItem,
  CategoryLookupItem,
  CounterLookupItem,
  DenominationLookupItem,
  KitchenStationLookupItem,
  ScheduleTemplateLookupItem,
  ShiftLookupItem,
} from "@/types/api/restaurant";

/** Read-only reference data — already implemented in backend. */
export const lookupsApi = {
  getCounters: () => http.get<CounterLookupItem[]>("/api/lookups/counters"),
  getKitchenStations: () =>
    http.get<KitchenStationLookupItem[]>("/api/lookups/kitchen-stations"),
  getShifts: () => http.get<ShiftLookupItem[]>("/api/lookups/shifts"),
  getDenominations: () =>
    http.get<DenominationLookupItem[]>("/api/lookups/denominations"),
  getAreas: () => http.get<AreaLookupItem[]>("/api/lookups/areas"),
  getCategories: () =>
    http.get<CategoryLookupItem[]>("/api/lookups/categories"),
  /** All templates (active + inactive). Active-only: scheduleApi.listTemplates(). */
  getScheduleTemplates: () =>
    http.get<ScheduleTemplateLookupItem[]>("/api/lookups/schedule-templates"),
};
