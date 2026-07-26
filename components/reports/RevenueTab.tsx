"use client";

import { useEffect, useMemo } from "react";
import { useResource } from "@/lib/http/useResource";
import { reportsApi } from "@/lib/api/reports";
import { ReportSummaryCards } from "@/components/reports/ReportSummaryCards";
import type { MetricCard } from "@/components/reports/ReportSummaryCards";
import type { RevenueResponse, BreakdownRow } from "@/types/api/reports";
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

function fmt(n: number): string {
  return n.toLocaleString("vi-VN");
}

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

  const cards: MetricCard[] = useMemo(
    () => [
      {
        label: "Tổng doanh thu",
        value: fmt(data.totalRevenue) + "đ",
      },
      {
        label: "Tổng hóa đơn",
        value: data.billCount.toLocaleString("vi-VN"),
      },
      {
        label: "TB / bill",
        value: fmt(data.averageBill) + "đ",
      },
      {
        label: "TB / khách",
        value: fmt(data.revenuePerGuest) + "đ",
      },
      {
        label: "Tiền mặt / QR",
        value:
          data.cashRate.toFixed(0) + "% / " + data.qrRate.toFixed(0) + "%",
        color: data.cashRate > 80 ? "amber" : undefined,
      },
      {
        label: "Tỉ lệ giảm giá",
        value: data.discountRate.toFixed(1) + "%",
        color: data.discountRate > 15 ? "amber" : undefined,
      },
    ],
    [data],
  );

  const signPrefix = data.prevPeriodChangePct >= 0 ? "+" : "";
  const comparisonText = [
    "📈",
    "Hôm qua:",
    signPrefix + data.prevPeriodChangePct.toFixed(1) + "% |",
    "Cùng thứ:",
    data.sameDowChangePct.toFixed(1) + "% |",
    "TB 30 ngày:",
    data.vsThirtyDayAvgPct.toFixed(1) + "%",
  ].join(" ");

  return (
    <div className="p-4 space-y-4">
      <ReportSummaryCards cards={cards} />

      <div className="text-sm text-gray-600 px-3">{comparisonText}</div>

      {/* Line chart */}
      <div className="h-80">
        <ChartComponent
          primaryXAxis={{ valueType: "Category", labelRotation: -45 }}
          primaryYAxis={{ labelFormat: "N0" }}
        >
          <ChartInject
            services={[LineSeries, Category, Legend, Tooltip, DataLabel]}
          />
          <SeriesCollectionDirective>
            <SeriesDirective
              type="Line"
              dataSource={data.breakdown}
              xName="label"
              yName="totalRevenue"
              name="Doanh thu"
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
            headerText="Khoảng thời gian"
            width="150"
          />
          <ColumnDirective
            field="billCount"
            headerText="SL hóa đơn"
            width="100"
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
            headerText="TB/bill"
            format="N0"
            width="120"
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
