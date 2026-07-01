// lib/api/reports.ts
"use client";

import { http } from "@/lib/http/client";
import type {
  RevenueResponse, DetailedRevenueResponse, ItemSalesDetailResponse,
  CategoryReportRow, ItemReportRow, TopSellerRow,
  ShiftReportRow, IngredientConsumptionRow, StockAlertRow,
  ReportFilter,
} from "@/types/api/reports";

function qs(params: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

export const reportsApi = {
  revenue: (filter: ReportFilter & { groupBy?: string }) =>
    http.get<RevenueResponse>("/api/reports/revenue", { params: qs(filter) }),

  revenueDetail: (filter: ReportFilter & { pageNumber?: number; pageSize?: number }) =>
    http.get<DetailedRevenueResponse>("/api/reports/revenue/detail", { params: qs(filter) }),

  itemSalesDetail: (filter: ReportFilter & { ticketId?: number; pageNumber?: number; pageSize?: number }) =>
    http.get<ItemSalesDetailResponse>("/api/reports/items/detail", { params: qs(filter) }),

  categories: (filter: ReportFilter) =>
    http.get<CategoryReportRow[]>("/api/reports/categories", { params: qs(filter) }),

  items: (filter: ReportFilter) =>
    http.get<ItemReportRow[]>("/api/reports/items", { params: qs(filter) }),

  topSellers: (filter: ReportFilter & { topN?: number; by?: string }) =>
    http.get<TopSellerRow[]>("/api/reports/top-sellers", { params: qs(filter) }),

  shift: (filter: ReportFilter) =>
    http.get<ShiftReportRow[]>("/api/reports/shift", { params: qs(filter) }),

  ingredientConsumption: (filter: ReportFilter & { itemId?: number }) =>
    http.get<IngredientConsumptionRow[]>("/api/reports/ingredient-consumption", { params: qs(filter) }),

  stockAlert: (params: { search?: string; lowStock?: boolean }) =>
    http.get<StockAlertRow[]>("/api/reports/stock-alert", { params: qs(params) }),

  exportReport: (reportType: string, format: "pdf" | "excel", filter: Record<string, unknown>) =>
    http.get<Blob>(`/api/reports/${reportType}/export`, {
      params: qs({ ...filter, format }),
    }),
};
