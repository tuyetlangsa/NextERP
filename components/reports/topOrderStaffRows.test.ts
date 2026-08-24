import assert from "node:assert/strict";
import { flattenTopOrderStaffRows } from "./topOrderStaffRows";

const sample = [
  {
    itemId: 1,
    itemCode: "CF01",
    itemName: "Cà phê",
    uomCode: "Ly",
    totalQuantity: 4,
    topStaff: [
      { rank: 1, staffAccountId: 10, staffName: "An", quantity: 5, percentageOfItemQuantity: 125 },
      { rank: 2, staffAccountId: 11, staffName: "Bình", quantity: -1, percentageOfItemQuantity: -25 },
      { rank: 3, staffAccountId: 12, staffName: "Chi", quantity: 0.5, percentageOfItemQuantity: 12.5 },
      { rank: 4, staffAccountId: 13, staffName: "Dũng", quantity: 1, percentageOfItemQuantity: 25 },
    ],
  },
  {
    itemId: 2,
    itemCode: "TEA01",
    itemName: "Trà",
    uomCode: "Ly",
    totalQuantity: 3,
    topStaff: [
      { rank: 1, staffAccountId: 14, staffName: "Em", quantity: 3, percentageOfItemQuantity: 100 },
    ],
  },
];

const rows = flattenTopOrderStaffRows(sample);

assert.deepEqual(
  rows.map((row) => [row.itemCode, row.rank, row.staffQuantity]),
  [["CF01", 1, 5], ["CF01", 2, -1], ["CF01", 3, 0.5], ["TEA01", 1, 3]],
);
assert.deepEqual(rows.map((row) => row.id), [
  JSON.stringify([1, "CF01", "Cà phê", "Ly", 10, 1]),
  JSON.stringify([1, "CF01", "Cà phê", "Ly", 11, 2]),
  JSON.stringify([1, "CF01", "Cà phê", "Ly", 12, 3]),
  JSON.stringify([2, "TEA01", "Trà", "Ly", 14, 1]),
]);
assert.equal(rows[1].percentageOfItemQuantity, -25);
assert.deepEqual(flattenTopOrderStaffRows([]), []);

const snapshotRows = flattenTopOrderStaffRows([
  {
    itemId: 1,
    itemCode: "CF01",
    itemName: "Cà phê",
    uomCode: "Ly",
    totalQuantity: 5,
    topStaff: [{ rank: 1, staffAccountId: 10, staffName: "An", quantity: 5, percentageOfItemQuantity: 100 }],
  },
  {
    itemId: 1,
    itemCode: "CF01-REFUND",
    itemName: "Cà phê hoàn món",
    uomCode: "Cốc",
    totalQuantity: -1,
    topStaff: [{ rank: 1, staffAccountId: 10, staffName: "An", quantity: -1, percentageOfItemQuantity: 100 }],
  },
]);

assert.deepEqual(snapshotRows.map((row) => row.itemCode), ["CF01", "CF01-REFUND"]);
assert.deepEqual(snapshotRows.map((row) => row.id), [
  JSON.stringify([1, "CF01", "Cà phê", "Ly", 10, 1]),
  JSON.stringify([1, "CF01-REFUND", "Cà phê hoàn món", "Cốc", 10, 1]),
]);
