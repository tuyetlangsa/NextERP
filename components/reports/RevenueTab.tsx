"use client";

import { useEffect } from "react";
import { useResource } from "@/lib/http/useResource";
import { reportsApi } from "@/lib/api/reports";
import { AnalyzeButton } from "@/components/reports/AnalyzeButton";
import {
  ChartComponent,
  SeriesCollectionDirective,
  SeriesDirective,
  Inject as ChartInject,
  LineSeries,
  Category,
  Legend,
  Tooltip,
  DataLabel,
} from "@syncfusion/ej2-react-charts";
import {
  GridComponent,
  ColumnsDirective,
  ColumnDirective,
  Inject as GridInject,
  Page,
  Sort,
} from "@syncfusion/ej2-react-grids";

export function RevenueTab({
  filters,
  onLoading,
  onError,
}: {
  filters: Record<string, unknown>;
  onLoading: (v: boolean) => void;
  onError: (e: string | null) => void;
}) {
  const revenue = useResource(
    () => reportsApi.revenue(filters as any),
    { deps: [filters] },
  );

  useEffect(() => {
    onLoading(revenue.loading);
  }, [revenue.loading, onLoading]);

  useEffect(() => {
    onError(revenue.error);
  }, [revenue.error, onError]);

  const data = revenue.data;

  // Show nothing until loaded
  if (!data) return null;

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-end">
        <AnalyzeButton reportName="Doanh thu" data={data} />
      </div>

      {/* Line chart — current period vs previous period, one point per day.
          X axis shows the day number only (month intentionally omitted). */}
      <div className="h-80">
        <ChartComponent
          primaryXAxis={{ valueType: "Category", title: "Ngày" }}
          primaryYAxis={{ labelFormat: "N0" }}
          legendSettings={{ visible: true }}
          tooltip={{ enable: true }}
        >
          <ChartInject services={[LineSeries, Category, Legend, Tooltip, DataLabel]} />
          <SeriesCollectionDirective>
            <SeriesDirective
              type="Line"
              dataSource={data.revenueTrend}
              xName="label"
              yName="currentRevenue"
              name="Kỳ này"
              marker={{ visible: true }}
            />
            <SeriesDirective
              type="Line"
              dataSource={data.revenueTrend}
              xName="label"
              yName="previousRevenue"
              name="Kỳ trước"
              dashArray="5,5"
              marker={{ visible: true }}
            />
          </SeriesCollectionDirective>
        </ChartComponent>
      </div>

      {/* Detail grid */}
      <GridComponent
        dataSource={data.breakdown}
        allowPaging={true}
        allowSorting={true}
        pageSettings={{ pageSize: 10, pageSizes: [5, 10, 20, 50] }}
      >
        <GridInject services={[Page, Sort]} />
        <ColumnsDirective>
          <ColumnDirective
            field="label"
            headerText="Ngày"
            width="150"
          />
          <ColumnDirective
            field="billCount"
            headerText="Số lượng hóa đơn"
            width="140"
            textAlign="Right"
          />
          <ColumnDirective
            field="totalRevenue"
            headerText="Doanh thu"
            format="N0"
            width="130"
            textAlign="Right"
          />
          <ColumnDirective
            field="totalSubtotal"
            headerText="Tạm tính"
            format="N0"
            width="130"
            textAlign="Right"
          />
          <ColumnDirective
            field="totalDiscount"
            headerText="Giảm giá"
            format="N0"
            width="120"
            textAlign="Right"
          />
          <ColumnDirective
            field="averageBill"
            headerText="Trung bình/hóa đơn"
            format="N0"
            width="160"
            textAlign="Right"
          />
          <ColumnDirective
            field="cashAmount"
            headerText="Tiền mặt"
            format="N0"
            width="130"
            textAlign="Right"
          />
          <ColumnDirective
            field="qrAmount"
            headerText="QR"
            format="N0"
            width="120"
            textAlign="Right"
          />
        </ColumnsDirective>
      </GridComponent>
    </div>
  );
}
