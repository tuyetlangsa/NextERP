"use client";

import { http } from "@/lib/http/client";
import type {
  CounterLookupItem,
  DenominationLookupItem,
  KitchenStationLookupItem,
  ShiftLookupItem,
} from "@/types/api/restaurant";

/** Read-only reference data — already implemented in backend. */
export const lookupsApi = {
  getCounters: () => http.get<CounterLookupItem[]>("/api/lookups/counters"),
  getKitchenStations: () => http.get<KitchenStationLookupItem[]>("/api/lookups/kitchen-stations"),
  getShifts: () => http.get<ShiftLookupItem[]>("/api/lookups/shifts"),
  getDenominations: () => http.get<DenominationLookupItem[]>("/api/lookups/denominations"),
};
