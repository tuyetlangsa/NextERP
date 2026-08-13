"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ColumnDirective,
  ColumnsDirective,
  GridComponent,
  Inject,
  Page,
  Sort,
} from "@syncfusion/ej2-react-grids";
import {
  TreeViewComponent,
  type FieldsSettingsModel,
} from "@syncfusion/ej2-react-navigations";
import { ensureSyncfusionLicense } from "@/lib/syncfusion-license";
import { WinToolbar, TB } from "@/components/ui/WinToolbar";
import { StatusBar } from "@/components/ui/StatusBar";
import { LoadingBar, OfflineBar, ErrorBar } from "@/components/ui/ResourceBars";
import { ChromeIcons } from "@/components/desktop/icons";
import { ItemBomTab } from "@/components/inventory/ItemBomTab";
import { categoriesApi, itemsApi } from "@/lib/api/menu";
import { useResource } from "@/lib/http/useResource";
import { formatApiError } from "@/lib/http/formatError";
import type { Category, RecipeItemRow } from "@/types/api/menu";

ensureSyncfusionLicense();

/** Which side of the recipe flag the item grid is showing. */
type FlagTab = "with" | "without";

const PAGE_SIZE = 200;

export function WinRecipe() {
  const [flagTab, setFlagTab] = useState<FlagTab>("with");
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const categories = useResource(() => categoriesApi.list());
  const categoryList = useMemo<Category[]>(() => categories.data ?? [], [categories.data]);

  const items = useResource(
    () =>
      itemsApi.listRecipes({
        hasRecipe: flagTab === "with",
        categoryId: categoryFilter ?? undefined,
        search: search.trim() || undefined,
        pageNumber: 1,
        pageSize: PAGE_SIZE,
      }),
    { deps: [flagTab, categoryFilter, search] }
  );

  const rows = useMemo<RecipeItemRow[]>(() => items.data?.items ?? [], [items.data]);

  const selectedItem = useMemo(
    () => rows.find(r => r.id === selectedItemId) ?? null,
    [rows, selectedItemId]
  );

  /** Dishes whose flag is on but that would deduct nothing when sold. */
  const emptyRecipeCount = useMemo(
    () => (flagTab === "with" ? rows.filter(r => r.activeBomLineCount === 0).length : 0),
    [rows, flagTab]
  );

  // ── Category tree ─────────────────────────────────────────────────────────
  const treeData = useMemo(() => {
    type Node = { id: string; text: string; expanded?: boolean; child?: Node[] };
    const byParent = new Map<number | null, Category[]>();
    for (const c of categoryList) {
      const k = c.parentId ?? null;
      const arr = byParent.get(k);
      if (arr) arr.push(c);
      else byParent.set(k, [c]);
    }
    for (const arr of byParent.values()) {
      arr.sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
    }
    const build = (cat: Category): Node => ({
      id: `c-${cat.id}`,
      text: cat.name,
      expanded: true,
      child: (byParent.get(cat.id) ?? []).map(build),
    });
    const roots = (byParent.get(null) ?? []).map(build);
    return [
      { id: "all", text: "Tất cả nhóm", expanded: true, child: roots },
    ] as unknown as { [key: string]: object }[];
  }, [categoryList]);

  const treeFields = useMemo<FieldsSettingsModel>(
    () => ({ dataSource: treeData, id: "id", text: "text", child: "child" as never }),
    [treeData]
  );

  const renderTreeNode = useCallback(
    (data: { text: string }) => (
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span className="ico">
          <ChromeIcons.Folder />
        </span>
        <span style={{ flex: 1 }}>{data.text}</span>
      </span>
    ),
    []
  );

  const handleTreeSelect = (args: { nodeData: { id: string | number } }) => {
    const raw = String(args.nodeData.id);
    setSelectedItemId(null);
    setActionError(null);
    if (raw === "all") {
      setCategoryFilter(null);
      return;
    }
    const id = Number(raw.replace(/^c-/, ""));
    setCategoryFilter(Number.isFinite(id) ? id : null);
  };

  // ── Grid ──────────────────────────────────────────────────────────────────
  const handleRowSelected = (args: { data: RecipeItemRow | RecipeItemRow[] }) => {
    const row = Array.isArray(args.data) ? args.data[0] : args.data;
    if (row?.id) {
      setSelectedItemId(row.id);
      setActionError(null);
    }
  };

  const switchTab = (tab: FlagTab) => {
    setFlagTab(tab);
    setSelectedItemId(null);
    setActionError(null);
  };

  /**
   *  The item moves to the other tab on success, so drop the selection and reload
   *  rather than trying to patch the row in place.
   */
  const setRecipeFlag = async (hasRecipe: boolean) => {
    if (!selectedItem) return;
    setBusy(true);
    setActionError(null);
    const res = await itemsApi.setRecipeFlag(selectedItem.id, hasRecipe);
    setBusy(false);
    if (!res.isSuccess) {
      setActionError(formatApiError(res));
      return;
    }
    setSelectedItemId(null);
    items.reload();
  };

  const warnTemplate = useCallback(
    (r: RecipeItemRow) =>
      r.hasRecipe && r.activeBomLineCount === 0 ? (
        <span title="Đã bật công thức nhưng chưa có nguyên liệu nào — bán ra sẽ không trừ kho.">
          ⚠
        </span>
      ) : (
        <span />
      ),
    []
  );

  const stationTemplate = useCallback(
    (r: RecipeItemRow) =>
      r.kitchenStationName ? (
        <span>{r.kitchenStationName}</span>
      ) : (
        <span style={{ color: "var(--fg-muted)" }}>—</span>
      ),
    []
  );

  return (
    <>
      <WinToolbar
        left={
          <>
            {flagTab === "without" ? (
              <TB
                icon={ChromeIcons.Plus}
                onClick={() => void setRecipeFlag(true)}
                disabled={!selectedItem || busy}
              >
                Thêm công thức
              </TB>
            ) : (
              <TB
                icon={ChromeIcons.Trash}
                onClick={() => void setRecipeFlag(false)}
                disabled={!selectedItem || busy}
              >
                Bỏ công thức
              </TB>
            )}
            <div className="tb-divider" />
            <TB icon={ChromeIcons.Refresh} onClick={() => items.reload()}>
              Làm mới
            </TB>
          </>
        }
        right={
          <input
            className="tb-search"
            placeholder="🔍 Tìm mã / tên món"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: "4px 8px",
              border: "1px solid var(--border-strong)",
              borderRadius: 4,
              fontSize: 12,
              width: 220,
            }}
          />
        }
      />

      <div className="win-body">
        <div className="user-tree" style={{ width: 240 }}>
          <div className="tree-section-title">Nhóm hàng</div>
          {categories.loading && <LoadingBar text="Đang tải nhóm hàng..." />}
          {categories.isApiError && (
            <ErrorBar text={categories.error ?? ""} onRetry={() => categories.reload()} />
          )}
          {!categories.loading && (
            <TreeViewComponent
              key={`cat-tree-${categoryList.length}`}
              fields={treeFields}
              nodeTemplate={renderTreeNode}
              nodeSelected={handleTreeSelect}
              nodeClicked={handleTreeSelect}
            />
          )}
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div className="cc-tabs">
            <button
              className={`cc-tab${flagTab === "with" ? " active" : ""}`}
              onClick={() => switchTab("with")}
            >
              Có công thức
            </button>
            <button
              className={`cc-tab${flagTab === "without" ? " active" : ""}`}
              onClick={() => switchTab("without")}
            >
              Chưa có công thức
            </button>
          </div>

          {items.loading && <LoadingBar text="Đang tải danh sách món..." />}
          {items.isOffline && <OfflineBar onRetry={() => items.reload()} />}
          {items.isApiError && (
            <ErrorBar text={items.error ?? ""} onRetry={() => items.reload()} />
          )}
          {actionError && (
            <ErrorBar text={actionError} onRetry={() => setActionError(null)} />
          )}

          <div style={{ flex: "0 0 46%", overflow: "hidden", minHeight: 140 }}>
            <GridComponent
              dataSource={rows}
              allowSorting
              allowPaging
              pageSettings={{ pageSize: 25 }}
              rowSelected={handleRowSelected}
              selectedRowIndex={
                selectedItemId !== null ? rows.findIndex(r => r.id === selectedItemId) : -1
              }
              height="100%"
            >
              <ColumnsDirective>
                <ColumnDirective field="code" headerText="Mã món" width="130" />
                <ColumnDirective field="name" headerText="Tên món" width="220" />
                <ColumnDirective field="baseUomCode" headerText="ĐVT" width="80" />
                <ColumnDirective
                  field="kitchenStationName"
                  headerText="Bếp"
                  width="140"
                  template={stationTemplate}
                />
                {flagTab === "with" ? (
                  <ColumnDirective
                    field="activeBomLineCount"
                    headerText="SL nguyên liệu"
                    width="120"
                    textAlign="Right"
                  />
                ) : (
                  <ColumnDirective
                    field="primaryCategoryName"
                    headerText="Nhóm chính"
                    width="160"
                  />
                )}
                <ColumnDirective
                  field="isActive"
                  headerText="Kích hoạt"
                  width="90"
                  displayAsCheckBox
                />
                {flagTab === "with" ? (
                  <ColumnDirective
                    headerText=""
                    width="46"
                    textAlign="Center"
                    template={warnTemplate}
                  />
                ) : (
                  <></>
                )}
              </ColumnsDirective>
              <Inject services={[Page, Sort]} />
            </GridComponent>
          </div>

          {/* auto: the ingredient grid keeps a 240px floor, so on a short window
              it is taller than this pane and the overflow has to be reachable. */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflow: "auto",
              borderTop: "1px solid var(--border-strong)",
            }}
          >
            {flagTab === "without" ? (
              <div style={{ padding: 24, color: "var(--fg-muted)", fontSize: 13 }}>
                Danh sách này chỉ gồm món đủ điều kiện đặt công thức. Chọn một món rồi bấm
                <strong> Thêm công thức</strong> để bật, sau đó khai báo nguyên liệu ở tab
                <strong> Có công thức</strong>.
              </div>
            ) : !selectedItem ? (
              <div style={{ padding: 24, color: "var(--fg-muted)", fontSize: 13 }}>
                Chọn một món ở danh sách trên để khai báo nguyên liệu cho công thức của món đó.
              </div>
            ) : (
              <div style={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    padding: "10px 12px",
                    borderBottom: "1px solid var(--border)",
                    fontSize: 13,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {selectedItem.code} — {selectedItem.name}
                  <span style={{ marginLeft: 8, fontWeight: 400, color: "var(--fg-muted)" }}>
                    (định lượng cho 1 {selectedItem.baseUomName})
                  </span>
                  {selectedItem.activeBomLineCount === 0 && (
                    <span style={{ marginLeft: 8, fontWeight: 400, color: "var(--danger)" }}>
                      ⚠ chưa có nguyên liệu — bán ra sẽ không trừ kho
                    </span>
                  )}
                </div>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <ItemBomTab key={selectedItem.id} itemId={selectedItem.id} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <StatusBar
        left={
          <>
            <span>{rows.length} món</span>
            <span>· {flagTab === "with" ? "có công thức" : "chưa có công thức"}</span>
            {emptyRecipeCount > 0 && (
              <>
                <span>·</span>
                <span style={{ color: "var(--danger)" }}>
                  {emptyRecipeCount} món thiếu nguyên liệu
                </span>
              </>
            )}
          </>
        }
        right={
          <span>
            {flagTab === "with"
              ? "Chọn món để sửa công thức"
              : "Chọn món để bật công thức"}
          </span>
        }
      />
    </>
  );
}
