"use client";

import {
  ChartComponent,
  SeriesCollectionDirective,
  SeriesDirective,
  Inject,
  LineSeries,
  Category,
  Legend,
  Tooltip,
} from "@syncfusion/ej2-react-charts";
import type { ChatVisualization } from "@/types/api/ai";

export function VisualizationRenderer({ viz }: { viz: ChatVisualization }) {
  if (viz.kind !== "chart" || viz.chartType !== "line" || !viz.data) {
    return (
      <div className="text-xs text-gray-400">
        [{viz.kind}] chưa hỗ trợ ở bản này
      </div>
    );
  }
  return (
    <div className="h-64 my-2">
      <div className="text-sm font-medium mb-1">{viz.title}</div>
      <ChartComponent
        primaryXAxis={{ valueType: "Category" }}
        primaryYAxis={{ labelFormat: "N0" }}
        legendSettings={{ visible: true }}
        tooltip={{ enable: true }}
      >
        <Inject services={[LineSeries, Category, Legend, Tooltip]} />
        <SeriesCollectionDirective>
          {(viz.series ?? []).map((s) => (
            <SeriesDirective
              key={s.field}
              type="Line"
              dataSource={viz.data as object[]}
              xName={viz.xField}
              yName={s.field}
              name={s.name}
              marker={{ visible: true }}
            />
          ))}
        </SeriesCollectionDirective>
      </ChartComponent>
    </div>
  );
}
