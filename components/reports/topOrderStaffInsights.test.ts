import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TopOrderStaffDetail } from "./TopOrderStaffDetail";
import { TopOrderStaffItemList } from "./TopOrderStaffItemList";
import {
  buildTopOrderStaffInsight,
  buildTopOrderStaffBarRows,
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
assert.match(concentrated.message, /sản lượng.*tập trung cao/i);
assert.match(concentrated.message, /người thứ hai.*25%/i);
assert.doesNotMatch(concentrated.message, /năng lực|giỏi|yếu/i);

const backupBelowThreshold = buildTopOrderStaffInsight(row(20, "NO_BACKUP", 5, [
  [10, "An", 4, 80],
  [11, "Bình", 1, 24.99],
]));
const backupAtThreshold = buildTopOrderStaffInsight(row(21, "HAS_BACKUP", 5, [
  [10, "An", 4, 80],
  [11, "Bình", 1, 25],
]));
assert.equal(backupBelowThreshold.hasBackup, false);
assert.equal(backupAtThreshold.hasBackup, true);

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
assert.equal(
  buildTopOrderStaffInsight(row(5, "CHA", 5, [[10, "An", 2.5, 50], [11, "Bình", 2.5, 50]])).status,
  "MODERATE_DISTRIBUTION",
);

const zeroOnly = buildTopOrderStaffInsight(row(6, "ZERO", 5, [
  [10, "An", 0, 0],
  [11, "Bình", 0, 0],
]));
assert.equal(zeroOnly.status, "NO_POSITIVE_QUANTITY");
assert.deepEqual(zeroOnly.positiveStaff, []);
assert.equal(zeroOnly.hasBackup, false);

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

const snapshotIdentityBase = row(8, "A", 1, []);
const snapshotIdentityKeys = [
  snapshotIdentityBase,
  { ...snapshotIdentityBase, itemName: "Món cùng mã, tên khác" },
  { ...snapshotIdentityBase, uomCode: "Phần" },
].map((item) => itemInsightKey(buildTopOrderStaffInsight(item)));
assert.equal(
  new Set(snapshotIdentityKeys).size,
  3,
  "snapshot identity must distinguish item name and unit changes",
);

const selected = selectTopOrderStaffInsights(
  [row(1, "MUC", 6, [[10, "An", 6, 100]]), row(2, "CHA", 4, [[11, "Bình", 4, 100]])],
  { query: "muc", sort: "QUANTITY_DESC", filter: "TRAINING" },
);
assert.deepEqual(selected.map((x) => x.item.itemCode), ["MUC"]);

const trainingSelection = selectTopOrderStaffInsights(
  [backupBelowThreshold.item, backupAtThreshold.item, zeroOnly.item],
  { query: "", sort: "NAME_ASC", filter: "TRAINING" },
);
assert.deepEqual(trainingSelection.map((x) => x.item.itemCode), ["NO_BACKUP"]);

const visible = [
  buildTopOrderStaffInsight(row(1, "MUC", 6, [[10, "An", 6, 100]])),
  buildTopOrderStaffInsight(row(2, "CHA", 4, [[11, "Bình", 4, 100]])),
];
assert.equal(nextSelectedInsightKey(visible, null), itemInsightKey(visible[0]));
assert.equal(nextSelectedInsightKey(visible, itemInsightKey(visible[1])), itemInsightKey(visible[1]));
assert.equal(nextSelectedInsightKey(visible.slice(0, 1), itemInsightKey(visible[1])), itemInsightKey(visible[0]));
assert.equal(nextSelectedInsightKey([], itemInsightKey(visible[0])), null);

const bars = buildTopOrderStaffBarRows(buildTopOrderStaffInsight(row(1, "CHA", 4, [
  [10, "An", 3, 75],
  [11, "Bình", 1, 25],
  [12, "Chi", 0, 0],
])));
assert.deepEqual(bars.map((x) => [x.staffName, x.quantity, x.percentage, x.widthPercent]), [
  ["An", 3, 75, 100],
  ["Bình", 1, 25, 33.33],
]);

const unsortedBars = buildTopOrderStaffBarRows(buildTopOrderStaffInsight(row(1, "CHA", 4, [
  [10, "An", 1, 25],
  [11, "Bình", 3, 75],
])));
assert.deepEqual(unsortedBars.map((x) => x.widthPercent), [33.33, 100]);

const detailMarkup = renderToStaticMarkup(createElement(TopOrderStaffDetail, { insight: visible[0] }));
assert.match(detailMarkup, /aria-label="Biểu đồ[^\"]*An[^\"]*6\.00[^\"]*100\.0%/);

const itemListMarkup = renderToStaticMarkup(
  createElement(TopOrderStaffItemList, {
    items: visible,
    selectedKey: itemInsightKey(visible[0]),
    query: "",
    sort: "QUANTITY_DESC",
    filter: "ALL",
    onQueryChange: () => {},
    onSortChange: () => {},
    onFilterChange: () => {},
    onSelect: () => {},
  }),
);
assert.match(itemListMarkup, /<button[^>]*aria-pressed="true"/);
assert.match(itemListMarkup, /role="group" aria-label="Lọc món"/);
assert.match(itemListMarkup, />Gợi ý đào tạo chéo<\/button>/);
assert.doesNotMatch(itemListMarkup, /role="listitem"/);
assert.doesNotMatch(itemListMarkup, /role="list"/);

const emptyItemListMarkup = renderToStaticMarkup(
  createElement(TopOrderStaffItemList, {
    items: [],
    selectedKey: null,
    query: "không khớp",
    sort: "QUANTITY_DESC",
    filter: "TRAINING",
    onQueryChange: () => {},
    onSortChange: () => {},
    onFilterChange: () => {},
    onSelect: () => {},
  }),
);
assert.match(emptyItemListMarkup, /aria-label="Tìm món"/);
assert.match(emptyItemListMarkup, /role="group" aria-label="Lọc món"/);

const emptyDetailMarkup = renderToStaticMarkup(createElement(TopOrderStaffDetail, { insight: null }));
assert.match(emptyDetailMarkup, /Không có món phù hợp/);
