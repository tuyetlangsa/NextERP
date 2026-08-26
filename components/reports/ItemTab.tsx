"use client";

import { useEffect } from "react";
import { useResource } from "@/lib/http/useResource";
import { reportsApi } from "@/lib/api/reports";
import type { ItemReportRow } from "@/types/api/reports";
import { AnalyzeButton } from "@/components/reports/AnalyzeButton";
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-end px-1 pb-2">
        <AnalyzeButton reportType="ITEM" reportName="Món hàng" data={data} filters={filters} />
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-400">
          Không có dữ liệu
        </div>
      ) : (
        <div className="flex-1 min-h-0">
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
              <ColumnDirective field="itemCode" headerText="Mã món" width="110" />
              <ColumnDirective field="itemName" headerText="Tên món" width="200" />
              <ColumnDirective field="uomCode" headerText="Đơn vị tính" width="100" />
              <ColumnDirective
                field="totalQuantity"
                headerText="Số lượng"
                width="90"
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
                headerText="Số hóa đơn"
                width="110"
                textAlign="Right"
              />
            </ColumnsDirective>
            <Inject services={[Page, Sort]} />
          </GridComponent>
        </div>
      )}
    </div>
  );
}
