"use client";

import { useEffect } from "react";
import { useResource } from "@/lib/http/useResource";
import { reportsApi } from "@/lib/api/reports";
import type { ItemReportRow } from "@/types/api/reports";
import {
  GridComponent,
  ColumnsDirective,
  ColumnDirective,
  Page,
  Sort,
  Inject,
} from "@syncfusion/ej2-react-grids";

export function ItemTab({
  filters,
  onLoading,
  onError,
}: {
  filters: Record<string, unknown>;
  onLoading: (v: boolean) => void;
  onError: (e: string | null) => void;
}) {
  const items = useResource(
    () => reportsApi.items(filters as any),
    { deps: [filters] }
  );

  useEffect(() => {
    onLoading(items.loading);
  }, [items.loading, onLoading]);

  useEffect(() => {
    onError(items.error);
  }, [items.error, onError]);

  if (items.data === null) return null;

  const data = items.data;

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400">
        Không có dữ liệu
      </div>
    );
  }

  return (
    <GridComponent
      dataSource={data}
      allowSorting
      allowPaging
      pageSettings={{ pageSize: 50 }}
      sortSettings={{
        columns: [{ field: "totalRevenue", direction: "Descending" }],
      }}
      height="100%"
    >
      <ColumnsDirective>
        <ColumnDirective field="itemCode" headerText="Mã" width="100" />
        <ColumnDirective field="itemName" headerText="Tên món" width="200" />
        <ColumnDirective field="uomCode" headerText="ĐVT" width="60" />
        <ColumnDirective
          field="totalQuantity"
          headerText="SL"
          width="80"
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
          field="totalDiscount"
          headerText="Giảm giá"
          width="110"
          textAlign="Right"
          format="N0"
        />
        <ColumnDirective
          field="billCount"
          headerText="Số bill"
          width="80"
          textAlign="Right"
        />
      </ColumnsDirective>
      <Inject services={[Page, Sort]} />
    </GridComponent>
  );
}
