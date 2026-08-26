"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useResource } from "@/lib/http/useResource";
import { reportsApi } from "@/lib/api/reports";
import { ReportSummaryCards } from "@/components/reports/ReportSummaryCards";
import type { MetricCard } from "@/components/reports/ReportSummaryCards";
import type { DetailedRevenueResponse } from "@/types/api/reports";
import { AnalyzeButton } from "@/components/reports/AnalyzeButton";
import {
  GridComponent,
  ColumnsDirective,
  ColumnDirective,
  Inject,
  Page,
  Sort,
} from "@syncfusion/ej2-react-grids";

function fmt(n: number): string {
  return n.toLocaleString("vi-VN");
}

export function DetailedRevenueTab({
  filters,
  onLoading,
  onError,
  onDrillDown,
}: {
  filters: Record<string, unknown>;
  onLoading: (v: boolean) => void;
  onError: (e: string | null) => void;
  onDrillDown: (ticketId: number) => void;
}) {
  // Fetch a single large page and let the Syncfusion grid paginate client-side.
  // (Mixing server-side paging with the grid's own client-side paging caused the grid
  //  to loop/freeze when clicking through pages — see the other tabs which page client-side.)
  const revenueDetail = useResource(
    () =>
      reportsApi.revenueDetail({
        ...(filters as any),
        pageNumber: 1,
        pageSize: 1000,
      }),
    { deps: [filters] },
  );

  useEffect(() => {
    onLoading(revenueDetail.loading);
  }, [revenueDetail.loading, onLoading]);

  useEffect(() => {
    onError(revenueDetail.error);
  }, [revenueDetail.error, onError]);

  const data = revenueDetail.data;

  // All hooks run every render — guard on nullable `data`, early-return only afterwards.
  const cards: MetricCard[] = useMemo(
    () =>
      data
        ? [
            {
              label: "Tổng hóa đơn",
              value: data.summary.totalBills.toLocaleString("vi-VN"),
            },
            {
              label: "Tổng doanh thu",
              value: fmt(data.summary.totalRevenue) + "đ",
            },
            {
              label: "Trung bình / hóa đơn",
              value: fmt(data.summary.averageBill) + "đ",
            },
          ]
        : [],
    [data],
  );

  const handleRowSelected = useCallback(
    (args: any) => {
      const row = args.data as { ticketId: number };
      onDrillDown(row.ticketId);
    },
    [onDrillDown],
  );

  if (!data) return null;

  const isEmpty = !data.bills || data.bills.length === 0;

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-end">
        <AnalyzeButton
          reportType="TICKET_LIST"
          reportName="Danh sách phiếu"
          data={data}
          hasData={!isEmpty}
          filters={{ ...filters, pageNumber: 1, pageSize: 1000 }}
        />
      </div>

      <ReportSummaryCards cards={cards} />

      {isEmpty ? (
        <div className="text-center text-gray-400 py-12">
          Không có dữ liệu
        </div>
      ) : (
        <GridComponent
          dataSource={data.bills}
          allowPaging={true}
          allowSorting={true}
          pageSettings={{ pageSize: 20, pageSizes: [10, 20, 50, 100] }}
          rowSelected={handleRowSelected}
        >
          <Inject services={[Page, Sort]} />
          <ColumnsDirective>
            <ColumnDirective
              field="rowNumber"
              headerText="Số thứ tự"
              width="90"
              textAlign="Right"
            />
            <ColumnDirective
              field="ticketCode"
              headerText="Mã phiếu"
              width="140"
            />
            <ColumnDirective
              field="closedAt"
              headerText="Ngày"
              format="dd/MM HH:mm"
              type="date"
              width="120"
            />
            <ColumnDirective
              field="tableCode"
              headerText="Bàn"
              width="70"
            />
            <ColumnDirective
              field="waiterName"
              headerText="Nhân viên"
              width="120"
            />
            <ColumnDirective
              field="subtotal"
              headerText="Tiền hàng"
              format="N0"
              width="110"
              textAlign="Right"
            />
            <ColumnDirective
              field="discountAmount"
              headerText="Giảm giá"
              format="N0"
              width="100"
              textAlign="Right"
            />
            <ColumnDirective
              field="vatAmount"
              headerText="VAT"
              format="N0"
              width="90"
              textAlign="Right"
            />
            <ColumnDirective
              field="totalAmount"
              headerText="Tổng"
              format="N0"
              width="120"
              textAlign="Right"
            />
            <ColumnDirective
              field="paymentMethods"
              headerText="Thanh toán"
              width="110"
            />
          </ColumnsDirective>
        </GridComponent>
      )}
    </div>
  );
}
