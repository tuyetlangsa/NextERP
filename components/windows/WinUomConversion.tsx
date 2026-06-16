"use client";

import { useMemo, useState } from "react";
import {
  ColumnDirective,
  ColumnsDirective,
  GridComponent,
  Inject,
  Page,
  Sort,
} from "@syncfusion/ej2-react-grids";
import { ensureSyncfusionLicense } from "@/lib/syncfusion-license";
import { WinToolbar, TB } from "@/components/ui/WinToolbar";
import { StatusBar } from "@/components/ui/StatusBar";
import { LoadingBar, OfflineBar, ErrorBar } from "@/components/ui/ResourceBars";
import { ChromeIcons } from "@/components/desktop/icons";
import { ItemUomConversionTab } from "@/components/inventory/ItemUomConversionTab";
import { stockableItemsLookupApi } from "@/lib/api/inventory";
import { uomsApi } from "@/lib/api/menu";
import { useResource } from "@/lib/http/useResource";
import type { StockableItemLookup } from "@/types/api/inventory";

ensureSyncfusionLicense();

export function WinUomConversion() {
  const [search, setSearch] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  const items = useResource(() => stockableItemsLookupApi.list(), { deps: [] });
  const uoms = useResource(() => uomsApi.list());

  const itemList = useMemo<StockableItemLookup[]>(
    () => items.data ?? [],
    [items.data]
  );
  const uomList = uoms.data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return itemList;
    return itemList.filter(
      i => i.code.toLowerCase().includes(q) || i.name.toLowerCase().includes(q)
    );
  }, [itemList, search]);

  const selectedItem = useMemo(
    () => itemList.find(i => i.itemId === selectedItemId) ?? null,
    [itemList, selectedItemId]
  );

  const handleRowSelected = (args: {
    data: StockableItemLookup | StockableItemLookup[];
  }) => {
    const row = Array.isArray(args.data) ? args.data[0] : args.data;
    if (row?.itemId) setSelectedItemId(row.itemId);
  };

  return (
    <>
      <WinToolbar
        left={<TB icon={ChromeIcons.Refresh} onClick={() => items.reload()}>Làm mới</TB>}
        right={<TB icon={ChromeIcons.Help}>Trợ giúp</TB>}
      />

      <div className="win-body">
        <div className="data-list" style={{ flex: "0 0 360px", borderRight: "1px solid var(--border)" }}>
          <div className="grid-filterbar">
            <strong style={{ fontSize: 13 }}>Hàng hoá</strong>
            <div className="tb-divider" />
            <div className="filter-group">
              <label>Tìm:</label>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Mã / tên hàng..."
              />
            </div>
          </div>

          {items.loading && <LoadingBar text="Đang tải hàng hoá..." />}
          {items.isOffline && <OfflineBar onRetry={() => items.reload()} />}
          {items.isApiError && <ErrorBar text={items.error ?? ""} onRetry={() => items.reload()} />}

          <GridComponent
            dataSource={filtered}
            allowSorting
            allowPaging
            pageSettings={{ pageSize: 25 }}
            rowSelected={handleRowSelected}
            selectedRowIndex={
              selectedItemId !== null
                ? filtered.findIndex(i => i.itemId === selectedItemId)
                : -1
            }
            height="100%"
          >
            <ColumnsDirective>
              <ColumnDirective field="code" headerText="Mã hàng" width="140" />
              <ColumnDirective field="name" headerText="Tên hàng" width="200" />
              <ColumnDirective field="baseUomCode" headerText="ĐVT gốc" width="100" />
            </ColumnsDirective>
            <Inject services={[Page, Sort]} />
          </GridComponent>
        </div>

        <div style={{ flex: 1, overflow: "auto" }}>
          {!selectedItem ? (
            <div style={{ padding: 24, color: "var(--fg-muted)", fontSize: 13 }}>
              Chọn một mặt hàng ở danh sách bên trái để quản lý quy đổi đơn vị tính của mặt hàng đó.
            </div>
          ) : (
            <div>
              <div
                style={{
                  padding: "10px 12px",
                  borderBottom: "1px solid var(--border)",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {selectedItem.code} — {selectedItem.name}
                <span style={{ marginLeft: 8, fontWeight: 400, color: "var(--fg-muted)" }}>
                  (ĐVT gốc: {selectedItem.baseUomCode} — {selectedItem.baseUomName})
                </span>
              </div>
              <ItemUomConversionTab
                key={selectedItem.itemId}
                itemId={selectedItem.itemId}
                baseUomId={selectedItem.baseUomId}
                uomList={uomList}
              />
            </div>
          )}
        </div>
      </div>

      <StatusBar
        left={
          <>
            <span>{filtered.length} mặt hàng</span>
            {items.isOffline && (
              <>
                <span>·</span>
                <span style={{ color: "var(--warning)" }}>offline (mock)</span>
              </>
            )}
          </>
        }
        right={<span>Chọn mặt hàng để sửa quy đổi ĐVT</span>}
      />
    </>
  );
}
