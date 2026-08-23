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
assert.deepEqual(rows.map((row) => row.id), ["1-10", "1-11", "1-12", "2-14"]);
assert.equal(rows[1].percentageOfItemQuantity, -25);
assert.deepEqual(flattenTopOrderStaffRows([]), []);
