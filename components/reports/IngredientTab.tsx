"use client";

import { useEffect } from "react";
import { useResource } from "@/lib/http/useResource";
import { reportsApi } from "@/lib/api/reports";
import type { IngredientConsumptionRow } from "@/types/api/reports";
import { AnalyzeButton } from "@/components/reports/AnalyzeButton";
import {
  GridComponent,
  ColumnsDirective,
  ColumnDirective,
  Page,
  Sort,
  Inject,
  type RowDataBoundEventArgs,
} from "@syncfusion/ej2-react-grids";

export function IngredientTab({
  filters,
  onLoading,
  onError,
}: {
  filters: Record<string, unknown>;
  onLoading: (v: boolean) => void;
  onError: (e: string | null) => void;
}) {
  const items = useResource(
    () => reportsApi.ingredientConsumption(filters as any),
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

  const rowDataBound = (args: RowDataBoundEventArgs) => {
    const row = args.data as IngredientConsumptionRow;
    if (!args.row) return;
    const el = args.row as HTMLElement;
    if (row.percentUsed >= 95) {
      el.style.backgroundColor = "#fee2e2";
    } else if (row.percentUsed >= 80) {
      el.style.backgroundColor = "#fef3c7";
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-end px-1 pb-2">
        <AnalyzeButton reportName="Nguyên liệu" data={data} />
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-400">
          Chưa có dữ liệu định lượng (BOM). Vào Master Data &gt; Công thức để thiết lập.
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <GridComponent
            dataSource={data}
            allowSorting
            allowPaging
            pageSettings={{ pageSize: 50 }}
            rowDataBound={rowDataBound}
            height="100%"
          >
            <ColumnsDirective>
              <ColumnDirective field="ingredientCode" headerText="Mã" width={80} />
              <ColumnDirective field="ingredientName" headerText="Tên nguyên liệu" width={180} />
              <ColumnDirective field="baseUomCode" headerText="Đơn vị tính" width={100} textAlign="Center" />
              <ColumnDirective
                field="totalConsumedQty"
                headerText="Đã dùng"
                width={100}
                textAlign="Right"
                format="N2"
              />
              <ColumnDirective
                field="currentStock"
                headerText="Tồn"
                width={100}
                textAlign="Right"
                format="N2"
              />
              <ColumnDirective
                field="percentUsed"
                headerText="% đã dùng"
                width={90}
                textAlign="Right"
                template={(row: IngredientConsumptionRow) =>
                  `${row.percentUsed.toFixed(1)}%`
                }
              />
            </ColumnsDirective>
            <Inject services={[Page, Sort]} />
          </GridComponent>
        </div>
      )}
    </div>
  );
}
