"use client";

/**
 * WinPricing — Bảng giá bán.
 *
 * UX/Layout follows the reference prototype at
 * `restaurant erp web application/windows-pricing.jsx` (top list + bottom tabs).
 *
 * Components: 100% Syncfusion.
 *   - PriceTable list  → Syncfusion Grid, inline `Normal` edit (Add/Edit/Delete
 *                         via Grid toolbar; actionBegin intercepts save/delete
 *                         to call our REST API).
 *   - Category tree    → Syncfusion TreeViewComponent + nodeTemplate (Lucide
 *                         Folder icon + count badge).
 *   - Variant list     → Syncfusion Grid, inline `Normal` edit for simple
 *                         fields (code/name/isActive). Time/Day/Area scope edit
 *                         + variant creation → Syncfusion DialogComponent
 *                         triggered by a command column / toolbar.
 *   - Item × Variant   → Syncfusion Grid, `Batch` mode with dynamic variant
 *                         columns. cellSaved → local cache + dirty set.
 *                         Toolbar "Lưu giá (N)" bulk upserts per dirty variant.
 *
 * Logic follows the RPOM backend (`docs/RPOM_Pricing_Spec.md`):
 *   - N variants per table (dynamic columns), Time + Day (bitmask) + Area
 *     scope, save via `priceEntriesApi.upsert` (full-snapshot diff).
 *   - Categories scoped to HÀNG BÁN root (BE `?rootCode=HANG_BAN`).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ColumnDirective,
  ColumnsDirective,
  Edit,
  Filter,
  GridComponent,
  Inject,
  Sort,
  Toolbar,
  type EditSettingsModel,
  type ToolbarItems,
  type SortSettingsModel,
} from "@syncfusion/ej2-react-grids";
import {
  TreeViewComponent,
  type FieldsSettingsModel,
} from "@syncfusion/ej2-react-navigations";
import { DialogComponent } from "@syncfusion/ej2-react-popups";
import { ensureSyncfusionLicense } from "@/lib/syncfusion-license";
import { WinToolbar, TB } from "@/components/ui/WinToolbar";
import { StatusBar } from "@/components/ui/StatusBar";
import { LoadingBar } from "@/components/ui/ResourceBars";
import { ChromeIcons } from "@/components/desktop/icons";
import { useResource } from "@/lib/http/useResource";
import { formatApiError } from "@/lib/http/formatError";
import { buildDataManager } from "@/lib/syncfusion/dataManager";
import {
  priceEntriesApi,
  priceTablesApi,
  priceVariantsApi,
  type PriceEntryInput,
  type PriceTableUpsert,
  type PriceVariantUpsert,
} from "@/lib/api/pricing";
import { areasApi } from "@/lib/api/restaurant";
import { categoriesApi, itemsApi } from "@/lib/api/menu";
import type { PriceTable, PriceVariant } from "@/types/api/pricing";
import type { Category } from "@/types/api/menu";
import type { Area } from "@/types/api/restaurant";
import type { BaseResponse } from "@/lib/http/types";

ensureSyncfusionLicense();

const PAGE_SIZE_ITEMS = 500;

type BottomTab = "detail" | "conditions" | "audit";

type AppliedFilter = {
  search: string;
  beginDateFrom: string;
  beginDateTo: string;
};
const EMPTY_FILTER: AppliedFilter = { search: "", beginDateFrom: "", beginDateTo: "" };

// Stable empty references used as fallbacks for resource hooks. Using a fresh
// `[]` literal on every render would break downstream useMemo/useEffect dep
// equality and cause cascade re-renders / re-fetches.
const EMPTY_CATEGORIES: Category[] = [];
const EMPTY_VARIANTS: PriceVariant[] = [];
const EMPTY_AREAS: Area[] = [];

// Module-scope Grid settings — defined once so Syncfusion doesn't see fresh
// object/array references each render and re-mount the entire Grid.
const TABLES_EDIT_SETTINGS: EditSettingsModel = {
  allowAdding: true, allowEditing: true, allowDeleting: true,
  mode: "Normal", newRowPosition: "Top",
};
const VARIANTS_EDIT_SETTINGS: EditSettingsModel = {
  allowAdding: true, allowEditing: true, allowDeleting: true, mode: "Normal",
};
const GRID_TOOLBAR: ToolbarItems[] = ["Add", "Edit", "Delete", "Update", "Cancel"];
const SORT_BY_CODE: SortSettingsModel = { columns: [{ field: "code", direction: "Ascending" }] };

const DAYS: Array<{ bit: number; label: string }> = [
  { bit: 1, label: "T2" },
  { bit: 2, label: "T3" },
  { bit: 4, label: "T4" },
  { bit: 8, label: "T5" },
  { bit: 16, label: "T6" },
  { bit: 32, label: "T7" },
  { bit: 64, label: "CN" },
];

// ---------------- helpers ----------------
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function describeVariantScope(v: PriceVariant, areaLookup: Map<number, string>): string {
  const parts: string[] = [];
  parts.push(
    v.beginTime && v.endTime
      ? `${v.beginTime.slice(0, 5)}–${v.endTime.slice(0, 5)}`
      : "cả ngày"
  );
  parts.push(
    v.dayMask === null
      ? "mọi thứ"
      : DAYS.filter(d => (v.dayMask! & d.bit) !== 0).map(d => d.label).join(",")
  );
  parts.push(
    v.appliesToAllAreas
      ? "mọi khu"
      : v.areaIds.map(id => areaLookup.get(id) ?? `#${id}`).join(", ") || "0 khu"
  );
  return parts.join(" · ");
}

function emptyResource<T>(empty: T): Promise<BaseResponse<T>> {
  return Promise.resolve({ isSuccess: true, data: empty } as BaseResponse<T>);
}

// =================================================================
//                          MAIN COMPONENT
// =================================================================
export function WinPricing() {
  // ---------------- PriceTable ----------------
  // Filter state is split:
  //   `pending*` = what user typed in the filter bar but hasn't submitted yet.
  //   `applied`  = snapshot at the moment user clicked "Tìm kiếm" / pressed Enter.
  //                Only `applied` is in useResource deps → only Enter/click hits BE.
  const [pendingSearch, setPendingSearch] = useState("");
  const [pendingFrom, setPendingFrom] = useState("");
  const [pendingTo, setPendingTo] = useState("");
  const [applied, setApplied] = useState<AppliedFilter>(EMPTY_FILTER);

  const applyFilter = () => {
    setApplied({
      search: pendingSearch.trim(),
      beginDateFrom: pendingFrom,
      beginDateTo: pendingTo,
    });
  };
  const resetFilter = () => {
    setPendingSearch("");
    setPendingFrom("");
    setPendingTo("");
    setApplied(EMPTY_FILTER);
  };

  // Syncfusion DataManager owns the PriceTable list lifecycle: Grid Add/Edit/
  // Delete toolbar buttons trigger the adaptor callbacks below which hit the
  // BE directly; the Grid refreshes itself afterward (no manual `reload` /
  // `key` bump). The DataManager is rebuilt whenever `applied` filters change
  // so the GET request includes the new query string.
  const tablesDataManager = useMemo(
    () => buildDataManager<PriceTable, PriceTableUpsert>({
      list: () => priceTablesApi.list({
        search: applied.search || undefined,
        beginDateFrom: applied.beginDateFrom || undefined,
        beginDateTo: applied.beginDateTo || undefined,
      }),
      create: (body) => priceTablesApi.create(body),
      update: (id, body) => priceTablesApi.update(id, body),
      remove: (id) => priceTablesApi.remove(id),
      toUpsert: (row) => ({
        code: (row.code ?? "").trim(),
        name: (row.name ?? "").trim(),
        description: row.description ?? null,
        beginDate: normalizeDateInput(row.beginDate),
        endDate: normalizeDateInput(row.endDate),
        isActive: row.isActive ?? true,
      }),
    }),
    [applied.search, applied.beginDateFrom, applied.beginDateTo]
  );

  // The Grid drives our cross-pane selection logic via `rowSelected`. We still
  // need to track which table is current to drive the variant Grid below.
  // Read-only cache of the table list for status bar / lookup.
  const [tablesCache, setTablesCache] = useState<PriceTable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const selectedTable = tablesCache.find(t => t.id === selectedTableId) ?? null;

  // Bumped after every variant-side change to remount the variant Grid only
  // (DataManager pattern not yet applied to variants in this refactor).
  const [variantsRev, setVariantsRev] = useState(0);

  // ---------------- PriceVariant ----------------
  const variantsRes = useResource(
    () =>
      selectedTableId === null
        ? emptyResource<PriceVariant[]>([])
        : priceVariantsApi.listByTable(selectedTableId),
    { deps: [selectedTableId] }
  );
  const variants = variantsRes.data ?? EMPTY_VARIANTS;
  const reloadVariants = async () => {
    await variantsRes.reload();
    setVariantsRev(r => r + 1);
  };
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const selectedVariant = variants.find(v => v.id === selectedVariantId) ?? null;
  useEffect(() => { setSelectedVariantId(null); }, [selectedTableId]);

  // ---------------- Bottom tab ----------------
  const [bottomTab, setBottomTab] = useState<BottomTab>("detail");

  // ---------------- Categories (HANG_BAN subtree) ----------------
  const categoriesRes = useResource(() =>
    categoriesApi.list({ isActive: true, rootCode: "HANG_BAN" })
  );
  // Stable empty array when data hasn't loaded — prevents downstream useMemo
  // (treeData) from invalidating on every render and re-mounting the TreeView.
  const categories: Category[] = categoriesRes.data ?? EMPTY_CATEGORIES;
  const salesRoot = useMemo(
    () => categories.find(c => c.code === "HANG_BAN") ?? null,
    [categories]
  );

  const [catId, setCatId] = useState<number | null>(null);

  // TreeView data — root "Tất cả" + children of HANG_BAN treo dưới root ảo
  type TreeNode = { id: string; text: string; count: number; expanded?: boolean; child?: TreeNode[] };
  const treeData = useMemo<TreeNode[]>(() => {
    if (!salesRoot) return [];
    const byParent = new Map<number | null, Category[]>();
    for (const c of categories) {
      if (c.id === salesRoot.id) continue;
      const k = c.parentId === salesRoot.id ? null : c.parentId;
      const arr = byParent.get(k) ?? [];
      arr.push(c);
      byParent.set(k, arr);
    }
    for (const arr of byParent.values()) {
      arr.sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
    }
    const build = (cat: Category): TreeNode => {
      const kids = byParent.get(cat.id) ?? [];
      return {
        id: `c-${cat.id}`,
        text: cat.name,
        count: cat.itemCount,
        expanded: true,
        child: kids.map(build),
      };
    };
    const level1 = (byParent.get(null) ?? []).map(build);
    const allCount = categories.filter(c => c.parentId === salesRoot.id)
      .reduce((sum, c) => sum + c.itemCount, 0);
    return [{ id: "all", text: "Tất cả", count: allCount, expanded: true, child: level1 }];
  }, [categories, salesRoot]);

  // Memoize fields — recreating this object every render makes TreeView think
  // its dataSource changed and re-mount the entire tree (visible as flicker).
  const treeFields: FieldsSettingsModel = useMemo(
    () => ({
      dataSource: treeData as unknown as { [key: string]: object }[],
      id: "id",
      text: "text",
      child: "child" as never,
    }),
    [treeData]
  );

  const handleTreeSelect = useCallback(
    (args: { nodeData: { id: string | number } }) => {
      const raw = String(args.nodeData.id);
      setCatId(raw === "all" ? null : Number(raw.replace("c-", "")));
    },
    []
  );

  // Stable nodeTemplate — passing a fresh function every render causes the
  // tree to recompute templates for every visible node and visually "reload".
  const renderTreeNode = useCallback(
    (d: { text: string; count?: number }) => (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, width: "100%" }}>
        <span style={{ display: "inline-flex", color: "#eab308", width: 12, height: 12 }}>
          <ChromeIcons.Folder />
        </span>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {d.text}
        </span>
        {d.count !== undefined && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-faint)" }}>
            {d.count}
          </span>
        )}
      </span>
    ),
    []
  );

  // ---------------- Items ----------------
  const itemsRes = useResource(
    () =>
      itemsApi.list({
        pageSize: PAGE_SIZE_ITEMS,
        categoryId: catId ?? salesRoot?.id ?? undefined,
      }),
    { deps: [catId, salesRoot?.id] }
  );
  const itemRows = itemsRes.data?.items ?? [];

  // ---------------- Areas ----------------
  const areasRes = useResource(() => areasApi.list());
  const areas: Area[] = areasRes.data ?? EMPTY_AREAS;
  const areaLookup = useMemo(() => new Map(areas.map(a => [a.id, a.name])), [areas]);

  // ---------------- PriceEntry cache + dirty tracking ----------------
  type EntryCell = { price: number; isVatIncluded: boolean };
  type VariantEntries = Map<number, EntryCell>;
  const [entriesCache, setEntriesCache] = useState<Map<number, VariantEntries>>(new Map());
  const [dirtyVariants, setDirtyVariants] = useState<Set<number>>(new Set());

  // Auto-fetch entries for any variant we haven't seen yet, when "Chi tiết" active
  useEffect(() => {
    if (bottomTab !== "detail" || variants.length === 0) return;
    let cancelled = false;
    (async () => {
      const next = new Map(entriesCache);
      let changed = false;
      for (const v of variants) {
        if (next.has(v.id)) continue;
        const res = await priceEntriesApi.list(v.id);
        if (cancelled) return;
        if (res.isSuccess) {
          const m: VariantEntries = new Map();
          for (const e of res.data) m.set(e.itemId, { price: e.price, isVatIncluded: e.isVatIncluded });
          next.set(v.id, m);
          changed = true;
        }
      }
      if (!cancelled && changed) setEntriesCache(next);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bottomTab, variants]);

  // ---------------- Variant scope dialog ----------------
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [variantDraft, setVariantDraft] = useState<VariantDraft | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const openCreateVariant = () => {
    if (!selectedTableId) return;
    setVariantDraft(emptyVariantDraft());
    setErrorMsg(null);
    setVariantDialogOpen(true);
  };
  const openEditVariant = (v: PriceVariant) => {
    setVariantDraft(variantToDraft(v));
    setErrorMsg(null);
    setVariantDialogOpen(true);
  };

  const handleSaveVariant = async () => {
    if (!variantDraft || selectedTableId === null) return;
    const body = draftToVariantUpsert(variantDraft);
    const res = variantDraft.id !== undefined
      ? await priceVariantsApi.update(variantDraft.id, body)
      : await priceVariantsApi.create(selectedTableId, body);
    if (res.isSuccess) {
      await reloadVariants();
      reloadTablesGrid();
      setSelectedVariantId(res.data.id);
      setVariantDialogOpen(false);
    } else {
      setErrorMsg(formatApiError(res));
    }
  };

  // ---------------- Bulk save dirty variant prices ----------------
  const [savingEntries, setSavingEntries] = useState(false);
  const handleSaveAllEntries = async () => {
    if (dirtyVariants.size === 0) return;
    setSavingEntries(true);
    const errors: string[] = [];
    for (const vid of dirtyVariants) {
      const vm = entriesCache.get(vid) ?? new Map();
      const payload: PriceEntryInput[] = Array.from(vm.entries()).map(([itemId, c]) => ({
        itemId, price: c.price, isVatIncluded: c.isVatIncluded,
      }));
      const res = await priceEntriesApi.upsert(vid, payload);
      if (!res.isSuccess) errors.push(`${vid}: ${formatApiError(res)}`);
    }
    if (errors.length > 0) setErrorMsg(`Lỗi lưu giá: ${errors.join("; ")}`);
    else {
      setDirtyVariants(new Set());
      await reloadVariants();
    }
    setSavingEntries(false);
  };

  // ---------------- Tables Grid event handlers ----------------
  // PriceTable Grid is fully managed by DataManager — Add/Edit/Delete toolbar
  // buttons hit the API directly via the adaptor. We only listen for events
  // we need for cross-pane state (row selection, table list cache).
  type GridRequestArgs = {
    requestType?: string;
    action?: "add" | "edit";
    cancel?: boolean;
    data?: PriceTable | PriceTable[];
    rowData?: PriceTable;
  };

  const reloadTablesGrid = () => {
    tablesGridRef.current?.refresh();
  };

  // ---------------- Variant Grid edit handlers ----------------
  const handleVariantsActionBegin = async (args: GridRequestArgs) => {
    if (args.requestType === "save") {
      args.cancel = true;
      const row = (Array.isArray(args.data) ? args.data[0] : args.data) as Partial<PriceVariant> | undefined;
      if (!row || !row.id) return; // only inline edit existing; add → dialog
      const existing = variants.find(v => v.id === row.id);
      if (!existing) return;
      // Preserve scope fields, only update simple fields editable inline
      const body: PriceVariantUpsert = {
        code: (row.code ?? existing.code).trim(),
        name: (row.name ?? existing.name).trim(),
        description: existing.description,
        beginTime: existing.beginTime,
        endTime: existing.endTime,
        dayMask: existing.dayMask,
        appliesToAllAreas: existing.appliesToAllAreas,
        areaIds: existing.areaIds,
        isActive: row.isActive ?? existing.isActive,
      };
      const res = await priceVariantsApi.update(existing.id, body);
      if (res.isSuccess) {
        await reloadVariants();
        variantsGridRef.current?.closeEdit();
      } else {
        setErrorMsg(formatApiError(res));
      }
    } else if (args.requestType === "delete") {
      args.cancel = true;
      const row = (Array.isArray(args.data) ? args.data[0] : args.data) as PriceVariant | undefined;
      if (!row) return;
      if (!window.confirm(`Xoá variant "${row.code} — ${row.name}"?`)) return;
      const res = await priceVariantsApi.remove(row.id);
      if (res.isSuccess) {
        setSelectedVariantId(null);
        await reloadVariants();
        reloadTablesGrid();
      } else {
        setErrorMsg(formatApiError(res));
      }
    } else if (args.requestType === "add") {
      // Grid's "Add" toolbar item — redirect to dialog (variant needs scope)
      args.cancel = true;
      openCreateVariant();
    }
  };

  // ---------------- Pivot Grid (Item × Variant) ----------------
  type PivotRow = { id: number; code: string; name: string; baseUomCode: string } & Record<string, unknown>;
  const pivotRows: PivotRow[] = useMemo(() => {
    return itemRows.map(it => {
      const row: PivotRow = { id: it.id, code: it.code, name: it.name, baseUomCode: it.baseUomCode };
      for (const v of variants) {
        const cell = entriesCache.get(v.id)?.get(it.id);
        row[`p_${v.id}`] = cell?.price ?? null;
        row[`v_${v.id}`] = cell?.isVatIncluded ?? false;
      }
      return row;
    });
  }, [itemRows, variants, entriesCache]);

  type CellSaveArgs = {
    columnName?: string;
    value?: unknown;
    rowData?: PivotRow;
  };
  const handlePivotCellSaved = (args: CellSaveArgs) => {
    if (!args.columnName || !args.rowData) return;
    const m = args.columnName.match(/^p_(\d+)$/);
    if (!m) return;
    const variantId = Number(m[1]);
    const itemId = args.rowData.id;
    const price = Number(args.value);
    if (Number.isNaN(price)) return;
    setEntriesCache(prev => {
      const next = new Map(prev);
      const vm = new Map(next.get(variantId) ?? new Map<number, EntryCell>());
      const existing = vm.get(itemId);
      if (price <= 0) vm.delete(itemId);
      else vm.set(itemId, { price, isVatIncluded: existing?.isVatIncluded ?? false });
      next.set(variantId, vm);
      return next;
    });
    setDirtyVariants(prev => new Set(prev).add(variantId));
  };

  // ---------------- Grid refs ----------------
  const tablesGridRef = useRef<GridComponent | null>(null);
  const variantsGridRef = useRef<GridComponent | null>(null);


  // =================================================================
  //                          RENDER
  // =================================================================
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <WinToolbar
        left={
          <>
            <TB icon={ChromeIcons.Save} kind="primary" onClick={handleSaveAllEntries}
                disabled={dirtyVariants.size === 0 || savingEntries}>
              {savingEntries ? "Đang lưu..." : `Lưu giá (${dirtyVariants.size})`}
            </TB>
            <div className="tb-divider" />
            <TB icon={ChromeIcons.Refresh} onClick={() => { reloadTablesGrid(); reloadVariants(); }}>
              Làm mới
            </TB>
            <TB icon={ChromeIcons.Search}>Tìm kiếm</TB>
            <TB icon={ChromeIcons.Fn}>Chức năng</TB>
            <TB icon={ChromeIcons.Import}>Nhập dữ liệu</TB>
            <TB icon={ChromeIcons.Export}>Xuất dữ liệu</TB>
          </>
        }
        right={<TB icon={ChromeIcons.Help}>Trợ giúp</TB>}
      />

      <div className="win-body" style={{ flexDirection: "column" }}>
        {/* Filter bar — Enter on any input or click "Tìm kiếm" → refetch */}
        <div className="grid-filterbar" onKeyDown={e => { if (e.key === "Enter") applyFilter(); }}>
          <div className="filter-group">
            <label>Mã/Tên:</label>
            <input value={pendingSearch} onChange={e => setPendingSearch(e.target.value)} placeholder="vd: PT_2026" />
          </div>
          <div className="filter-group">
            <label>Từ ngày:</label>
            <input type="date" value={pendingFrom} onChange={e => setPendingFrom(e.target.value)} />
          </div>
          <div className="filter-group">
            <label>Đến ngày:</label>
            <input type="date" value={pendingTo} onChange={e => setPendingTo(e.target.value)} />
          </div>
          <button className="tb-btn primary" onClick={applyFilter}>Tìm kiếm</button>
          <button className="tb-btn" onClick={resetFilter}>Xoá lọc</button>
          <div style={{ flex: 1 }} />
        </div>

        {/* Top — PriceTable list (Syncfusion Grid + DataManager — Add/Edit/
            Delete go through the adaptor, hitting BE directly). */}
        <div style={{ flex: "0 0 38%", display: "flex", flexDirection: "column", minHeight: 0, borderBottom: "1px solid var(--border)" }}>
          <GridComponent
            ref={(g: GridComponent | null) => { tablesGridRef.current = g; }}
            dataSource={tablesDataManager}
            allowSorting
            sortSettings={SORT_BY_CODE}
            editSettings={TABLES_EDIT_SETTINGS}
            toolbar={GRID_TOOLBAR}
            dataBound={() => {
              const grid = tablesGridRef.current;
              if (!grid) return;
              const ds = (grid as unknown as { currentViewData?: PriceTable[] }).currentViewData ?? [];
              setTablesCache(ds);
              // Auto-select first row on initial load.
              if (selectedTableId === null && ds.length > 0) {
                grid.selectRow(0);
              }
            }}
            rowSelected={(args: { data: PriceTable | PriceTable[] }) => {
              const r = Array.isArray(args.data) ? args.data[0] : args.data;
              if (r?.id !== undefined && r.id !== selectedTableId) setSelectedTableId(r.id);
            }}
            height="100%"
          >
            <ColumnsDirective>
              <ColumnDirective field="id" headerText="ID" width="60" isPrimaryKey={true} visible={false} />
              <ColumnDirective field="code" headerText="Mã" width="110" validationRules={{ required: true }} />
              <ColumnDirective field="name" headerText="Tên" width="220" validationRules={{ required: true }} />
              <ColumnDirective field="beginDate" headerText="Ngày áp dụng" width="130" editType="datepickeredit"
                template={(r: PriceTable) => <span className="mute">{fmtDate(r.beginDate)}</span>} />
              <ColumnDirective field="endDate" headerText="Ngày hết hạn" width="130" editType="datepickeredit"
                template={(r: PriceTable) => <span className="mute">{fmtDate(r.endDate)}</span>} />
              <ColumnDirective field="createdAt" headerText="Ngày tạo" width="130" allowEditing={false}
                template={(r: PriceTable) => <span className="mute">{fmtDate(r.createdAt)}</span>} />
              <ColumnDirective field="updatedAt" headerText="Ngày cập nhật" width="130" allowEditing={false}
                template={(r: PriceTable) => <span className="mute">{fmtDate(r.updatedAt)}</span>} />
              <ColumnDirective field="variantCount" headerText="Variant" width="80" textAlign="Right" allowEditing={false} />
              <ColumnDirective field="isActive" headerText="Đang dùng" width="100" displayAsCheckBox editType="booleanedit" type="boolean" />
            </ColumnsDirective>
            <Inject services={[Sort, Edit, Toolbar]} />
          </GridComponent>
        </div>

        {/* Bottom — tabs */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div className="cc-tabs">
            <button className={`cc-tab ${bottomTab === "detail" ? "active" : ""}`} onClick={() => { setBottomTab("detail"); setErrorMsg(null); }}>
              Chi tiết giá
            </button>
            <button className={`cc-tab ${bottomTab === "conditions" ? "active" : ""}`} onClick={() => { setBottomTab("conditions"); setErrorMsg(null); }}>
              Điều kiện áp dụng ({variants.length})
            </button>
            <button className={`cc-tab ${bottomTab === "audit" ? "active" : ""}`} onClick={() => { setBottomTab("audit"); setErrorMsg(null); }}>
              Lịch sử thao tác
            </button>
            <div style={{ flex: 1 }} />
            {selectedTable && (
              <div style={{ display: "flex", gap: 8, padding: "4px 12px", alignItems: "center", fontSize: 12 }}>
                <span className="mute">Đang xem:</span>
                <strong>{selectedTable.name}</strong>
                <span className="badge">{variants.length} variant</span>
              </div>
            )}
          </div>

          {errorMsg && (
            <div style={{ padding: 8, background: "#fef2f2", color: "var(--danger)", fontSize: 12, borderBottom: "1px solid #fecaca", display: "flex", justifyContent: "space-between" }}>
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg(null)} style={{ background: "transparent", border: 0, color: "inherit", cursor: "pointer" }}>×</button>
            </div>
          )}

          {/* Tab: Chi tiết giá */}
          {bottomTab === "detail" && (
            <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
              <div style={{ width: 240, display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)", background: "var(--window-bg)", overflow: "auto" }}>
                {categoriesRes.loading && <LoadingBar text="Đang tải nhóm..." />}
                <TreeViewComponent
                  key={`tree-${categories.length}`}
                  fields={treeFields}
                  nodeSelected={handleTreeSelect}
                  nodeTemplate={renderTreeNode}
                />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                <div className="grid-filterbar" style={{ borderTop: "none" }}>
                  <span className="tb-help">
                    Sửa giá trực tiếp · {itemRows.length} Item · {variants.length} variant
                    {dirtyVariants.size > 0 && ` · ${dirtyVariants.size} variant chưa lưu`}
                  </span>
                </div>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  {variants.length === 0 ? (
                    <div className="empty">
                      <div>
                        <div className="em-title">Bảng giá chưa có variant</div>
                        <div>Sang tab "Điều kiện áp dụng" để tạo variant đầu tiên (gợi ý: V_DEFAULT — catch-all).</div>
                      </div>
                    </div>
                  ) : (
                    <GridComponent
                      key={`pivot-${selectedTableId}-${variants.map(v => v.id).join(",")}`}
                      dataSource={pivotRows}
                      editSettings={{ allowEditing: true, mode: "Batch", newRowPosition: "Bottom" }}
                      cellSaved={handlePivotCellSaved}
                      allowSorting
                      allowFiltering
                      filterSettings={{ type: "Menu" }}
                      height="100%"
                    >
                      <ColumnsDirective>
                        <ColumnDirective field="id" headerText="ID" width="60" isPrimaryKey={true} visible={false} />
                        <ColumnDirective field="code" headerText="Mã hàng" width="120" allowEditing={false} />
                        <ColumnDirective field="name" headerText="Tên hàng" width="240" allowEditing={false} />
                        <ColumnDirective field="baseUomCode" headerText="ĐVT" width="70" allowEditing={false} />
                        {variants.map(v => (
                          <ColumnDirective
                            key={v.id}
                            field={`p_${v.id}`}
                            headerText={`${v.code} (spec ${v.specificity})`}
                            width="130"
                            textAlign="Right"
                            editType="numericedit"
                            edit={{ params: { min: 0, step: 1000, format: "n0" } }}
                          />
                        ))}
                      </ColumnsDirective>
                      <Inject services={[Sort, Filter, Edit]} />
                    </GridComponent>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Điều kiện áp dụng */}
          {bottomTab === "conditions" && (
            <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
              <div style={{ flex: "0 0 56%", display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)", minHeight: 0 }}>
                {variantsRes.loading && selectedTableId !== null && <LoadingBar text="Đang tải variant..." />}
                <GridComponent
                  key={`variants-${selectedTableId ?? "none"}-rev-${variantsRev}`}
                  ref={(g: GridComponent | null) => { variantsGridRef.current = g; }}
                  dataSource={variants}
                  editSettings={VARIANTS_EDIT_SETTINGS}
                  toolbar={GRID_TOOLBAR}
                  actionBegin={handleVariantsActionBegin}
                  rowSelected={(args: { data: PriceVariant | PriceVariant[] }) => {
                    const r = Array.isArray(args.data) ? args.data[0] : args.data;
                    if (r?.id !== undefined && r.id !== selectedVariantId) setSelectedVariantId(r.id);
                  }}
                  selectedRowIndex={selectedVariantId !== null ? variants.findIndex(v => v.id === selectedVariantId) : -1}
                  height="100%"
                >
                  <ColumnsDirective>
                    <ColumnDirective field="id" headerText="ID" width="60" isPrimaryKey={true} visible={false} />
                    <ColumnDirective field="code" headerText="Code" width="110" validationRules={{ required: true }} />
                    <ColumnDirective field="name" headerText="Tên" width="160" validationRules={{ required: true }} />
                    <ColumnDirective field="specificity" headerText="Spec" width="60" textAlign="Right" allowEditing={false} />
                    <ColumnDirective
                      headerText="Điều kiện"
                      width="220"
                      allowEditing={false}
                      template={(r: PriceVariant) => (
                        <span className="mute" style={{ fontSize: 11 }}>{describeVariantScope(r, areaLookup)}</span>
                      )}
                    />
                    <ColumnDirective field="entryCount" headerText="Entry" width="70" textAlign="Right" allowEditing={false} />
                    <ColumnDirective field="isActive" headerText="Dùng" width="70" displayAsCheckBox editType="booleanedit" type="boolean" />
                    <ColumnDirective
                      headerText=""
                      width="100"
                      allowEditing={false}
                      template={(r: PriceVariant) => (
                        <button
                          className="tb-btn"
                          style={{ padding: "2px 8px", fontSize: 11 }}
                          onClick={(e) => { e.stopPropagation(); openEditVariant(r); }}
                          title="Chỉnh Time/Day/Area"
                        >
                          ⚙ Cấu hình
                        </button>
                      )}
                    />
                  </ColumnsDirective>
                  <Inject services={[Edit, Toolbar]} />
                </GridComponent>
              </div>
              <div style={{ flex: 1, padding: 16, overflow: "auto" }}>
                {selectedVariant ? (
                  <div style={{ fontSize: 13 }}>
                    <h4 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
                      {selectedVariant.code} — {selectedVariant.name}
                      <span className="badge">spec {selectedVariant.specificity}</span>
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "8px 12px", fontSize: 12 }}>
                      <div className="mute">Khung giờ</div>
                      <div>{selectedVariant.beginTime && selectedVariant.endTime
                        ? `${selectedVariant.beginTime.slice(0, 5)} – ${selectedVariant.endTime.slice(0, 5)} (end exclusive)`
                        : "Cả ngày (NULL)"}</div>

                      <div className="mute">Thứ trong tuần</div>
                      <div>{selectedVariant.dayMask === null
                        ? "Mọi ngày (NULL)"
                        : DAYS.filter(d => (selectedVariant.dayMask! & d.bit) !== 0).map(d => (
                            <span key={d.bit} className="chip" style={{ marginRight: 4 }}>{d.label}</span>
                          ))}</div>

                      <div className="mute">Phạm vi khu</div>
                      <div>{selectedVariant.appliesToAllAreas
                        ? "Mọi khu"
                        : selectedVariant.areaIds.map(id => (
                            <span key={id} className="chip" style={{ marginRight: 4 }}>{areaLookup.get(id) ?? `#${id}`}</span>
                          ))}</div>

                      <div className="mute">Trạng thái</div>
                      <div>{selectedVariant.isActive ? "Đang dùng" : "Tạm tắt"}</div>

                      <div className="mute">Entry giá</div>
                      <div>{selectedVariant.entryCount}</div>
                    </div>
                    <div style={{ marginTop: 16 }}>
                      <button className="tb-btn primary" onClick={() => openEditVariant(selectedVariant)}>
                        Chỉnh điều kiện
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="empty">
                    <div>
                      <div className="em-title">Chọn 1 variant</div>
                      <div>Click vào dòng bên trái để xem điều kiện áp dụng.</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab: Audit */}
          {bottomTab === "audit" && (
            <div className="empty">
              <div>
                <div className="em-title">Lịch sử thao tác</div>
                <div>Module Audit log API sẽ được mở ở giai đoạn sau.</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <StatusBar
        left={
          <>
            <span>{tablesCache.length} bảng giá</span>
            {dirtyVariants.size > 0 && (
              <>
                <span>·</span>
                <span style={{ color: "var(--warning)" }}>{dirtyVariants.size} variant chưa lưu giá</span>
              </>
            )}
          </>
        }
        right={selectedTable ? <span>{selectedTable.code} · {variants.length} variant</span> : null}
      />

      <VariantScopeDialog
        visible={variantDialogOpen}
        draft={variantDraft}
        setDraft={setVariantDraft}
        areas={areas}
        errorMsg={errorMsg}
        onClose={() => { setVariantDialogOpen(false); setErrorMsg(null); }}
        onSave={handleSaveVariant}
      />
    </div>
  );
}

// =================================================================
//                   Variant scope dialog (Syncfusion)
// =================================================================
type VariantDraft = {
  id?: number;
  code: string;
  name: string;
  description: string | null;
  timeAllDay: boolean;
  beginTime: string;
  endTime: string;
  dayAllDays: boolean;
  dayBits: number[];
  appliesToAllAreas: boolean;
  areaIds: number[];
  isActive: boolean;
};

function emptyVariantDraft(): VariantDraft {
  return {
    code: "", name: "", description: null,
    timeAllDay: true, beginTime: "14:00", endTime: "17:00",
    dayAllDays: true, dayBits: [],
    appliesToAllAreas: true, areaIds: [],
    isActive: true,
  };
}

function variantToDraft(v: PriceVariant): VariantDraft {
  return {
    id: v.id, code: v.code, name: v.name, description: v.description,
    timeAllDay: v.beginTime === null && v.endTime === null,
    beginTime: v.beginTime?.slice(0, 5) ?? "14:00",
    endTime: v.endTime?.slice(0, 5) ?? "17:00",
    dayAllDays: v.dayMask === null,
    dayBits: v.dayMask === null ? [] : DAYS.filter(d => (v.dayMask! & d.bit) !== 0).map(d => d.bit),
    appliesToAllAreas: v.appliesToAllAreas,
    areaIds: v.areaIds,
    isActive: v.isActive,
  };
}

function draftToVariantUpsert(d: VariantDraft): PriceVariantUpsert {
  return {
    code: d.code.trim(),
    name: d.name.trim(),
    description: d.description ?? null,
    beginTime: d.timeAllDay ? null : `${d.beginTime}:00`,
    endTime: d.timeAllDay ? null : `${d.endTime}:00`,
    dayMask: d.dayAllDays ? null : d.dayBits.reduce((acc, b) => acc | b, 0),
    appliesToAllAreas: d.appliesToAllAreas,
    areaIds: d.appliesToAllAreas ? [] : d.areaIds,
    isActive: d.isActive,
  };
}

function VariantScopeDialog({
  visible, draft, setDraft, areas, errorMsg, onClose, onSave,
}: {
  visible: boolean;
  draft: VariantDraft | null;
  setDraft: (d: VariantDraft) => void;
  areas: Area[];
  errorMsg: string | null;
  onClose: () => void;
  onSave: () => void;
}) {
  if (!draft) return null;
  return (
    <DialogComponent
      visible={visible}
      header={draft.id !== undefined ? `Sửa variant — ${draft.code || "(mới)"}` : "Tạo variant mới"}
      width="560px"
      showCloseIcon
      isModal
      close={onClose}
    >
      <div style={{ display: "grid", gap: 10, padding: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
          <div>
            <label style={{ fontSize: 11, color: "var(--fg-muted)" }}>Code *</label>
            <input value={draft.code} onChange={e => setDraft({ ...draft, code: e.target.value })}
              placeholder="vd: V_HH_VIP" style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--fg-muted)" }}>Tên *</label>
            <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}
              placeholder="vd: Happy Hour VIP" style={{ width: "100%" }} />
          </div>
        </div>

        <fieldset style={{ border: "1px solid var(--border)", padding: 8 }}>
          <legend style={{ fontSize: 12 }}>Khung giờ</legend>
          <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" className="cbx" checked={draft.timeAllDay} onChange={e => setDraft({ ...draft, timeAllDay: e.target.checked })} />
            Cả ngày (NULL)
          </label>
          {!draft.timeAllDay && (
            <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
              <input type="time" value={draft.beginTime} onChange={e => setDraft({ ...draft, beginTime: e.target.value })} />
              <span>—</span>
              <input type="time" value={draft.endTime} onChange={e => setDraft({ ...draft, endTime: e.target.value })} />
              <span className="mute" style={{ fontSize: 11 }}>(end exclusive)</span>
            </div>
          )}
        </fieldset>

        <fieldset style={{ border: "1px solid var(--border)", padding: 8 }}>
          <legend style={{ fontSize: 12 }}>Thứ trong tuần</legend>
          <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" className="cbx" checked={draft.dayAllDays} onChange={e => setDraft({ ...draft, dayAllDays: e.target.checked })} />
            Mọi ngày (NULL)
          </label>
          {!draft.dayAllDays && (
            <div className="chip-row" style={{ marginTop: 6 }}>
              {DAYS.map(d => {
                const checked = draft.dayBits.includes(d.bit);
                return (
                  <label key={d.bit} className="chip" style={{ cursor: "pointer", background: checked ? "#dbeafe" : undefined }}>
                    <input type="checkbox" className="cbx" checked={checked}
                      onChange={e => {
                        const next = e.target.checked
                          ? [...draft.dayBits, d.bit]
                          : draft.dayBits.filter(b => b !== d.bit);
                        setDraft({ ...draft, dayBits: next });
                      }} />
                    {d.label}
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>

        <fieldset style={{ border: "1px solid var(--border)", padding: 8 }}>
          <legend style={{ fontSize: 12 }}>Phạm vi khu</legend>
          <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" className="cbx" checked={draft.appliesToAllAreas} onChange={e => setDraft({ ...draft, appliesToAllAreas: e.target.checked })} />
            Mọi khu
          </label>
          {!draft.appliesToAllAreas && (
            <div className="chip-row" style={{ marginTop: 6 }}>
              {areas.map(a => {
                const checked = draft.areaIds.includes(a.id);
                return (
                  <label key={a.id} className="chip" style={{ cursor: "pointer", background: checked ? "#dbeafe" : undefined }}>
                    <input type="checkbox" className="cbx" checked={checked}
                      onChange={e => {
                        const next = e.target.checked
                          ? [...draft.areaIds, a.id]
                          : draft.areaIds.filter(id => id !== a.id);
                        setDraft({ ...draft, areaIds: next });
                      }} />
                    {a.name}
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>

        <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" className="cbx" checked={draft.isActive} onChange={e => setDraft({ ...draft, isActive: e.target.checked })} />
          Đang dùng
        </label>

        {errorMsg && <div style={{ color: "var(--danger)", fontSize: 12 }}>{errorMsg}</div>}

        {/* Footer buttons rendered as plain HTML inside dialog body — using
            DialogComponent's `buttons` prop captures stale closures from the
            first render so "Lưu" would never see the latest draft state. */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
          <button className="tb-btn" onClick={onClose}>Huỷ</button>
          <button className="tb-btn primary" onClick={onSave}>Lưu</button>
        </div>
      </div>
    </DialogComponent>
  );
}

// =================================================================
// helpers
// =================================================================
function normalizeDateInput(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "string") {
    // datepickeredit may emit "YYYY-MM-DD" or full ISO.
    return v.slice(0, 10);
  }
  if (v instanceof Date) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
  }
  return null;
}
