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
import { DetailPanel, Field } from "@/components/ui/DetailPanel";
import { StatusBar } from "@/components/ui/StatusBar";
import { LoadingBar, OfflineBar, ErrorBar } from "@/components/ui/ResourceBars";
import { ChromeIcons } from "@/components/desktop/icons";
import {
  itemUomConversionsApi,
  stockableItemsLookupApi,
  stockMovementsApi,
} from "@/lib/api/inventory";
import { useResource } from "@/lib/http/useResource";
import { formatApiError } from "@/lib/http/formatError";
import {
  consumeStockMovementItemFilter,
  STOCK_MOVEMENT_FILTER_EVENT,
} from "@/lib/desktop/navigate";
import {
  MANUAL_MOVEMENT_TYPES,
  MOVEMENT_TYPE_COLORS,
  MOVEMENT_TYPE_LABELS,
  formatMovementQty,
  parseConversionFromReason,
  signedBaseQty,
  type ManualMovementType,
} from "@/lib/inventory/movement";
import { mockStockMovements } from "@/data/mock";
import type { BaseResponse } from "@/lib/http/types";
import type {
  ItemUomConversion,
  StockableItemLookup,
  StockMovement,
  StockMovementType,
} from "@/types/api/inventory";

ensureSyncfusionLicense();

const EMPTY_CONVERSIONS: BaseResponse<ItemUomConversion[]> = {
  isSuccess: true,
  message: "",
  data: [],
  type: null,
  title: null,
  status: null,
  detail: null,
  extensions: null,
  statusCode: 200,
};

type CreateDraft = {
  itemId: number;
  movementType: ManualMovementType;
  quantity: number;
  uomId: number;
  reason: string;
};

type UomOption = { uomId: number; code: string; name: string; label: string };

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("vi-VN");
}

export function WinStockMovement() {
  const [filterItemId, setFilterItemId] = useState<number | "">("");
  const [filterType, setFilterType] = useState<StockMovementType | "">("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const PAGE_SIZE = 50;

  const [collapsed, setCollapsed] = useState(false);
  const [draft, setDraft] = useState<CreateDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const draftItemId = draft?.itemId ?? 0;

  useEffect(() => {
    const presetItemId = consumeStockMovementItemFilter();
    if (presetItemId !== null) setFilterItemId(presetItemId);

    // Handles the case where this window is already open and the user clicks
    // another row in the Stock dashboard — re-open only focuses us, so we rely
    // on this event (not the mount-time sessionStorage read) to retarget.
    const onFilter = (e: Event) => {
      const detail = (e as CustomEvent<{ itemId: number }>).detail;
      if (detail?.itemId != null) {
        setFilterItemId(detail.itemId);
        setPageNumber(1);
      }
    };
    window.addEventListener(STOCK_MOVEMENT_FILTER_EVENT, onFilter);
    return () => window.removeEventListener(STOCK_MOVEMENT_FILTER_EVENT, onFilter);
  }, []);

  // Dedicated lookup: server returns every IsStockable=true item (incl. qty 0)
  // with its current balance — the correct source for the picker (vs `/api/items`
  // which can't filter by isStockable).
  const stockableItems = useResource(() => stockableItemsLookupApi.list(), { deps: [] });

  const stockableList = useMemo<StockableItemLookup[]>(
    () => stockableItems.data ?? [],
    [stockableItems.data]
  );

  // Movements can be entered in the item's base Uom OR any active conversion of
  // that item (server converts to base). Fetch the selected item's conversions to
  // populate the unit dropdown; base Uom comes from the lookup row itself.
  const selectedItem = useMemo(
    () => stockableList.find(i => i.itemId === draftItemId) ?? null,
    [stockableList, draftItemId]
  );

  const itemConversions = useResource(
    () =>
      draftItemId > 0
        ? itemUomConversionsApi.list(draftItemId, { isActive: true })
        : Promise.resolve(EMPTY_CONVERSIONS),
    { deps: [draftItemId] }
  );

  const uomOptions = useMemo<UomOption[]>(() => {
    if (!selectedItem) return [];
    const base: UomOption = {
      uomId: selectedItem.baseUomId,
      code: selectedItem.baseUomCode,
      name: selectedItem.baseUomName,
      label: `${selectedItem.baseUomCode} — ${selectedItem.baseUomName} (cơ bản)`,
    };
    const convs = (itemConversions.data ?? []).map(c => ({
      uomId: c.uomId,
      code: c.uomCode,
      name: c.uomName,
      label: `${c.uomCode} — ${c.uomName} (1 = ${c.factorToBase} ${selectedItem.baseUomCode})`,
    }));
    return [base, ...convs];
  }, [selectedItem, itemConversions.data]);

  const draftUom = useMemo(
    () => uomOptions.find(o => o.uomId === draft?.uomId) ?? null,
    [uomOptions, draft?.uomId]
  );

  const previewSignedBaseQty = useMemo(() => {
    if (!draft || !selectedItem || draft.quantity <= 0) return null;
    return signedBaseQty(
      draft.quantity,
      draft.uomId,
      selectedItem.baseUomId,
      draft.movementType,
      itemConversions.data ?? []
    );
  }, [draft, selectedItem, itemConversions.data]);

  const listQuery = useMemo(
    () => ({
      itemId: filterItemId !== "" ? filterItemId : undefined,
      movementType: filterType || undefined,
      from: filterFrom || undefined,
      to: filterTo || undefined,
      pageNumber,
      pageSize: PAGE_SIZE,
    }),
    [filterItemId, filterType, filterFrom, filterTo, pageNumber]
  );

  const movements = useResource(
    () => stockMovementsApi.list(listQuery),
    {
      fallback: {
        items: mockStockMovements,
        pageNumber: 1,
        totalPages: 1,
        totalCount: mockStockMovements.length,
        hasPreviousPage: false,
        hasNextPage: false,
      },
      deps: [
        listQuery.itemId,
        listQuery.movementType,
        listQuery.from,
        listQuery.to,
        listQuery.pageNumber,
      ],
    }
  );

  const rawItems = movements.data?.items ?? [];
  const totalCount = movements.data?.totalCount ?? rawItems.length;

  // Syncfusion Grid only repaints when its `key` changes, not on a plain
  // `dataSource` prop change. Because we seed `movements` with a mock fallback,
  // `movements.data` is non-null from the first render, so a `data ? … : "loading"`
  // key would never flip when the REAL response replaces the fallback — leaving
  // the grid frozen on mock rows while the footer shows the real count. Bumping a
  // version on every `movements.data` change forces a remount whenever data
  // (fallback→real, reload, page or filter change) actually changes.
  const [gridVersion, setGridVersion] = useState(0);
  useEffect(() => {
    setGridVersion(v => v + 1);
  }, [movements.data]);

  const list = useMemo(
    () =>
      rawItems.map(m => {
        const itemMeta = stockableList.find(i => i.itemId === m.itemId);
        const baseCode = m.baseUomCode ?? itemMeta?.baseUomCode ?? "";
        const parsed = parseConversionFromReason(m.reason);

        let inputQty = m.inputQty ?? parsed?.inputQty;
        let inputUomCode = m.uomCode ?? parsed?.inputUom;

        if (inputQty == null && inputUomCode == null && baseCode) {
          inputQty = Math.abs(m.qtyInBase);
          inputUomCode = baseCode;
        }

        const inputQtyDisplay =
          inputQty != null ? formatMovementQty(inputQty) : "—";
        const inputUomDisplay = inputUomCode || "—";
        const baseQtyDisplay = formatMovementQty(m.qtyInBase);
        const baseUomDisplay = baseCode || "—";
        const conversionDisplay =
          inputUomCode && baseCode
            ? `${inputQtyDisplay} ${inputUomCode} = ${baseQtyDisplay} ${baseCode}`
            : baseQtyDisplay;

        return {
          ...m,
          typeLabel: MOVEMENT_TYPE_LABELS[m.movementType],
          createdDisplay: formatDateTime(m.createdAt),
          referenceDisplay:
            m.referenceType === "ORDER_DISH" && m.referenceId
              ? `#${m.referenceId}`
              : m.referenceId
                ? String(m.referenceId)
                : "—",
          inputQtyDisplay,
          inputUomDisplay,
          baseQtyDisplay,
          baseUomDisplay,
          conversionDisplay,
          balanceDisplay: baseCode
            ? `${formatMovementQty(m.balanceAfter)} ${baseCode}`
            : formatMovementQty(m.balanceAfter),
        };
      }),
    [rawItems, stockableList]
  );

  useEffect(() => {
    if (!draft && stockableList.length > 0) {
      const defItem =
        (filterItemId !== "" && stockableList.find(i => i.itemId === filterItemId)) ||
        stockableList[0];
      setDraft({
        itemId: defItem.itemId,
        movementType: "STOCK_IN",
        quantity: 1,
        uomId: defItem.baseUomId,
        reason: "",
      });
    }
  }, [draft, stockableList, filterItemId]);

  useEffect(() => {
    if (filterItemId !== "") {
      setDraft(d => (d ? { ...d, itemId: filterItemId } : d));
    }
  }, [filterItemId]);

  // Keep the selected Uom valid for the current item: when the item (or its
  // loaded conversions) change and the draft Uom is no longer offered, snap back
  // to the item's base Uom. Covers item switches and dashboard navigation that
  // set itemId before conversions/base info are available.
  useEffect(() => {
    if (!selectedItem || !draft) return;
    if (!uomOptions.some(o => o.uomId === draft.uomId)) {
      setDraft(d => (d ? { ...d, uomId: selectedItem.baseUomId } : d));
    }
  }, [selectedItem, uomOptions, draft]);

  const handleCreate = async () => {
    if (!draft) return;
    if (draft.quantity <= 0) {
      setErrorMsg("Số lượng phải lớn hơn 0.");
      setSuccessMsg(null);
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    const res = await stockMovementsApi.create({
      itemId: draft.itemId,
      movementType: draft.movementType,
      quantity: draft.quantity,
      uomId: draft.uomId,
      reason: draft.reason.trim() || null,
    });
    if (res.isSuccess) {
      // Newest movement lands on page 1 (ledger is newest-first); jump there so
      // the user sees the entry they just created. Changing pageNumber re-runs the
      // fetch via useResource deps; on page 1 we reload explicitly. Either way the
      // grid repaints via `gridVersion` once the fresh data arrives.
      if (pageNumber !== 1) setPageNumber(1);
      else await movements.reload();
      setDraft({
        itemId: draft.itemId,
        movementType: draft.movementType,
        quantity: 1,
        uomId: draft.uomId,
        reason: "",
      });
      const label = MOVEMENT_TYPE_LABELS[draft.movementType];
      const convHint =
        previewSignedBaseQty != null && draftUom && selectedItem
          ? ` (${formatMovementQty(draft.quantity)} ${draftUom.code} = ${formatMovementQty(previewSignedBaseQty)} ${selectedItem.baseUomCode})`
          : "";
      setSuccessMsg(`Đã ghi "${label}" cho ${itemLabel(draft.itemId)}${convHint}.`);
    } else {
      setErrorMsg(formatApiError(res));
    }
    setSaving(false);
  };

  const rowDataBound = (args: RowDataBoundEventArgs) => {
    const row = args.data as StockMovement;
    const bg = MOVEMENT_TYPE_COLORS[row.movementType];
    if (args.row && bg) (args.row as HTMLElement).style.backgroundColor = bg;
  };

  const itemLabel = (id: number) => {
    const item = stockableList.find(i => i.itemId === id);
    return item ? `${item.code} — ${item.name}` : `#${id}`;
  };

  return (
    <>
      <WinToolbar
        left={
          <>
            <TB icon={ChromeIcons.Save} onClick={handleCreate} kind="primary" disabled={!draft || saving}>
              {saving ? "Đang ghi..." : "Ghi nhập/xuất"}
            </TB>
            <div className="tb-divider" />
            <TB icon={ChromeIcons.Refresh} onClick={() => movements.reload()}>Làm mới</TB>
          </>
        }
        right={<TB icon={ChromeIcons.Help}>Trợ giúp</TB>}
      />

      <div className="win-body">
        <DetailPanel
          title="Nhập / Xuất kho"
          collapsed={collapsed}
          onToggle={() => setCollapsed(c => !c)}
        >
          {draft ? (
            <>
              <Field label="Hàng hoá" required>
                <select
                  value={draft.itemId}
                  onChange={e => {
                    const id = Number(e.target.value);
                    const it = stockableList.find(x => x.itemId === id);
                    setDraft({ ...draft, itemId: id, uomId: it ? it.baseUomId : draft.uomId });
                  }}
                >
                  {stockableList.map(i => (
                    <option key={i.itemId} value={i.itemId}>
                      {i.code} — {i.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Loại" required>
                <select
                  value={draft.movementType}
                  onChange={e =>
                    setDraft({ ...draft, movementType: e.target.value as ManualMovementType })
                  }
                >
                  {MANUAL_MOVEMENT_TYPES.map(t => (
                    <option key={t} value={t}>
                      {MOVEMENT_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Số lượng nhập" required>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={draft.quantity}
                    onChange={e => setDraft({ ...draft, quantity: Number(e.target.value) })}
                    style={{ width: 90 }}
                  />
                  <select
                    value={draft.uomId}
                    onChange={e => setDraft({ ...draft, uomId: Number(e.target.value) })}
                    style={{ flex: 1 }}
                  >
                    {uomOptions.map(o => (
                      <option key={o.uomId} value={o.uomId}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>

              {selectedItem && draft.quantity > 0 && draftUom && previewSignedBaseQty != null && (
                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    padding: 10,
                    marginBottom: 12,
                    background: "#fafafa",
                    fontSize: 12,
                  }}
                >
                  <div style={{ fontSize: 11, color: "var(--fg-muted)", marginBottom: 8 }}>
                    Quy đổi ra ĐVT lưu kho
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto 1fr auto",
                      gap: "6px 10px",
                      alignItems: "center",
                      textAlign: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 10, color: "var(--fg-muted)" }}>SL nhập</div>
                      <strong>{formatMovementQty(draft.quantity)}</strong>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "var(--fg-muted)" }}>ĐV nhập</div>
                      <strong>{draftUom.code}</strong>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "var(--fg-muted)" }}>SL lưu kho</div>
                      <strong style={{ color: "var(--accent)" }}>
                        {formatMovementQty(previewSignedBaseQty)}
                      </strong>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "var(--fg-muted)" }}>ĐVT lưu kho</div>
                      <strong>{selectedItem.baseUomCode}</strong>
                    </div>
                  </div>
                  <div style={{ marginTop: 8, color: "var(--accent)", fontWeight: 500 }}>
                    → {formatMovementQty(draft.quantity)} {draftUom.code} ={" "}
                    {formatMovementQty(previewSignedBaseQty)} {selectedItem.baseUomCode}
                  </div>
                </div>
              )}

              {selectedItem && draft.quantity > 0 && previewSignedBaseQty == null && (
                <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 12 }}>
                  Đơn vị không hợp lệ cho mặt hàng này.
                </div>
              )}
              <Field label="Lý do">
                <input
                  value={draft.reason}
                  onChange={e => setDraft({ ...draft, reason: e.target.value })}
                  placeholder="Tuỳ chọn..."
                />
              </Field>
              {errorMsg && (
                <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 8, whiteSpace: "pre-wrap" }}>
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div style={{ color: "var(--success, #16a34a)", fontSize: 12, marginTop: 8 }}>
                  {successMsg}
                </div>
              )}
              <div style={{ marginTop: 12, fontSize: 11, color: "var(--fg-muted)" }}>
                Sổ kho append-only — không sửa/xoá. ADJUST_OUT sẽ được server ghi âm.
              </div>
            </>
          ) : (
            <div style={{ color: "var(--fg-muted)", fontSize: 12, padding: 12 }}>
              Đang tải danh sách hàng quản kho...
            </div>
          )}
        </DetailPanel>

        <div className="data-list">
          <div className="grid-filterbar">
            <strong style={{ fontSize: 13 }}>Lịch sử nhập/xuất</strong>
            <div className="tb-divider" />
            <div className="filter-group">
              <label>Hàng:</label>
              <select
                value={filterItemId}
                onChange={e => {
                  setPageNumber(1);
                  setFilterItemId(e.target.value ? Number(e.target.value) : "");
                }}
              >
                <option value="">Tất cả</option>
                {stockableList.map(i => (
                  <option key={i.itemId} value={i.itemId}>
                    {i.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Loại:</label>
              <select
                value={filterType}
                onChange={e => {
                  setPageNumber(1);
                  setFilterType((e.target.value || "") as StockMovementType | "");
                }}
              >
                <option value="">Tất cả</option>
                {(Object.keys(MOVEMENT_TYPE_LABELS) as StockMovementType[]).map(t => (
                  <option key={t} value={t}>
                    {MOVEMENT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Từ:</label>
              <input
                type="date"
                value={filterFrom}
                onChange={e => {
                  setPageNumber(1);
                  setFilterFrom(e.target.value);
                }}
              />
            </div>
            <div className="filter-group">
              <label>Đến:</label>
              <input
                type="date"
                value={filterTo}
                onChange={e => {
                  setPageNumber(1);
                  setFilterTo(e.target.value);
                }}
              />
            </div>
          </div>

          {movements.loading && <LoadingBar text="Đang tải sổ kho..." />}
          {movements.isOffline && <OfflineBar onRetry={() => movements.reload()} />}
          {movements.isApiError && (
            <ErrorBar text={movements.error ?? ""} onRetry={() => movements.reload()} />
          )}

          <GridComponent
            key={`mv-${gridVersion}`}
            dataSource={list}
            allowSorting
            allowPaging
            allowFiltering
            filterSettings={{ type: "Menu" }}
            pageSettings={{
              pageSize: PAGE_SIZE,
              currentPage: pageNumber,
              totalRecordsCount: totalCount,
            }}
            actionBegin={(args: { requestType?: string; currentPage?: number }) => {
              if (args.requestType === "paging" && typeof args.currentPage === "number") {
                setPageNumber(args.currentPage);
              }
            }}
            rowDataBound={rowDataBound}
            height="100%"
          >
            <ColumnsDirective>
              <ColumnDirective field="createdDisplay" headerText="Thời gian" width="145" />
              <ColumnDirective field="itemCode" headerText="Mã hàng" width="130" />
              <ColumnDirective field="itemName" headerText="Tên hàng" width="140" />
              <ColumnDirective field="typeLabel" headerText="Loại" width="135" />
              <ColumnDirective field="inputQtyDisplay" headerText="SL nhập" width="95" textAlign="Right" />
              <ColumnDirective field="inputUomDisplay" headerText="ĐV nhập" width="95" />
              <ColumnDirective field="baseQtyDisplay" headerText="SL lưu kho" width="105" textAlign="Right" />
              <ColumnDirective field="baseUomDisplay" headerText="ĐVT lưu kho" width="115" />
              <ColumnDirective field="balanceDisplay" headerText="Tồn sau" width="105" />
              <ColumnDirective field="referenceDisplay" headerText="Tham chiếu" width="105" />
              <ColumnDirective field="reason" headerText="Lý do" width="150" />
              <ColumnDirective field="createdByStaffName" headerText="Người tạo" width="115" />
            </ColumnsDirective>
            <Inject services={[Page, Sort, Filter]} />
          </GridComponent>
        </div>
      </div>

      <StatusBar
        left={
          <>
            <span>{totalCount} dòng</span>
            {filterItemId !== "" && (
              <>
                <span>·</span>
                <span>Lọc: {itemLabel(filterItemId)}</span>
              </>
            )}
            {movements.isOffline && (
              <>
                <span>·</span>
                <span style={{ color: "var(--warning)" }}>offline (mock)</span>
              </>
            )}
          </>
        }
        right={<span>Chỉ đọc — không sửa/xoá</span>}
      />
    </>
  );
}
