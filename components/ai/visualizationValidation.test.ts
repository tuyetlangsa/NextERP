import assert from "node:assert/strict";
import { isRenderableVisualization } from "./visualizationValidation";

assert.equal(isRenderableVisualization({ kind: "chart", title: "broken" }), false);
assert.equal(isRenderableVisualization({
  kind: "chart",
  title: "valid",
  chartType: "bar",
  xField: "name",
  series: [{ name: "Doanh thu", field: "revenue" }],
  data: [{ name: "Phở", revenue: 100_000 }],
}), true);
assert.equal(isRenderableVisualization({
  kind: "chart",
  title: "wrong fields",
  chartType: "bar",
  xField: "name",
  series: [{ name: "Doanh thu", field: "revenue" }],
  data: [{ itemName: "Phở", total: 100_000 }],
}), false);
assert.equal(isRenderableVisualization({
  kind: "table",
  title: "empty",
  columns: [{ field: "name", header: "Món" }],
  data: [],
}), false);
assert.equal(isRenderableVisualization({
  kind: "kpi",
  title: "valid KPI",
  metrics: [{ label: "Doanh thu", value: "100.000", unit: "đ" }],
}), true);
