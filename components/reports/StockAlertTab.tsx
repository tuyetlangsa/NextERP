"use client";

import { useEffect, useState, useCallback } from "react";
import { useResource } from "@/lib/http/useResource";
import { reportsApi } from "@/lib/api/reports";
import type { StockAlertRow } from "@/types/api/reports";
import {
  GridComponent,
  ColumnsDirective,
  ColumnDirective,
  Page,
  Sort,
  Inject,
  type RowDataBoundEventArgs,
} from "@syncfusion/ej2-react-grids";
import { CheckBoxComponent } from "@syncfusion/ej2-react-buttons";
export function StockAlertTab({
  onLoading,
  onError,
}: {
  onLoading: (v: boolean) => void;
  onError: (e: string | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [pendingSearch, setPendingSearch] = useState("");
  const [lowStock, setLowStock] = useState(true);

  const params = { search, lowStock };

  const items = useResource(
    () => reportsApi.stockAlert(params),
    { deps: [search, lowStock] }
  );

  useEffect(() => {
    onLoading(items.loading);
  }, [items.loading, onLoading]);

  useEffect(() => {
    onError(items.error);
  }, [items.error, onError]);

  const handleSearchApply = useCallback(() => {
    setSearch(pendingSearch);
  }, [pendingSearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleSearchApply();
      }
    },
    [handleSearchApply]
  );

  const handleLowStockChange = useCallback(
    (args: { checked: boolean }) => {
      setLowStock(args.checked);
    },
    []
  );

  if (items.data === null) return null;

  const data = items.data;

  const rowDataBound = (args: RowDataBoundEventArgs) => {
    const row = args.data as StockAlertRow;
    if (!args.row) return;
    const el = args.row as HTMLElement;
    if (row.status === "NEGATIVE") {
      el.style.backgroundColor = "#fee2e2";
    } else if (row.status === "LOW") {
      el.style.backgroundColor = "#fef3c7";
    }
  };

  const renderStatus = (row: StockAlertRow): React.ReactElement => {
    const status = row.status;
    let colorClass = "";
    let label = status;
    if (status === "OK") {
      colorClass = "bg-green-100 text-green-800";
      label = "OK";
    } else if (status === "LOW") {
      colorClass = "bg-amber-100 text-amber-800";
      label = "Thấp";
    } else if (status === "NEGATIVE") {
      colorClass = "bg-red-100 text-red-800";
      label = "Âm";
    }
    return (
      <span
        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}
      >
        {label}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Controls */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <input
            type="text"
            placeholder="Tìm theo mã / tên..."
            value={pendingSearch}
            onChange={(e) => setPendingSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            style={{ width: 220 }}
          />
          <button
            type="button"
            onClick={handleSearchApply}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Tìm
          </button>
        </div>
        <CheckBoxComponent
          label="Chỉ hiện mức thấp/hết"
          checked={lowStock}
          change={handleLowStockChange as any}
        />
      </div>

      {/* Grid */}
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-400">
          Không có dữ liệu
        </div>
      ) : (
        <GridComponent
          dataSource={data}
          allowSorting
          allowPaging
          pageSettings={{ pageSize: 50 }}
          rowDataBound={rowDataBound}
          height="100%"
        >
          <ColumnsDirective>
            <ColumnDirective field="itemCode" headerText="Mã" width={100} />
            <ColumnDirective field="itemName" headerText="Tên" width={200} />
            <ColumnDirective field="baseUomCode" headerText="ĐVT" width={60} textAlign="Center" />
            <ColumnDirective
              field="currentQty"
              headerText="Tồn hiện"
              width={100}
              textAlign="Right"
              format="N2"
            />
            <ColumnDirective
              field="lowStockThreshold"
              headerText="Ngưỡng"
              width={100}
              textAlign="Right"
              format="N2"
            />
            <ColumnDirective
              field="status"
              headerText="Trạng thái"
              width={90}
              textAlign="Center"
              template={renderStatus as any}
            />
          </ColumnsDirective>
          <Inject services={[Page, Sort]} />
        </GridComponent>
      )}
    </div>
  );
}
