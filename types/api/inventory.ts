/** ItemUomConversion — nested under /api/items/{itemId}/uom-conversions */

export interface ItemUomConversion {
  id: number;
  itemId: number;
  uomId: number;
  uomCode: string;
  uomName: string;
  factorToBase: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ItemUomConversionUpsert {
  uomId: number;
  factorToBase: number;
  isActive: boolean;
}

export interface ItemUomConversionUpdate {
  factorToBase: number;
  isActive: boolean;
}

/** BomLine — nested under /api/items/{itemId}/bom */

export interface BomLine {
  id: number;
  sellableItemId: number;
  materialItemId: number;
  materialItemCode: string;
  materialItemName: string;
  quantity: number;
  uomId: number;
  uomCode: string;
  uomName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BomLineUpsert {
  materialItemId: number;
  quantity: number;
  uomId: number;
  isActive: boolean;
}

export interface BomLineUpdate {
  quantity: number;
  isActive: boolean;
}

/** StockMovement — append-only ledger */

export type StockMovementType =
  | "STOCK_IN"
  | "ADJUST_IN"
  | "ADJUST_OUT"
  | "DEDUCT";

export interface StockMovement {
  id: number;
  itemId: number;
  itemCode?: string;
  itemName?: string;
  movementType: StockMovementType;
  /** Raw qty the user typed (in `uomId`); present on POST response only. */
  inputQty?: number;
  /** Uom the user entered the movement in. */
  uomId?: number;
  uomCode?: string;
  uomName?: string;
  baseUomCode?: string;
  baseUomName?: string;
  qtyInBase: number;
  balanceAfter: number;
  referenceType?: string | null;
  referenceId?: number | null;
  reason: string | null;
  createdByStaffId?: number | null;
  createdByStaffName?: string | null;
  createdAt: string;
}

export interface StockMovementCreate {
  itemId: number;
  movementType: Exclude<StockMovementType, "DEDUCT">;
  quantity: number;
  /** Uom the quantity is entered in — base Uom or an active conversion of the item. */
  uomId: number;
  reason?: string | null;
}

export interface StockMovementListQuery {
  itemId?: number;
  movementType?: StockMovementType;
  from?: string;
  to?: string;
  pageNumber?: number;
  pageSize?: number;
}

/** Stock dashboard row — GET /api/inventory/stock */

export interface StockLevel {
  itemId: number;
  itemCode: string;
  itemName: string;
  baseUomCode: string;
  baseUomName: string;
  currentQty: number;
  reservedQty: number;
  lowStockThreshold: number | null;
  lastMovementAt: string | null;
  updatedAt: string;
}

export interface StockListQuery {
  search?: string;
  lowStock?: boolean;
}

/**
 * Stockable-item lookup — GET /api/lookups/stockable-items?search=&lowStock=
 *
 * Returns every item with IsStockable=true (including those at qty 0), already
 * filtered server-side, with the current balance attached. This is the correct
 * source for the stock-in/out item picker — unlike `/api/items`, which has no
 * isStockable filter and would require fetching+filtering the whole catalogue.
 */
export interface StockableItemLookup {
  itemId: number;
  code: string;
  name: string;
  baseUomId: number;
  baseUomCode: string;
  baseUomName: string;
  currentQty: number;
  lowStockThreshold: number | null;
  lastMovementAt: string | null;
}

export interface StockableItemLookupQuery {
  search?: string;
  lowStock?: boolean;
}

/**
 * BOM material lookup — GET /api/lookups/bom-materials?search=
 *
 * Returns items that may be used as a recipe ingredient (IsStockable=true &&
 * HasRecipe=false), already filtered server-side, with the base Uom attached so
 * the form can default the quantity unit.
 */
export interface BomMaterialLookup {
  itemId: number;
  code: string;
  name: string;
  baseUomId: number;
  baseUomCode: string;
  baseUomName: string;
}

export interface BomMaterialLookupQuery {
  search?: string;
}
