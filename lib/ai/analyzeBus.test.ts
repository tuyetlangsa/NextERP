import assert from "node:assert/strict";
import { buildReportAnalysisRequest } from "./analyzeBus";

// This fails if report analysis falls back to an inline JSON prompt instead of
// preserving the report data as structured API context.
const request = buildReportAnalysisRequest({
  reportType: "TOP_ORDER_STAFF_BY_ITEM",
  reportName: "Top nhân viên theo món",
  filters: { fromDate: "2026-08-01", toDate: "2026-08-26" },
  selectedItemId: 7,
  data: [{ itemId: 7, topStaff: [] }],
});

assert.equal(request.message, "Phân tích báo cáo Top nhân viên theo món");
assert.equal(request.reportContext?.reportType, "TOP_ORDER_STAFF_BY_ITEM");
assert.deepEqual(request.reportContext?.filters, { fromDate: "2026-08-01", toDate: "2026-08-26" });
assert.equal(request.reportContext?.selectedItemId, 7);
assert.deepEqual(request.reportContext?.data, [{ itemId: 7, topStaff: [] }]);
assert.equal(JSON.stringify(request).includes("DỮ LIỆU:"), false);

const unfilteredRequest = buildReportAnalysisRequest({
  reportType: "STOCK_ALERT",
  reportName: "Tồn kho",
  data: [],
});
assert.deepEqual(unfilteredRequest.reportContext?.filters, {});
assert.equal(Object.hasOwn(unfilteredRequest.reportContext ?? {}, "selectedItemId"), false);
