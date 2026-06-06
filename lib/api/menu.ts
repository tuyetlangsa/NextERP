"use client";

import { http } from "@/lib/http/client";
import type { Category, ItemDetail, ItemListRow, Page, Uom } from "@/types/api/menu";
import type { ListQuery } from "./restaurant";

export interface UomUpsert {
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

export interface CategoryUpsert {
  code: string;
  name: string;
  description?: string | null;
  parentId?: number | null;
  displayOrder: number;
  isActive: boolean;
}

export interface ItemCategoryInput {
  categoryId: number;
  isMain: boolean;
}

export interface ItemUpsert {
  code: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  baseUomId: number;
  vatPercent: number;
  isStockable: boolean;
  hasRecipe: boolean;
  lowStockThreshold?: number | null;
  kitchenStationId?: number | null;
  isActive: boolean;
  categories: ItemCategoryInput[];
}

export const uomsApi = {
  list: (q: ListQuery = {}) => http.get<Uom[]>("/api/uoms", { params: q }),
  get: (id: number) => http.get<Uom>(`/api/uoms/${id}`),
  create: (body: UomUpsert) => http.post<Uom>("/api/uoms", body),
  update: (id: number, body: UomUpsert) => http.put<Uom>(`/api/uoms/${id}`, body),
  remove: (id: number) => http.delete<null>(`/api/uoms/${id}`),
};

export const categoriesApi = {
  list: (q: ListQuery = {}) => http.get<Category[]>("/api/categories", { params: q }),
  get: (id: number) => http.get<Category>(`/api/categories/${id}`),
  create: (body: CategoryUpsert) => http.post<Category>("/api/categories", body),
  update: (id: number, body: CategoryUpsert) => http.put<Category>(`/api/categories/${id}`, body),
  remove: (id: number) => http.delete<null>(`/api/categories/${id}`),
};

export interface ItemListQuery extends ListQuery {
  categoryId?: number;
  pageNumber?: number;
  pageSize?: number;
}

export const itemsApi = {
  list: (q: ItemListQuery = {}) => http.get<Page<ItemListRow>>("/api/items", { params: q }),
  get: (id: number) => http.get<ItemDetail>(`/api/items/${id}`),
  create: (body: ItemUpsert) => http.post<ItemDetail>("/api/items", body),
  update: (id: number, body: ItemUpsert) => http.put<ItemDetail>(`/api/items/${id}`, body),
  remove: (id: number) => http.delete<null>(`/api/items/${id}`),
};
