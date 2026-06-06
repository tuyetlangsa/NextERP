/**
 * Mirrors backend Domain `Rpom.Domain.Menu.PriceTable / PriceVariant / PriceEntry`
 * and `Rpom.Application.Price*` use case Response records.
 * See `docs/RPOM_Pricing_Spec.md` for the 3-layer pricing model.
 */

export interface PriceTable {
  id: number;
  code: string;
  name: string;
  description: string | null;
  beginDate: string | null;
  endDate: string | null;
  isActive: boolean;
  variantCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PriceVariant {
  id: number;
  priceTableId: number;
  code: string;
  name: string;
  description: string | null;
  /** "HH:mm:ss" inclusive. NULL = whole day. */
  beginTime: string | null;
  /** "HH:mm:ss" exclusive. NULL = whole day. */
  endTime: string | null;
  /** Bitmask Mon=1, Tue=2, ..., Sun=64. NULL = all days. */
  dayMask: number | null;
  appliesToAllAreas: boolean;
  areaIds: number[];
  specificity: number;
  isActive: boolean;
  entryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PriceEntry {
  id: number;
  priceVariantId: number;
  itemId: number;
  itemCode: string;
  itemName: string;
  price: number;
  isVatIncluded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PriceEntryUpsertResult {
  priceVariantId: number;
  inserted: number;
  updated: number;
  deleted: number;
  totalEntries: number;
}
