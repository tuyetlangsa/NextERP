import type { ItemUomConversion, StockMovementType } from "@/types/api/inventory";

export const MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  STOCK_IN: "Nhập kho",
  ADJUST_IN: "Điều chỉnh tăng",
  ADJUST_OUT: "Hao hụt / hư hỏng",
  DEDUCT: "Trừ kho (StartCook)",
};

/** Background tint per movement type (append-only ledger row styling). */
export const MOVEMENT_TYPE_COLORS: Record<StockMovementType, string> = {
  STOCK_IN: "#dcfce7",
  ADJUST_IN: "#ecfdf5",
  ADJUST_OUT: "#ffedd5",
  DEDUCT: "#fee2e2",
};

export const MANUAL_MOVEMENT_TYPES = ["STOCK_IN", "ADJUST_IN", "ADJUST_OUT"] as const;

export type ManualMovementType = (typeof MANUAL_MOVEMENT_TYPES)[number];

/** Strip trailing zeros so 12.000000 reads as "12". */
export function formatMovementQty(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  return parseFloat(n.toFixed(8)).toString();
}

export function conversionFactor(
  uomId: number,
  baseUomId: number,
  conversions: Pick<ItemUomConversion, "uomId" | "factorToBase">[]
): number | null {
  if (uomId === baseUomId) return 1;
  const conv = conversions.find(c => c.uomId === uomId);
  return conv ? conv.factorToBase : null;
}

/** qty (in uomId) → unsigned base qty before movement sign is applied. */
export function toBaseQty(
  quantity: number,
  uomId: number,
  baseUomId: number,
  conversions: Pick<ItemUomConversion, "uomId" | "factorToBase">[]
): number | null {
  const factor = conversionFactor(uomId, baseUomId, conversions);
  if (factor == null) return null;
  return quantity * factor;
}

/** Signed qtyInBase for a manual movement type. */
export function signedBaseQty(
  quantity: number,
  uomId: number,
  baseUomId: number,
  movementType: ManualMovementType,
  conversions: Pick<ItemUomConversion, "uomId" | "factorToBase">[]
): number | null {
  const base = toBaseQty(quantity, uomId, baseUomId, conversions);
  if (base == null) return null;
  return movementType === "ADJUST_OUT" ? -base : base;
}

/** Try to recover input-side qty/uom embedded in server reason text. */
export function parseConversionFromReason(reason: string | null): {
  inputQty?: number;
  inputUom?: string;
  baseQty?: number;
  baseUom?: string;
} | null {
  if (!reason) return null;
  const head = reason.match(/^([\d.,]+)\s+(\S+)\s*=\s*([\d.,]+)\s+(\S+)/);
  if (head) {
    return {
      inputQty: parseFloat(head[1].replace(",", "")),
      inputUom: head[2],
      baseQty: parseFloat(head[3].replace(",", "")),
      baseUom: head[4],
    };
  }
  const bracket = reason.match(/Nhập\s+([\d.,]+)\s*\(uom\s+#\d+\)\s*=\s*([\d.,]+)\s*base/i);
  if (bracket) {
    return {
      inputQty: parseFloat(bracket[1].replace(",", "")),
      baseQty: parseFloat(bracket[2].replace(",", "")),
    };
  }
  return null;
}
