"use client";

import { useEffect, useState } from "react";
import { useResource } from "@/lib/http/useResource";
import { reportsApi } from "@/lib/api/reports";
import type { TopSellerRow } from "@/types/api/reports";
import { DropDownListComponent } from "@syncfusion/ej2-react-dropdowns";
import type { ChangeEventArgs as DropDownChangeEventArgs } from "@syncfusion/ej2-dropdowns";
import {
  GridComponent,
  ColumnsDirective,
  ColumnDirective,
  Page,
  Sort,
  Inject as GridInject,
} from "@syncfusion/ej2-react-grids";
import {
  ChartComponent,
  SeriesCollectionDirective,
  SeriesDirective,
  BarSeries,
  Category,
  Legend,
  Tooltip,
  DataLabel,
  Inject as ChartInject,
} from "@syncfusion/ej2-react-charts";

const topNOptions = [
  { text: "10", value: 10 },
  { text: "20", value: 20 },
  { text: "50", value: 50 },
];

const byOptions = [
  { text: "Doanh thu", value: "revenue" },
  { text: "Số lượng", value: "quantity" },
];

export function TopSellerTab({
  filters,
  onLoading,
  onError,
}: {
  filters: Record<string, unknown>;
  onLoading: (v: boolean) => void;
  onError: (e: string | null) => void;
}) {
  const [topN, setTopN] = useState(10);
  const [by, setBy] = useState("revenue");

  const result = useResource(
    () => reportsApi.topSellers({ ...filters, topN, by } as any),
    { deps: [filters, topN, by] }
  );

  useEffect(() => {
    onLoading(result.loading);
  }, [result.loading, onLoading]);

  useEffect(() => {
    onError(result.error);
  }, [result.error, onError]);

  const controls = (
    <div className="flex gap-4 mb-4">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">Top</label>
        <DropDownListComponent
          dataSource={topNOptions}
          fields={{ text: "text", value: "value" }}
          value={topN}
          change={(e: DropDownChangeEventArgs) => setTopN(e.value as number)}
          cssClass="w-20"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">Theo</label>
        <DropDownListComponent
          dataSource={byOptions}
          fields={{ text: "text", value: "value" }}
          value={by}
          change={(e: DropDownChangeEventArgs) => setBy(e.value as string)}
          cssClass="w-32"
        />
      </div>
    </div>
  );

  if (result.data === null) return null;

  const data = result.data;

  if (data.length === 0) {
    return (
      <div>
        {controls}
        <div className="flex items-center justify-center h-48 text-gray-400">
          Không có dữ liệu
        </div>
      </div>
    );
  }

  return (
    <div>
      {controls}

      <div className="h-80 mb-4">
        <ChartComponent
          primaryXAxis={{ labelFormat: "N0" }}
          primaryYAxis={{ valueType: "Category" }}
          legendSettings={{ visible: false }}
          tooltip={{ enable: true, format: "${point.y}: <b>${point.x}</b>" }}
        >
          <ChartInject
            services={[BarSeries, Category, Legend, Tooltip, DataLabel]}
          />
          <SeriesCollectionDirective>
            <SeriesDirective
              type="Bar"
              dataSource={data}
              xName="totalRevenue"
              yName="itemName"
              name="Doanh thu"
            />
          </SeriesCollectionDirective>
        </ChartComponent>
      </div>

      <GridComponent
        dataSource={data}
        allowSorting
        allowPaging
        pageSettings={{ pageSize: 50 }}
        height="100%"
      >
        <ColumnsDirective>
          <ColumnDirective
            field="rank"
            headerText="Rank"
            width="50"
            textAlign="Right"
          />
          <ColumnDirective field="itemCode" headerText="Mã" width="100" />
          <ColumnDirective field="itemName" headerText="Tên món" width="200" />
          <ColumnDirective
            field="totalQuantity"
            headerText="Số lượng"
            width="100"
            textAlign="Right"
            format="N0"
          />
          <ColumnDirective
            field="totalRevenue"
            headerText="Doanh thu"
            width="130"
            textAlign="Right"
            format="N0"
          />
          <ColumnDirective
            field="percentageOfTotal"
            headerText="% Tổng"
            width="80"
            textAlign="Right"
            format="N1"
          />
        </ColumnsDirective>
        <GridInject services={[Page, Sort]} />
      </GridComponent>
    </div>
  );
}
