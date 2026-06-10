"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ColumnDirective,
  ColumnsDirective,
  Filter,
  GridComponent,
  Inject,
  Page,
  Sort,
  type SortSettingsModel,
} from "@syncfusion/ej2-react-grids";
import { ensureSyncfusionLicense } from "@/lib/syncfusion-license";
import { WinToolbar, TB } from "@/components/ui/WinToolbar";
import { StatusBar } from "@/components/ui/StatusBar";
import { LoadingBar, OfflineBar, ErrorBar } from "@/components/ui/ResourceBars";
import { ChromeIcons } from "@/components/desktop/icons";
import { areaMenuCategoriesApi, areasApi, countersApi } from "@/lib/api/restaurant";
import { categoriesApi } from "@/lib/api/menu";
import { useResource } from "@/lib/http/useResource";
import { formatApiError } from "@/lib/http/formatError";
import { mockAreas, mockCounters } from "@/data/mock";
import type { Category } from "@/types/api/menu";
import type { Area } from "@/types/api/restaurant";

ensureSyncfusionLicense();

const EMPTY_CATEGORIES: Category[] = [];

function parsePathIds(path: string): number[] {
  return path
    .split(";")
    .filter(Boolean)
    .map(Number)
    .filter(n => Number.isFinite(n));
}

function getAncestorIds(cat: Category): number[] {
  return parsePathIds(cat.path).filter(id => id !== cat.id);
}

function getDescendantIds(parent: Category, categories: Category[]): number[] {
  return categories.filter(c => c.id !== parent.id && c.path.startsWith(parent.path)).map(c => c.id);
}

function hasCheckedAncestor(cat: Category, checkedIds: Set<number>): boolean {
  return getAncestorIds(cat).some(id => checkedIds.has(id));
}

/** Drop child ids when an ancestor is already checked — PUT chỉ gửi id cha. */
function normalizeForSave(checkedIds: Set<number>, categories: Category[]): number[] {
  return [...checkedIds].filter(id => {
    const cat = categories.find(c => c.id === id);
    if (!cat) return true;
    return !hasCheckedAncestor(cat, checkedIds);
  });
}

function buildCategoryDfs(categories: Category[]): Category[] {
  const byParent = new Map<number | null, Category[]>();
  for (const c of categories) {
    const key = c.parentId ?? null;
    const arr = byParent.get(key);
    if (arr) arr.push(c);
    else byParent.set(key, [c]);
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
  }
  const out: Category[] = [];
  const walk = (parentId: number | null) => {
    for (const c of byParent.get(parentId) ?? []) {
      out.push(c);
      walk(c.id);
    }
  };
  walk(null);
  return out;
}

export function WinAreaMenuCategory() {
  const areas = useResource(() => areasApi.list(), { fallback: mockAreas });
  const counters = useResource(() => countersApi.list(), { fallback: mockCounters });
  const categories = useResource(() => categoriesApi.list({ isActive: true }));

  const areaList = areas.data ?? [];
  const counterList = counters.data ?? [];
  const categoryList = categories.data ?? EMPTY_CATEGORIES;

  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [counterFilter, setCounterFilter] = useState<number | "ALL">("ALL");
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState("");

  const initSelectedRef = useRef(false);
  useEffect(() => {
    if (!initSelectedRef.current && areaList.length > 0) {
      initSelectedRef.current = true;
      setSelectedAreaId(areaList[0].id);
    }
  }, [areaList]);

  const counterMap = useMemo(
    () => Object.fromEntries(counterList.map(c => [c.id, c])),
    [counterList]
  );

  const dataView = useMemo(() => {
    const filtered =
      counterFilter === "ALL" ? areaList : areaList.filter(a => a.counterId === counterFilter);
    return filtered.map(a => ({
      ...a,
      counterName: counterMap[a.counterId]?.name ?? "",
    }));
  }, [areaList, counterFilter, counterMap]);

  const selectedArea = areaList.find(a => a.id === selectedAreaId) ?? null;

  const categoryDfs = useMemo(() => buildCategoryDfs(categoryList), [categoryList]);

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categoryDfs;
    const q = categorySearch.trim().toLowerCase();
    return categoryDfs.filter(
      c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [categoryDfs, categorySearch]);

  const saveCount = useMemo(
    () => normalizeForSave(checkedIds, categoryList).length,
    [checkedIds, categoryList]
  );

  const loadAssignments = useCallback(async (areaId: number) => {
    setLoadingAssignments(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    const res = await areaMenuCategoriesApi.get(areaId);
    if (res.isSuccess) {
      const loaded = new Set(res.data.categories.map(c => c.categoryId));
      setCheckedIds(
        categoryList.length > 0 ? new Set(normalizeForSave(loaded, categoryList)) : loaded
      );
    } else {
      setCheckedIds(new Set());
      setErrorMsg(formatApiError(res));
    }
    setLoadingAssignments(false);
  }, [categoryList]);

  useEffect(() => {
    if (selectedAreaId === null) {
      setCheckedIds(new Set());
      return;
    }
    void loadAssignments(selectedAreaId);
  }, [selectedAreaId, loadAssignments]);

  useEffect(() => {
    if (!successMsg) return;
    const t = window.setTimeout(() => setSuccessMsg(null), 4000);
    return () => window.clearTimeout(t);
  }, [successMsg]);

  const sortSettings: SortSettingsModel = {
    columns: [{ field: "displayOrder", direction: "Ascending" }],
  };

  const handleRowSelected = (args: { data: Area | Area[] }) => {
    const row = Array.isArray(args.data) ? args.data[0] : args.data;
    if (row?.id === undefined || row.id === selectedAreaId) return;
    setSelectedAreaId(row.id);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const toggleCategory = (categoryId: number) => {
    const cat = categoryList.find(c => c.id === categoryId);
    if (!cat) return;

    setCheckedIds(prev => {
      if (hasCheckedAncestor(cat, prev)) return prev;

      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
        for (const descId of getDescendantIds(cat, categoryList)) {
          next.delete(descId);
        }
      }
      return next;
    });
  };

  const handleClearAll = () => {
    setCheckedIds(new Set());
    setSuccessMsg(null);
  };

  const handleSave = async () => {
    if (selectedAreaId === null) return;
    const categoryIds = normalizeForSave(checkedIds, categoryList);
    if (categoryIds.length === 0) {
      if (!window.confirm("Gỡ hết nhóm menu cho Khu này?")) return;
    }
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    const res = await areaMenuCategoriesApi.replace(selectedAreaId, { categoryIds });
    if (res.isSuccess) {
      setSuccessMsg(`Đã lưu (+${res.data.inserted} -${res.data.deleted})`);
      await loadAssignments(selectedAreaId);
    } else {
      setErrorMsg(formatApiError(res));
    }
    setSaving(false);
  };

  const handleRefresh = () => {
    areas.reload();
    counters.reload();
    categories.reload();
    if (selectedAreaId !== null) void loadAssignments(selectedAreaId);
  };

  const busy = saving || loadingAssignments;

  return (
    <>
      <WinToolbar
        left={
          <>
            <TB
              icon={ChromeIcons.Save}
              onClick={handleSave}
              kind="primary"
              disabled={selectedAreaId === null || busy}
            >
              Lưu
            </TB>
            <TB
              icon={ChromeIcons.Trash}
              onClick={handleClearAll}
              kind="danger"
              disabled={selectedAreaId === null || busy || saveCount === 0}
            >
              Bỏ chọn hết
            </TB>
            <div className="tb-divider" />
            <TB icon={ChromeIcons.Refresh} onClick={handleRefresh} disabled={busy}>
              Làm mới
            </TB>
            <div className="tb-divider" />
            <span className="tb-help">Quầy:</span>
            <select
              value={String(counterFilter)}
              onChange={e =>
                setCounterFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value))
              }
              style={{ padding: "5px 8px", border: "1px solid var(--border-strong)", borderRadius: 4 }}
            >
              <option value="ALL">Tất cả</option>
              {counterList.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </>
        }
        right={<TB icon={ChromeIcons.Help}>Trợ giúp</TB>}
      />

      {(errorMsg || successMsg) && (
        <div
          style={{
            padding: "6px 12px",
            fontSize: 12,
            borderBottom: "1px solid var(--border)",
            background: errorMsg ? "#fef2f2" : "#f0fdf4",
            color: errorMsg ? "var(--danger)" : "var(--positive)",
          }}
        >
          {errorMsg ?? successMsg}
        </div>
      )}

      <div className="win-body" style={{ display: "flex" }}>
        <div
          className="data-list"
          style={{
            width: 420,
            flexShrink: 0,
            borderRight: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              padding: "8px 12px",
              borderBottom: "1px solid var(--border)",
              background: "var(--window-chrome)",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--fg-muted)",
              fontWeight: 500,
            }}
          >
            Danh sách Khu
          </div>
          {areas.loading && <LoadingBar text="Đang tải Khu..." />}
          {areas.isOffline && <OfflineBar onRetry={() => areas.reload()} />}
          {areas.isApiError && (
            <ErrorBar text={areas.error ?? ""} onRetry={() => areas.reload()} />
          )}
          <GridComponent
            dataSource={dataView}
            allowSorting
            allowPaging
            allowFiltering
            filterSettings={{ type: "Menu" }}
            pageSettings={{ pageSize: 20 }}
            sortSettings={sortSettings}
            rowSelected={handleRowSelected}
            selectedRowIndex={
              selectedAreaId !== null ? dataView.findIndex(a => a.id === selectedAreaId) : -1
            }
            height="100%"
          >
            <ColumnsDirective>
              <ColumnDirective field="id" headerText="ID" width="60" textAlign="Right" />
              <ColumnDirective field="name" headerText="Tên Khu" width="160" />
              <ColumnDirective field="counterName" headerText="Quầy" width="140" />
              <ColumnDirective field="displayOrder" headerText="Thứ tự" width="80" textAlign="Right" />
              <ColumnDirective field="isActive" headerText="Kích hoạt" width="100" displayAsCheckBox />
            </ColumnsDirective>
            <Inject services={[Page, Sort, Filter]} />
          </GridComponent>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderBottom: "1px solid var(--border)",
              background: "var(--window-chrome)",
            }}
          >
            <strong style={{ fontSize: 13, color: "var(--fg)" }}>Nhóm menu cho Khu</strong>
            <div className="tb-divider" />
            {selectedArea ? (
              <span style={{ fontSize: 12 }}>
                <span style={{ color: "var(--fg-muted)" }}>Đang cấu hình:</span>{" "}
                <strong>{selectedArea.name}</strong>
                <span style={{ color: "var(--fg-muted)", marginLeft: 8 }}>
                  ({saveCount} nhóm sẽ lưu)
                </span>
              </span>
            ) : (
              <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                Chọn một Khu ở cột trái
              </span>
            )}
            <div style={{ flex: 1 }} />
            <input
              value={categorySearch}
              onChange={e => setCategorySearch(e.target.value)}
              placeholder="Tìm nhóm..."
              disabled={selectedAreaId === null}
              style={{
                padding: "5px 8px",
                border: "1px solid var(--border-strong)",
                borderRadius: 4,
                width: 180,
                fontSize: 12,
              }}
            />
          </div>

          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {categories.loading && <LoadingBar text="Đang tải nhóm hàng..." />}
            {loadingAssignments && <LoadingBar text="Đang tải gán nhóm menu..." />}
            {!selectedAreaId ? (
              <div
                style={{
                  flex: 1,
                  display: "grid",
                  placeItems: "center",
                  color: "var(--fg-muted)",
                  fontSize: 13,
                }}
              >
                Chọn một Khu từ danh sách bên trái để gán Category.
              </div>
            ) : (
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: 8,
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--fg-muted)",
                    marginBottom: 8,
                    padding: "0 4px",
                  }}
                >
                  Tick nhóm cha → lưu chỉ id cha, backend tự bao cả cây con. Con hiện tick mờ = đã
                  gồm qua cha (không tick riêng được). Muốn bán một phần nhánh: bỏ tick cha, rồi
                  tick từng con cần bán.
                </div>
                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    padding: 4,
                    background: "#fafafa",
                  }}
                >
                  {filteredCategories.length === 0 ? (
                    <div style={{ padding: 16, textAlign: "center", color: "var(--fg-muted)", fontSize: 12 }}>
                      Không có nhóm hàng phù hợp.
                    </div>
                  ) : (
                    filteredCategories.map(c => {
                      const directlyChecked = checkedIds.has(c.id);
                      const coveredByAncestor =
                        !directlyChecked && hasCheckedAncestor(c, checkedIds);
                      const rowChecked = directlyChecked || coveredByAncestor;
                      const rowDisabled = busy || coveredByAncestor;

                      return (
                      <label
                        key={c.id}
                        className="category-tree-row"
                        title={
                          coveredByAncestor
                            ? "Đã gồm qua nhóm cha — bỏ tick cha để chọn riêng từng con"
                            : undefined
                        }
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          paddingLeft: 6 + c.level * 14,
                          cursor: rowDisabled ? "not-allowed" : "pointer",
                          opacity: rowDisabled ? 0.55 : 1,
                          color: coveredByAncestor ? "var(--fg-muted)" : "var(--fg)",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={rowChecked}
                          onChange={() => toggleCategory(c.id)}
                          disabled={rowDisabled}
                        />
                        <span className="ico">
                          <ChromeIcons.Folder />
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            color: "var(--fg-muted)",
                          }}
                        >
                          {c.code}
                        </span>
                        <span>{c.name}</span>
                        {coveredByAncestor && (
                          <span style={{ fontSize: 10, color: "var(--fg-faint)" }}>(qua cha)</span>
                        )}
                      </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <StatusBar
        left={
          <>
            <span>{dataView.length} Khu hiển thị</span>
            <span>·</span>
            <span>{categoryList.length} nhóm hàng</span>
            {selectedArea && (
              <>
                <span>·</span>
                <span>
                  {selectedArea.name}: {saveCount} nhóm gán trực tiếp
                </span>
              </>
            )}
            {areas.isOffline && (
              <>
                <span>·</span>
                <span style={{ color: "var(--warning)" }}>offline (mock Khu)</span>
              </>
            )}
          </>
        }
        right={<span>Replace-all — PUT toàn bộ tập categoryIds</span>}
      />
    </>
  );
}
