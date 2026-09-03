import assert from "node:assert/strict";
import { buildAnalysisMessage } from "../../lib/ai/analyzeBus";
import { toChatDisplayText } from "./chatDisplay";

const generated = buildAnalysisMessage("Doanh thu", {
  totalRevenue: 1_250_000,
  daily: [{ day: "2026-09-03", revenue: 1_250_000 }],
});

assert.equal(
  toChatDisplayText(generated),
  '📊 Phân tích báo cáo "Doanh thu"',
);

const ordinary = "Hóa đơn số 68 có phí phục vụ bao nhiêu?";
assert.equal(toChatDisplayText(ordinary), ordinary);

const pastedJson = '{"reportName":"Doanh thu","totalRevenue":1250000}';
assert.equal(toChatDisplayText(pastedJson), pastedJson);

const malformed = 'Đây là dữ liệu báo cáo "Doanh thu" của nhà hàng nhưng không có dữ liệu đính kèm.';
assert.equal(toChatDisplayText(malformed), malformed);
