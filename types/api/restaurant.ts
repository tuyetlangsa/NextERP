/**
 * Mirrors backend Domain entities under `src/Rpom.Domain/Restaurant/` —
 * Counter, Area, Table. CRUD endpoints are not yet implemented; these types
 * fix the contract so mocks can be swapped 1:1 once endpoints exist.
 */

export interface Counter {
  id: number;
  name: string;
  note: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Area {
  id: number;
  counterId: number;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  /** VIP/khu ưu tiên — món ở khu này được cộng trọng số ATC (gợi ý nấu). */
  isVip: boolean;
  createdAt: string;
  updatedAt: string;
}

/** GET /api/areas/service-charges — one row per area for the SC-per-area window. */
export interface AreaServiceCharge {
  areaId: number;
  areaName: string;
  counterId: number;
  counterName: string;
  displayOrder: number;
  isActive: boolean;
  serviceChargePercent: number;
  serviceChargeVatPercent: number;
}

export type TableStatus = "AVAILABLE" | "OCCUPIED";

export interface RestaurantTable {
  id: number;
  areaId: number;
  code: string;
  seatCount: number;
  description: string | null;
  status: TableStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** GET /api/areas/{areaId}/menu-categories — direct assignments only (no subtree expansion). */
export interface AreaMenuCategoryItem {
  categoryId: number;
  code: string;
  name: string;
  path: string;
  level: number;
}

export interface AreaMenuCategoriesResponse {
  areaId: number;
  categories: AreaMenuCategoryItem[];
}

export interface AreaMenuCategoriesReplaceRequest {
  categoryIds: number[];
}

export interface AreaMenuCategoriesReplaceResult {
  areaId: number;
  inserted: number;
  deleted: number;
  total: number;
}

/* Lookup item shapes (BE already implements these) — see
   `src/Rpom.Application/Lookups/`. */

export interface CounterLookupItem {
  id: number;
  name: string;
  displayOrder: number;
}

export interface AreaLookupItem {
  id: number;
  name: string;
  counterId: number;
  displayOrder: number;
}

export interface CategoryLookupItem {
  id: number;
  name: string;
  parentId: number | null;
  displayOrder: number;
}

export interface KitchenStationLookupItem {
  id: number;
  code: string;
  name: string;
}

export interface ShiftLookupItem {
  id: number;
  code: string;
  name: string;
  beginTime: string;
  endTime: string;
  isNextDay: boolean;
}

/** GET /api/lookups/schedule-templates — active + inactive (management UI). */
export interface ScheduleTemplateLookupItem {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  lineCount: number;
}

export interface DenominationLookupItem {
  id: number;
  faceValue: number;
  name: string;
  displayOrder: number;
}
