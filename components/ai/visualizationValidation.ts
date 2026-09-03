import type { ChatVisualization } from "@/types/api/ai";

const CHART_TYPES = new Set(["line", "bar", "pie", "area"]);

const present = (value: string | undefined): boolean => Boolean(value?.trim());

const hasFields = (data: Record<string, unknown>[], fields: string[]): boolean =>
  data.every((row) => fields.every((field) => Object.prototype.hasOwnProperty.call(row, field)));

export function isRenderableVisualization(viz: ChatVisualization): boolean {
  if (viz.kind === "chart") {
    return Boolean(
      viz.chartType &&
      CHART_TYPES.has(viz.chartType) &&
      present(viz.xField) &&
      viz.series?.length &&
      viz.series.every((series) => present(series.name) && present(series.field)) &&
      viz.data?.length &&
      hasFields(viz.data, [viz.xField!, ...viz.series.map((series) => series.field)])
    );
  }

  if (viz.kind === "table") {
    return Boolean(
      viz.columns?.length &&
      viz.columns.every((column) => present(column.field) && present(column.header)) &&
      viz.data?.length &&
      hasFields(viz.data, viz.columns.map((column) => column.field))
    );
  }

  if (viz.kind === "kpi") {
    return Boolean(
      viz.metrics?.length &&
      viz.metrics.every((metric) => present(metric.label) && present(metric.value))
    );
  }

  return false;
}
