import type { TopOrderStaffByItemRow } from "@/types/api/reports";

export interface TopOrderStaffGridRow {
  id: string;
  itemId: number;
  itemCode: string;
  itemName: string;
  uomCode: string;
  totalQuantity: number;
  rank: number;
  staffAccountId: number;
  staffName: string;
  staffQuantity: number;
  percentageOfItemQuantity: number;
}

/** Expands the API's item-with-top-staff shape for a row-oriented data grid. */
export function flattenTopOrderStaffRows(
  items: readonly TopOrderStaffByItemRow[],
): TopOrderStaffGridRow[] {
  return items.flatMap((item) =>
    item.topStaff.slice(0, 3).map((staff) => ({
      id: JSON.stringify([
        item.itemId,
        item.itemCode,
        item.itemName,
        item.uomCode,
        staff.staffAccountId,
        staff.rank,
      ]),
      itemId: item.itemId,
      itemCode: item.itemCode,
      itemName: item.itemName,
      uomCode: item.uomCode,
      totalQuantity: item.totalQuantity,
      rank: staff.rank,
      staffAccountId: staff.staffAccountId,
      staffName: staff.staffName,
      staffQuantity: staff.quantity,
      percentageOfItemQuantity: staff.percentageOfItemQuantity,
    })),
  );
}
