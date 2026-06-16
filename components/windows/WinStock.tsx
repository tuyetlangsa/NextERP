"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ColumnDirective,
  ColumnsDirective,
  Filter,
  GridComponent,
  Inject,
  Page,
  RowDataBoundEventArgs,
  Sort,
} from "@syncfusion/ej2-react-grids";
import { ensureSyncfusionLicense } from "@/lib/syncfusion-license";
import { WinToolbar, TB } from "@/components/ui/WinToolbar";
import { StatusBar } from "@/components/ui/StatusBar";
import { LoadingBar, OfflineBar, ErrorBar } from "@/components/ui/ResourceBars";
import { ChromeIcons } from "@/components/desktop/icons";
import { stockApi } from "@/lib/api/inventory";
import { useResource } from "@/lib/http/useResource";
import { openStockMovementForItem } from "@/lib/desktop/navigate";
import { mockStockLevels } from "@/data/mock";
import type { StockLevel } from "@/types/api/inventory";

ensureSyncfusionLicense();

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("vi-VN");
}

export function WinStock() {
  const [search, setSearch] = useState("");
  const [pendingSearch, setPendingSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const listQuery = useMemo(
    () => ({
      search: search.trim() || undefined,
      lowStock: lowStockOnly || undefined,
    }),
    [search, lowStockOnly]
  );

  const stock = useResource(() => stockApi.list(listQuery), {
    fallback: mockStockLevels,
    deps: [listQuery.search, listQuery.lowStock],
  });

  const list = useMemo(
    () =>
      (stock.data ?? []).map(row => ({
        ...row,
        qtyDisplay: `${row.currentQty} ${row.baseUomCode}`,
        // Real data may have no threshold configured (null) → show "—" and never
        // flag such rows as low (null is "no warning level", not zero).
        thresholdDisplay:
          row.lowStockThreshold != null
            ? `${row.lowStockThreshold} ${row.baseUomCode}`
            : "—",
        updatedDisplay: formatDateTime(row.updatedAt),
        isLow:
          row.lowStockThreshold != null &&
          row.currentQty <= row.lowStockThreshold,
      })),
    [stock.data]
  );

  // See WinStockMovement: a non-null mock fallback means the grid `key` must be
  // tied to data identity, otherwise Syncfusion keeps showing the seed rows after
  // the real response arrives.
  const [gridVersion, setGridVersion] = useState(0);
  useEffect(() => {
    setGridVersion(v => v + 1);
  }, [stock.data]);

  const applySearch = () => setSearch(pendingSearch);

  const handleRowSelected = (args: { data: StockLevel | StockLevel[] }) => {
    const row = Array.isArray(args.data) ? args.data[0] : args.data;
    if (row?.itemId) openStockMovementForItem(row.itemId);
  };

  const rowDataBound = (args: RowDataBoundEventArgs) => {
    const row = args.data as { isLow?: boolean };
    if (row.isLow && args.row) {
      (args.row as HTMLElement).style.backgroundColor = "#fef2f2";
    }
  };

  return (
    <>
      <WinToolbar
        left={
          <>
            <TB icon={ChromeIcons.Refresh} onClick={() => stock.reload()}>Làm mới</TB>
          </>
        }
        right={<TB icon={ChromeIcons.Help}>Trợ giúp</TB>}
      />

      <div className="win-body">
        <div className="data-list" style={{ flex: 1 }}>
          <div className="grid-filterbar">
            <strong style={{ fontSize: 13 }}>Tồn kho</strong>
            <div className="tb-divider" />
            <div className="filter-group">
              <label>Tìm:</label>
              <input
                value={pendingSearch}
                onChange={e => setPendingSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && applySearch()}
                placeholder="Mã / tên hàng..."
              />
              <button type="button" onClick={applySearch} style={{ marginLeft: 4, padding: "4px 10px", fontSize: 12 }}>
                Tìm
              </button>
            </div>
            <div className="filter-group">
              <label>
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={e => setLowStockOnly(e.target.checked)}
                  style={{ marginRight: 6 }}
                />
                Chỉ hàng sắp hết
              </label>
            </div>
          </div>

          {stock.loading && <LoadingBar text="Đang tải tồn kho..." />}
          {stock.isOffline && <OfflineBar onRetry={() => stock.reload()} />}
          {stock.isApiError && <ErrorBar text={stock.error ?? ""} onRetry={() => stock.reload()} />}

          <GridComponent
            key={`stock-${gridVersion}`}
            dataSource={list}
            allowSorting
            allowPaging
            allowFiltering
            filterSettings={{ type: "Menu" }}
            pageSettings={{ pageSize: 25 }}
            rowSelected={handleRowSelected}
            rowDataBound={rowDataBound}
            height="100%"
          >
            <ColumnsDirective>
              <ColumnDirective field="itemCode" headerText="Mã hàng" width="160" />
              <ColumnDirective field="itemName" headerText="Tên hàng" width="220" />
              <ColumnDirective field="qtyDisplay" headerText="Tồn" width="120" />
              <ColumnDirective field="thresholdDisplay" headerText="Ngưỡng thấp" width="130" />
              <ColumnDirective field="updatedDisplay" headerText="Cập nhật" width="160" />
            </ColumnsDirective>
            <Inject services={[Page, Sort, Filter]} />
          </GridComponent>
        </div>
      </div>

      <StatusBar
        left={
          <>
            <span>{list.length} mặt hàng</span>
            <span>·</span>
            <span>{list.filter(r => r.isLow).length} sắp hết</span>
            {stock.isOffline && (
              <>
                <span>·</span>
                <span style={{ color: "var(--warning)" }}>offline (mock)</span>
              </>
            )}
          </>
        }
        right={<span>Click dòng để xem sổ nhập/xuất</span>}
      />
    </>
  );
}
