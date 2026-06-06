"use client";

import { http } from "@/lib/http/client";
import type {
  PriceEntry,
  PriceEntryUpsertResult,
  PriceTable,
  PriceVariant,
} from "@/types/api/pricing";
import type { ListQuery } from "./restaurant";

export interface PriceTableUpsert {
  code: string;
  name: string;
  description?: string | null;
  beginDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
}

export interface PriceVariantUpsert {
  code: string;
  name: string;
  description?: string | null;
  /** "HH:mm:ss" or null = whole day. Must pair with endTime. */
  beginTime?: string | null;
  endTime?: string | null;
  /** 1..127 bitmask or null = all days. */
  dayMask?: number | null;
  appliesToAllAreas: boolean;
  areaIds: number[];
  isActive: boolean;
}

export interface PriceEntryInput {
  itemId: number;
  price: number;
  isVatIncluded: boolean;
}

export interface PriceTableListQuery extends ListQuery {
  beginDateFrom?: string;
  beginDateTo?: string;
}

export const priceTablesApi = {
  list: (q: PriceTableListQuery = {}) => http.get<PriceTable[]>("/api/price-tables", { params: q }),
  get: (id: number) => http.get<PriceTable>(`/api/price-tables/${id}`),
  create: (body: PriceTableUpsert) => http.post<PriceTable>("/api/price-tables", body),
  update: (id: number, body: PriceTableUpsert) => http.put<PriceTable>(`/api/price-tables/${id}`, body),
  remove: (id: number) => http.delete<null>(`/api/price-tables/${id}`),
};

export const priceVariantsApi = {
  listByTable: (priceTableId: number) =>
    http.get<PriceVariant[]>(`/api/price-tables/${priceTableId}/variants`),
  get: (id: number) => http.get<PriceVariant>(`/api/price-variants/${id}`),
  create: (priceTableId: number, body: PriceVariantUpsert) =>
    http.post<PriceVariant>(`/api/price-tables/${priceTableId}/variants`, body),
  update: (id: number, body: PriceVariantUpsert) =>
    http.put<PriceVariant>(`/api/price-variants/${id}`, body),
  remove: (id: number) => http.delete<null>(`/api/price-variants/${id}`),
};

export const priceEntriesApi = {
  list: (priceVariantId: number) =>
    http.get<PriceEntry[]>(`/api/price-variants/${priceVariantId}/entries`),
  upsert: (priceVariantId: number, entries: PriceEntryInput[]) =>
    http.put<PriceEntryUpsertResult>(`/api/price-variants/${priceVariantId}/entries`, { entries }),
};
