"use client";

import {
  ChartComponent, SeriesCollectionDirective, SeriesDirective,
  Inject, LineSeries, ColumnSeries, AreaSeries, Category, Legend, Tooltip,
  AccumulationChartComponent, AccumulationSeriesCollectionDirective,
  AccumulationSeriesDirective, PieSeries, AccumulationLegend, AccumulationTooltip,
} from "@syncfusion/ej2-react-charts";
import type { ChatVisualization } from "@/types/api/ai";

const CARTESIAN: Record<string, "Line" | "Column" | "Area"> = {
  line: "Line", bar: "Column", area: "Area",
};

export function VisualizationRenderer({ viz }: { viz: ChatVisualization }) {
  if (viz.kind === "kpi" && viz.metrics) {
    return (
      <div className="my-2">
        <div className="text-sm font-medium mb-1">{viz.title}</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {viz.metrics.map((m, i) => (
            <div key={i} className="rounded-lg border border-gray-200 px-3 py-2">
              <div className="text-xs text-gray-500">{m.label}</div>
              <div className="text-base font-semibold">{m.value}{m.unit ? ` ${m.unit}` : ""}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (viz.kind === "table" && viz.columns && viz.data) {
    return (
      <div className="my-2 overflow-x-auto">
        <div className="text-sm font-medium mb-1">{viz.title}</div>
        <table className="w-full text-sm border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100 text-gray-600">
              {viz.columns.map((c) => (
                <th key={c.field} className="border border-gray-300 px-3 py-1.5 text-left">{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {viz.data.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                {viz.columns!.map((c) => (
                  <td key={c.field} className="border border-gray-300 px-3 py-1.5">
                    {formatCell(row[c.field], c.format)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (viz.kind === "chart" && viz.chartType === "pie" && viz.data && viz.series?.[0]) {
    const value = viz.series[0].field;
    return (
      <div className="h-64 my-2">
        <div className="text-sm font-medium mb-1">{viz.title}</div>
        <AccumulationChartComponent legendSettings={{ visible: true }} tooltip={{ enable: true }}>
          <Inject services={[PieSeries, AccumulationLegend, AccumulationTooltip]} />
          <AccumulationSeriesCollectionDirective>
            <AccumulationSeriesDirective
              dataSource={viz.data as object[]}
              xName={viz.xField}
              yName={value}
              type="Pie"
            />
          </AccumulationSeriesCollectionDirective>
        </AccumulationChartComponent>
      </div>
    );
  }

  if (viz.kind === "chart" && viz.chartType && CARTESIAN[viz.chartType] && viz.data) {
    const t = CARTESIAN[viz.chartType];
    return (
      <div className="h-64 my-2">
        <div className="text-sm font-medium mb-1">{viz.title}</div>
        <ChartComponent
          primaryXAxis={{ valueType: "Category" }}
          primaryYAxis={{ labelFormat: "N0" }}
          legendSettings={{ visible: true }}
          tooltip={{ enable: true }}
        >
          <Inject services={[LineSeries, ColumnSeries, AreaSeries, Category, Legend, Tooltip]} />
          <SeriesCollectionDirective>
            {(viz.series ?? []).map((s) => (
              <SeriesDirective
                key={s.field}
                type={t}
                dataSource={viz.data as object[]}
                xName={viz.xField}
                yName={s.field}
                name={s.name}
                marker={{ visible: t === "Line" }}
              />
            ))}
          </SeriesCollectionDirective>
        </ChartComponent>
      </div>
    );
  }

  return <div className="text-xs text-gray-400">[{viz.kind}] không hiển thị được</div>;
}

function formatCell(value: unknown, format?: string): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    if (format === "money") return value.toLocaleString("vi-VN") + "đ";
    if (format === "percent") return value.toFixed(1) + "%";
    if (format === "number") return value.toLocaleString("vi-VN");
    return value.toLocaleString("vi-VN");
  }
  return String(value);
}
