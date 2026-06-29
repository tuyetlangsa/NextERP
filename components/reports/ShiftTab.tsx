"use client";

import { useEffect, useMemo } from "react";
import { useResource } from "@/lib/http/useResource";
import { reportsApi } from "@/lib/api/reports";
import type { ShiftReportRow } from "@/types/api/reports";
import {
  GridComponent,
  ColumnsDirective,
  ColumnDirective,
  Page,
  Sort,
  Inject,
  type RowDataBoundEventArgs,
} from "@syncfusion/ej2-react-grids";

export function ShiftTab({
  filters,
  onLoading,
  onError,
}: {
  filters: Record<string, unknown>;
  onLoading: (v: boolean) => void;
  onError: (e: string | null) => void;
}) {
  const shifts = useResource(
    () => reportsApi.shift(filters as any),
    { deps: [filters] }
  );

  useEffect(() => {
    onLoading(shifts.loading);
  }, [shifts.loading, onLoading]);

  useEffect(() => {
    onError(shifts.error);
  }, [shifts.error, onError]);

  const data = useMemo(() => {
    if (shifts.data === null) return null;
    return shifts.data.map((row) => ({
      ...row,
      _openedAt: row.openedAt
        ? new Date(row.openedAt).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        : "",
      _closedAt: row.closedAt
        ? new Date(row.closedAt).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        : "",
    }));
  }, [shifts.data]);

  if (data === null) return null;

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400">
        Không có dữ liệu
      </div>
    );
  }

  const rowDataBound = (args: RowDataBoundEventArgs) => {
    const row = args.data as ShiftReportRow;
    if (!args.row) return;
    const el = args.row as HTMLElement;
    if (row.variance !== null && row.variance < 0) {
      el.style.backgroundColor = "#fee2e2";
    } else if (row.variance !== null && row.variance > 0) {
      el.style.backgroundColor = "#dcfce7";
    }
  };

  return (
    <GridComponent
      dataSource={data}
      allowSorting
      allowPaging
      pageSettings={{ pageSize: 50 }}
      rowDataBound={rowDataBound}
      height="100%"
    >
      <ColumnsDirective>
        <ColumnDirective field="counterName" headerText="Quầy" width="100" />
        <ColumnDirective field="shiftName" headerText="Ca" width="90" />
        <ColumnDirective
          field="_openedAt"
          headerText="Mở"
          width="80"
          textAlign="Center"
        />
        <ColumnDirective
          field="_closedAt"
          headerText="Đóng"
          width="80"
          textAlign="Center"
        />
        <ColumnDirective
          field="openedByStaffName"
          headerText="NV mở"
          width="120"
        />
        <ColumnDirective
          field="closedByStaffName"
          headerText="NV đóng"
          width="120"
        />
        <ColumnDirective
          field="openingCash"
          headerText="Đầu ca"
          width="110"
          textAlign="Right"
          format="N0"
        />
        <ColumnDirective
          field="actualClosingCash"
          headerText="Cuối ca"
          width="110"
          textAlign="Right"
          format="N0"
        />
        <ColumnDirective
          field="variance"
          headerText="Chênh lệch"
          width="110"
          textAlign="Right"
          format="N0"
        />
        <ColumnDirective
          field="totalBills"
          headerText="Bills"
          width="60"
          textAlign="Right"
        />
        <ColumnDirective
          field="totalRevenue"
          headerText="DT"
          width="120"
          textAlign="Right"
          format="N0"
        />
        <ColumnDirective
          field="cashRevenue"
          headerText="TM"
          width="100"
          textAlign="Right"
          format="N0"
        />
        <ColumnDirective
          field="qrRevenue"
          headerText="QR"
          width="100"
          textAlign="Right"
          format="N0"
        />
      </ColumnsDirective>
      <Inject services={[Page, Sort]} />
    </GridComponent>
  );
}
