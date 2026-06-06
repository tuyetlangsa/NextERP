/**
 * Mirrors backend `Rpom.Application.Uoms.UomItem` (matches Domain `Uom` shape).
 * Code is the business identifier; case-insensitive unique.
 */
export interface Uom {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: number;
  code: string;
  name: string;
  description: string | null;
  parentId: number | null;
  path: string;
  level: number;
  displayOrder: number;
  isActive: boolean;
  itemCount: number;
  childCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Page<T> {
  items: T[];
  pageNumber: number | null;
  totalPages: number | null;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface ItemListRow {
  id: number;
  code: string;
  name: string;
  imageUrl: string | null;
  baseUomCode: string;
  vatPercent: number;
  isStockable: boolean;
  hasRecipe: boolean;
  isActive: boolean;
  categoryNames: string[];
  primaryCategoryId: number | null;
  primaryCategoryName: string | null;
}

export interface ItemCategoryAssignment {
  categoryId: number;
  name: string;
  isMain: boolean;
}

export interface ItemDetail {
  id: number;
  code: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  baseUomId: number;
  baseUomCode: string;
  baseUomName: string;
  vatPercent: number;
  isStockable: boolean;
  hasRecipe: boolean;
  lowStockThreshold: number | null;
  kitchenStationId: number | null;
  kitchenStationName: string | null;
  isActive: boolean;
  categories: ItemCategoryAssignment[];
  createdAt: string;
  updatedAt: string;
}
