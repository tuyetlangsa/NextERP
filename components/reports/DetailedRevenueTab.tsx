"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useResource } from "@/lib/http/useResource";
import { reportsApi } from "@/lib/api/reports";
import { ReportSummaryCards } from "@/components/reports/ReportSummaryCards";
import type { MetricCard } from "@/components/reports/ReportSummaryCards";
import type { DetailedRevenueResponse } from "@/types/api/reports";
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const revenueDetail = useResource(
    () =>
      reportsApi.revenueDetail({
        ...(filters as any),
        pageNumber: page,
        pageSize,
      }),
    { deps: [filters, page, pageSize] },
  );

  useEffect(() => {
    onLoading(revenueDetail.loading);
  }, [revenueDetail.loading, onLoading]);

  useEffect(() => {
    onError(revenueDetail.error);
  }, [revenueDetail.error, onError]);

  const data = revenueDetail.data;

  if (!data) return null;

  const cards: MetricCard[] = useMemo(
    () => [
      {
        label: "Tổng hóa đơn",
        value: data.summary.totalBills.toLocaleString("vi-VN"),
      },
      {
        label: "Tổng doanh thu",
        value: fmt(data.summary.totalRevenue) + "đ",
      },
      {
        label: "TB / bill",
        value: fmt(data.summary.averageBill) + "đ",
      },
    ],
    [data],
  );

  const handleRowSelected = useCallback(
    (args: any) => {
      const row = args.data as { ticketId: number };
      onDrillDown(row.ticketId);
    },
    [onDrillDown],
  );

  const handleActionComplete = useCallback((args: any) => {
    if (args.requestType === "paging") {
      setPage(args.currentPage);
      setPageSize(args.pageSize);
    }
  }, []);

  const isEmpty = !data.bills || data.bills.length === 0;

  return (
    <div className="p-4 space-y-4">
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
          pageSettings={{
            pageSize,
            pageSizes: [10, 20, 50, 100],
            currentPage: page,
            totalRecordsCount: data.totalCount,
          }}
          rowSelected={handleRowSelected}
          actionComplete={handleActionComplete}
        >
          <Inject services={[Page, Sort]} />
          <ColumnsDirective>
            <ColumnDirective
              field="rowNumber"
              headerText="STT"
              width="60"
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
              headerText="NV"
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
              headerText="TT"
              width="100"
            />
          </ColumnsDirective>
        </GridComponent>
      )}
    </div>
  );
}
