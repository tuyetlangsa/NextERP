"use client";

import { http } from "@/lib/http/client";
import type { Page } from "@/types/api/menu";
import type {
  BomLine,
  BomLineUpdate,
  BomLineUpsert,
  ItemUomConversion,
  ItemUomConversionUpdate,
  ItemUomConversionUpsert,
  BomMaterialLookup,
  BomMaterialLookupQuery,
  StockableItemLookup,
  StockableItemLookupQuery,
  StockLevel,
  StockListQuery,
  StockMovement,
  StockMovementCreate,
  StockMovementListQuery,
} from "@/types/api/inventory";
import type { ListQuery } from "./restaurant";

export const itemUomConversionsApi = {
  list: (itemId: number, q: ListQuery = {}) =>
    http.get<ItemUomConversion[]>(`/api/items/${itemId}/uom-conversions`, { params: q }),
  get: (itemId: number, id: number) =>
    http.get<ItemUomConversion>(`/api/items/${itemId}/uom-conversions/${id}`),
  create: (itemId: number, body: ItemUomConversionUpsert) =>
    http.post<ItemUomConversion>(`/api/items/${itemId}/uom-conversions`, body),
  update: (itemId: number, id: number, body: ItemUomConversionUpdate) =>
    http.put<ItemUomConversion>(`/api/items/${itemId}/uom-conversions/${id}`, body),
  remove: (itemId: number, id: number) =>
    http.delete<null>(`/api/items/${itemId}/uom-conversions/${id}`),
};

export const bomLinesApi = {
  list: (itemId: number, q: ListQuery = {}) =>
    http.get<BomLine[]>(`/api/items/${itemId}/bom`, { params: q }),
  get: (itemId: number, id: number) =>
    http.get<BomLine>(`/api/items/${itemId}/bom/${id}`),
  create: (itemId: number, body: BomLineUpsert) =>
    http.post<BomLine>(`/api/items/${itemId}/bom`, body),
  update: (itemId: number, id: number, body: BomLineUpdate) =>
    http.put<BomLine>(`/api/items/${itemId}/bom/${id}`, body),
  remove: (itemId: number, id: number) =>
    http.delete<null>(`/api/items/${itemId}/bom/${id}`),
};

export const stockMovementsApi = {
  list: (q: StockMovementListQuery = {}) =>
    http.get<Page<StockMovement>>("/api/stock-movements", { params: q }),
  create: (body: StockMovementCreate) =>
    http.post<StockMovement>("/api/stock-movements", body),
};

export const stockApi = {
  list: (q: StockListQuery = {}) =>
    http.get<StockLevel[]>("/api/inventory/stock", { params: q }),
};

/**
 * Stockable-item picker source for the stock-in/out form. Server already filters
 * to IsStockable=true and attaches `currentQty`, so no client-side filtering or
 * full-catalogue paging is needed.
 */
export const stockableItemsLookupApi = {
  list: (q: StockableItemLookupQuery = {}) =>
    http.get<StockableItemLookup[]>("/api/lookups/stockable-items", { params: q }),
};

/**
 * Material picker source for the BOM form. Server returns IsStockable=true &&
 * HasRecipe=false items with their base Uom.
 */
export const bomMaterialsLookupApi = {
  list: (q: BomMaterialLookupQuery = {}) =>
    http.get<BomMaterialLookup[]>("/api/lookups/bom-materials", { params: q }),
};

