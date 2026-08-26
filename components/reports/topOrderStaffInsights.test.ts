import assert from "node:assert/strict";
import {
  buildTopOrderStaffInsight,
  itemInsightKey,
  nextSelectedInsightKey,
  selectTopOrderStaffInsights,
} from "./topOrderStaffInsights";
import type { TopOrderStaffByItemRow } from "@/types/api/reports";

const row = (
  itemId: number,
  itemCode: string,
  totalQuantity: number,
  staff: Array<[number, string, number, number]>,
): TopOrderStaffByItemRow => ({
  itemId,
  itemCode,
  itemName: itemCode === "MUC" ? "Mực chiên giòn" : "Chả giò rế",
  uomCode: "Đĩa",
  totalQuantity,
  topStaff: staff.map(([staffAccountId, staffName, quantity, percentage], index) => ({
    rank: index + 1,
    staffAccountId,
    staffName,
    quantity,
    percentageOfItemQuantity: percentage,
  })),
});

const concentrated = buildTopOrderStaffInsight(row(1, "MUC", 6, [
  [10, "An", 6, 100],
  [11, "Bình", 0, 0],
]));
assert.equal(concentrated.status, "HIGH_CONCENTRATION");
assert.deepEqual(concentrated.positiveStaff.map((x) => x.staffName), ["An"]);
assert.equal(concentrated.hasBackup, false);

assert.equal(
  buildTopOrderStaffInsight(row(2, "CHA", 4, [[10, "An", 3, 75], [11, "Bình", 1, 25]])).status,
  "LOW_SAMPLE",
);
assert.equal(
  buildTopOrderStaffInsight(row(3, "CHA", 5, [[10, "An", 4, 80], [11, "Bình", 1, 20]])).status,
  "HIGH_CONCENTRATION",
);
assert.equal(
  buildTopOrderStaffInsight(row(4, "CHA", 5, [[10, "An", 2, 49.99], [11, "Bình", 2, 40]])).status,
  "BROAD_DISTRIBUTION",
);

const refund = buildTopOrderStaffInsight(row(5, "CHA", 4, [
  [10, "An", 5, 125],
  [11, "Bình", -1, -25],
]));
assert.equal(refund.status, "REFUND_REVIEW");
assert.deepEqual(refund.negativeStaff.map((x) => x.staffName), ["Bình"]);
assert.equal(refund.hasBackup, false);

assert.notEqual(
  itemInsightKey(buildTopOrderStaffInsight(row(8, "A", 1, []))),
  itemInsightKey(buildTopOrderStaffInsight(row(8, "B", 1, []))),
);

const selected = selectTopOrderStaffInsights(
  [row(1, "MUC", 6, [[10, "An", 6, 100]]), row(2, "CHA", 4, [[11, "Bình", 4, 100]])],
  { query: "muc", sort: "QUANTITY_DESC", filter: "TRAINING" },
);
assert.deepEqual(selected.map((x) => x.item.itemCode), ["MUC"]);

const visible = [
  buildTopOrderStaffInsight(row(1, "MUC", 6, [[10, "An", 6, 100]])),
  buildTopOrderStaffInsight(row(2, "CHA", 4, [[11, "Bình", 4, 100]])),
];
assert.equal(nextSelectedInsightKey(visible, null), itemInsightKey(visible[0]));
assert.equal(nextSelectedInsightKey(visible, itemInsightKey(visible[1])), itemInsightKey(visible[1]));
assert.equal(nextSelectedInsightKey(visible.slice(0, 1), itemInsightKey(visible[1])), itemInsightKey(visible[0]));
assert.equal(nextSelectedInsightKey([], itemInsightKey(visible[0])), null);
