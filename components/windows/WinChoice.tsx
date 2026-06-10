"use client";

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
  type SortSettingsModel,
  type ToolbarItems,
} from "@syncfusion/ej2-react-grids";
import { ensureSyncfusionLicense } from "@/lib/syncfusion-license";
import { WinToolbar, TB } from "@/components/ui/WinToolbar";
import { StatusBar } from "@/components/ui/StatusBar";
import { LoadingBar, ErrorBar } from "@/components/ui/ResourceBars";
import { ChromeIcons } from "@/components/desktop/icons";
import { ItemPickerDialog } from "@/components/menu/ItemPickerDialog";
import { choiceCategoriesApi } from "@/lib/api/choice";
import { categoriesApi } from "@/lib/api/menu";
import { useResource } from "@/lib/http/useResource";
import { formatApiError } from "@/lib/http/formatError";
import { findHangBanCategoryId } from "@/lib/menu/hangBan";
import type {
  ChoiceCategoryListRow,
  ChoiceCategoryModifier,
  ChoiceCategoryModifierInput,
  ChoiceCategoryUpsert,
} from "@/types/api/choice";
import type { ItemListRow } from "@/types/api/menu";

ensureSyncfusionLicense();

type ModifierDraft = ChoiceCategoryModifier & { _key: string };
type ActiveFilter = "ALL" | "ACTIVE" | "INACTIVE";

type GridRequestArgs = {
  requestType?: string;
  action?: "add" | "edit";
  cancel?: boolean;
  data?: ChoiceCategoryListRow | ChoiceCategoryListRow[];
  rowData?: ChoiceCategoryListRow;
};

const CC_EDIT_SETTINGS: EditSettingsModel = {
  allowAdding: true,
  allowEditing: true,
  allowDeleting: true,
  mode: "Normal",
  newRowPosition: "Top",
};

const GRID_TOOLBAR: ToolbarItems[] = ["Edit", "Delete", "Update", "Cancel"];

function newModifierKey() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function toModifierDraft(m: ChoiceCategoryModifier): ModifierDraft {
  return { ...m, _key: newModifierKey() };
}

function rowToUpsert(row: Partial<ChoiceCategoryListRow>): ChoiceCategoryUpsert | null {
  const name = (row.name ?? "").trim();
  if (!name) return null;
  const maxRaw = row.maxChoice;
  return {
    name,
    note: row.note?.trim() || null,
    minChoice: Number(row.minChoice ?? 0),
    maxChoice:
      maxRaw === null || maxRaw === undefined || (maxRaw as unknown) === ""
        ? null
        : Number(maxRaw),
    displayOrder: Number(row.displayOrder ?? 0),
    isActive: row.isActive ?? true,
  };
}

export function WinChoice() {
  const categoriesRes = useResource(() => categoriesApi.list({ isActive: true }));
  const allCategories = categoriesRes.data ?? [];
  const hangBanCategoryId = useMemo(
    () => findHangBanCategoryId(allCategories),
    [allCategories]
  );
  const hangBanCategories = useMemo(() => {
    if (hangBanCategoryId === null) return [];
    return allCategories.filter(
      c => c.id === hangBanCategoryId || c.path.startsWith(`${hangBanCategoryId};`)
    );
  }, [allCategories, hangBanCategoryId]);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("ALL");
  const listQuery = useMemo(() => {
    const q: { search?: string; isActive?: boolean } = {};
    if (search.trim()) q.search = search.trim();
    if (activeFilter === "ACTIVE") q.isActive = true;
    if (activeFilter === "INACTIVE") q.isActive = false;
    return q;
  }, [search, activeFilter]);

  const listRes = useResource(() => choiceCategoriesApi.list(listQuery), {
    deps: [listQuery.search, listQuery.isActive],
  });
  const list = listRes.data ?? [];

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedName, setSelectedName] = useState("");
  const [modifiers, setModifiers] = useState<ModifierDraft[]>([]);
  const [selectedModKeys, setSelectedModKeys] = useState<Set<string>>(new Set());
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingModifiers, setSavingModifiers] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [itemPickerOpen, setItemPickerOpen] = useState(false);

  const excludeItemIds = useMemo(() => modifiers.map(m => m.itemId), [modifiers]);

  const ccGridRef = useRef<GridComponent | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (!initRef.current && list.length > 0 && selectedId === null) {
      initRef.current = true;
      setSelectedId(list[0].id);
      setSelectedName(list[0].name);
    }
  }, [list, selectedId]);

  useEffect(() => {
    if (!successMsg) return;
    const t = window.setTimeout(() => setSuccessMsg(null), 4000);
    return () => window.clearTimeout(t);
  }, [successMsg]);

  const loadDetail = useCallback(async (id: number) => {
    setLoadingDetail(true);
    setErrorMsg(null);
    const res = await choiceCategoriesApi.get(id);
    if (res.isSuccess) {
      setModifiers(res.data.modifiers.map(toModifierDraft));
      setSelectedModKeys(new Set());
      setSelectedName(res.data.name);
    } else {
      setModifiers([]);
      setErrorMsg(formatApiError(res));
    }
    setLoadingDetail(false);
  }, []);

  useEffect(() => {
    if (selectedId === null) {
      setModifiers([]);
      return;
    }
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const handleRowSelected = (args: { data: ChoiceCategoryListRow | ChoiceCategoryListRow[] }) => {
    const row = Array.isArray(args.data) ? args.data[0] : args.data;
    if (!row?.id || row.id === selectedId) return;
    setSelectedId(row.id);
    setSelectedName(row.name);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleCreateInline = () => {
    const grid = ccGridRef.current;
    if (!grid) {
      setErrorMsg("Grid chưa sẵn sàng — thử Làm mới.");
      return;
    }

    // Syncfusion skips addRecord when a row is already being edited.
    if (grid.isEdit) {
      grid.closeEdit();
    }

    setSelectedId(null);
    setSelectedName("");
    setModifiers([]);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Must call addRecord() WITHOUT data — passing data triggers immediate save, not inline edit.
    grid.addRecord();
  };

  const handleCcActionBegin = async (args: GridRequestArgs) => {
    if (args.requestType === "save") {
      args.cancel = true;
      const row = (Array.isArray(args.data) ? args.data[0] : args.data) as
        | Partial<ChoiceCategoryListRow>
        | undefined;
      if (!row) return;

      const body = rowToUpsert(row);
      if (!body) {
        setErrorMsg("Tên loại lựa chọn không được để trống.");
        return;
      }

      if (args.action === "add") {
        const res = await choiceCategoriesApi.create(body);
        if (res.isSuccess) {
          await listRes.reload();
          setSelectedId(res.data.id);
          setSelectedName(res.data.name);
          setSuccessMsg(`Đã tạo "${res.data.name}"`);
          ccGridRef.current?.closeEdit();
        } else {
          setErrorMsg(formatApiError(res));
          // Keep edit row open so user can fix validation errors.
        }
        return;
      }

      if (args.action === "edit" && row.id && row.id > 0) {
        const res = await choiceCategoriesApi.update(row.id, body);
        if (res.isSuccess) {
          await listRes.reload();
          setSelectedName(res.data.name);
          setSuccessMsg(`Đã lưu "${res.data.name}"`);
          ccGridRef.current?.closeEdit();
        } else {
          setErrorMsg(formatApiError(res));
        }
      }
    } else if (args.requestType === "delete") {
      args.cancel = true;
      const row = (Array.isArray(args.data) ? args.data[0] : args.data) as
        | ChoiceCategoryListRow
        | undefined;
      if (!row?.id) return;
      if (!window.confirm(`Xoá loại lựa chọn "${row.name}"?`)) return;

      const res = await choiceCategoriesApi.remove(row.id);
      if (res.isSuccess) {
        if (selectedId === row.id) {
          setSelectedId(null);
          setSelectedName("");
          setModifiers([]);
        }
        setSuccessMsg("Đã xoá loại lựa chọn");
        await listRes.reload();
      } else {
        setErrorMsg(formatApiError(res));
      }
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedId === null) return;
    const row = list.find(c => c.id === selectedId);
    if (!row) return;
    if (!window.confirm(`Xoá loại lựa chọn "${row.name}"?`)) return;

    const res = await choiceCategoriesApi.remove(selectedId);
    if (res.isSuccess) {
      setSelectedId(null);
      setSelectedName("");
      setModifiers([]);
      setSuccessMsg("Đã xoá loại lựa chọn");
      await listRes.reload();
    } else {
      setErrorMsg(formatApiError(res));
    }
  };

  const saveModifiers = async () => {
    if (selectedId === null) return;

    const payload: ChoiceCategoryModifierInput[] = modifiers.map((m, idx) => ({
      itemId: m.itemId,
      extraPrice: m.extraPrice,
      minPerModifier: m.minPerModifier,
      maxPerModifier: m.maxPerModifier,
      displayOrder: m.displayOrder ?? idx + 1,
      isActive: m.isActive,
    }));

    const itemIds = payload.map(p => p.itemId);
    if (new Set(itemIds).size !== itemIds.length) {
      setErrorMsg("Mỗi modifier phải là một Item khác nhau (itemId trùng).");
      return;
    }

    setSavingModifiers(true);
    setErrorMsg(null);
    const res = await choiceCategoriesApi.replaceModifiers(selectedId, { modifiers: payload });
    if (res.isSuccess) {
      setSuccessMsg(
        `Đã lưu modifier (+${res.data.inserted} ~${res.data.updated} -${res.data.deleted})`
      );
      await loadDetail(selectedId);
      await listRes.reload();
    } else {
      setErrorMsg(formatApiError(res));
    }
    setSavingModifiers(false);
  };

  const handleRefresh = () => {
    listRes.reload();
    categoriesRes.reload();
    if (selectedId !== null) void loadDetail(selectedId);
  };

  const addModifier = (item: ItemListRow) => {
    if (modifiers.some(m => m.itemId === item.id)) {
      setErrorMsg("Item này đã có trong danh sách modifier.");
      return;
    }
    setModifiers(prev => [
      ...prev,
      {
        _key: newModifierKey(),
        itemId: item.id,
        itemCode: item.code,
        itemName: item.name,
        extraPrice: 0,
        minPerModifier: 0,
        maxPerModifier: 1,
        displayOrder: prev.length + 1,
        isActive: true,
      },
    ]);
    setItemPickerOpen(false);
    setErrorMsg(null);
  };

  const removeSelectedModifiers = () => {
    if (selectedModKeys.size === 0) return;
    setModifiers(prev => prev.filter(m => !selectedModKeys.has(m._key)));
    setSelectedModKeys(new Set());
  };

  const updateModifier = (key: string, patch: Partial<ModifierDraft>) => {
    setModifiers(prev => prev.map(m => (m._key === key ? { ...m, ...patch } : m)));
  };

  const toggleModSelect = (key: string) => {
    setSelectedModKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const busy = savingModifiers || loadingDetail;
  const sortSettings: SortSettingsModel = {
    columns: [{ field: "displayOrder", direction: "Ascending" }],
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
      <WinToolbar
        left={
          <>
            <TB icon={ChromeIcons.Plus} onClick={handleCreateInline} disabled={listRes.loading}>
              Tạo mới
            </TB>
            <TB
              icon={ChromeIcons.Trash}
              onClick={handleDeleteSelected}
              kind="danger"
              disabled={selectedId === null || busy}
            >
              Xoá
            </TB>
            <div className="tb-divider" />
            <TB icon={ChromeIcons.Refresh} onClick={handleRefresh} disabled={busy}>
              Làm mới
            </TB>
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

      <div className="win-body" style={{ flex: 1, minHeight: 0, flexDirection: "column" }}>
        <div className="grid-area vsplit-half">
          <div className="vtop">
            <div className="grid-filterbar">
              <strong style={{ fontSize: 13 }}>Danh sách Loại lựa chọn</strong>
              <div className="tb-divider" />
              <div className="filter-group">
                <label>Tìm:</label>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Tên loại lựa chọn..."
                />
              </div>
              <div className="filter-group">
                <label>Kích hoạt:</label>
                <select
                  value={activeFilter}
                  onChange={e => setActiveFilter(e.target.value as ActiveFilter)}
                >
                  <option value="ALL">Tất cả</option>
                  <option value="ACTIVE">Đang dùng</option>
                  <option value="INACTIVE">Tạm tắt</option>
                </select>
              </div>
              <div style={{ flex: 1 }} />
              <span className="tb-help">{list.length} loại</span>
            </div>
            {listRes.loading && <LoadingBar text="Đang tải..." />}
            {listRes.isApiError && (
              <ErrorBar text={listRes.error ?? ""} onRetry={() => listRes.reload()} />
            )}
            <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
            <GridComponent
              ref={ccGridRef}
              dataSource={list}
              allowSorting
              allowFiltering
              filterSettings={{ type: "Menu" }}
              sortSettings={sortSettings}
              editSettings={CC_EDIT_SETTINGS}
              toolbar={GRID_TOOLBAR}
              actionBegin={handleCcActionBegin}
              rowSelected={handleRowSelected}
              selectedRowIndex={
                selectedId !== null ? list.findIndex(c => c.id === selectedId) : -1
              }
              height="100%"
            >
              <ColumnsDirective>
                <ColumnDirective
                  field="id"
                  headerText="ID"
                  width="60"
                  isPrimaryKey
                  visible={false}
                />
                <ColumnDirective
                  field="name"
                  headerText="Tên"
                  width="180"
                  validationRules={{ required: true }}
                />
                <ColumnDirective field="note" headerText="Ghi chú" width="200" />
                <ColumnDirective
                  field="minChoice"
                  headerText="Min"
                  width="70"
                  textAlign="Right"
                  defaultValue={0}
                  editType="numericedit"
                  edit={{ params: { min: 0, format: "n0" } }}
                />
                <ColumnDirective
                  field="maxChoice"
                  headerText="Max"
                  width="70"
                  textAlign="Right"
                  editType="numericedit"
                  edit={{ params: { min: 0, format: "n0" } }}
                />
                <ColumnDirective
                  field="displayOrder"
                  headerText="Thứ tự"
                  width="80"
                  textAlign="Right"
                  defaultValue={list.length + 1}
                  editType="numericedit"
                  edit={{ params: { min: 0, format: "n0" } }}
                />
                <ColumnDirective
                  field="modifierCount"
                  headerText="Modifier"
                  width="90"
                  textAlign="Right"
                  allowEditing={false}
                />
                <ColumnDirective
                  field="isActive"
                  headerText="Kích hoạt"
                  width="100"
                  displayAsCheckBox
                  defaultValue={true}
                  editType="booleanedit"
                  type="boolean"
                />
              </ColumnsDirective>
              <Inject services={[Sort, Filter, Edit, Toolbar]} />
            </GridComponent>
            </div>
          </div>

          <div className="vbot">
            <div className="cc-tabs">
              <button type="button" className="cc-tab active">
                Modifiers ({modifiers.length})
              </button>
              <div style={{ flex: 1 }} />
              {selectedId !== null ? (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    padding: "4px 12px",
                    alignItems: "center",
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: "var(--fg-muted)" }}>Loại lựa chọn:</span>
                  <strong>{selectedName}</strong>
                </div>
              ) : (
                <span style={{ padding: "4px 12px", fontSize: 12, color: "var(--fg-muted)" }}>
                  Chọn hoặc tạo loại lựa chọn ở trên
                </span>
              )}
            </div>

            {selectedId === null ? (
              <div className="empty" style={{ flex: 1, minHeight: 0 }}>
                <div>
                  <div className="em-title">Chưa chọn loại lựa chọn</div>
                  <div>Tạo mới inline trên grid (Update để lưu), rồi cấu hình modifier ở đây.</div>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div className="grid-filterbar" style={{ borderTop: "none", flexShrink: 0 }}>
                  <TB
                    icon={ChromeIcons.Save}
                    onClick={saveModifiers}
                    kind="primary"
                    disabled={busy || savingModifiers}
                  >
                    {savingModifiers ? "Đang lưu..." : "Lưu modifier"}
                  </TB>
                  <div className="tb-divider" />
                  <TB
                    icon={ChromeIcons.Plus}
                    onClick={() => setItemPickerOpen(true)}
                    disabled={busy || hangBanCategoryId === null}
                  >
                    Thêm dòng
                  </TB>
                  <TB
                    icon={ChromeIcons.Trash}
                    onClick={removeSelectedModifiers}
                    kind="danger"
                    disabled={busy || selectedModKeys.size === 0}
                  >
                    Xoá dòng
                  </TB>
                </div>
                {loadingDetail && <LoadingBar text="Đang tải modifier..." />}
                <div className="dgrid-wrap" style={{ flex: 1, minHeight: 0 }}>
                  <table className="dgrid">
                    <thead>
                      <tr>
                        <th style={{ width: 36 }} />
                        <th className="stt">#</th>
                        <th>Món (Item)</th>
                        <th style={{ width: 120 }}>Giá thêm</th>
                        <th style={{ width: 70 }}>Min</th>
                        <th style={{ width: 70 }}>Max</th>
                        <th style={{ width: 88 }}>Thứ tự</th>
                        <th style={{ width: 88 }}>Kích hoạt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modifiers.map((m, idx) => (
                        <tr key={m._key}>
                          <td>
                            <input
                              type="checkbox"
                              className="cbx"
                              checked={selectedModKeys.has(m._key)}
                              onChange={() => toggleModSelect(m._key)}
                              disabled={busy}
                            />
                          </td>
                          <td className="stt">{idx + 1}</td>
                          <td>
                            <strong>{m.itemName}</strong>
                            <span className="mute" style={{ marginLeft: 8, fontSize: 11 }}>
                              {m.itemCode}
                            </span>
                          </td>
                          <td className="num">
                            <input
                              type="number"
                              min={0}
                              step={1000}
                              value={m.extraPrice}
                              onChange={e =>
                                updateModifier(m._key, { extraPrice: Number(e.target.value) })
                              }
                              disabled={busy}
                              style={{ width: 100, textAlign: "right" }}
                            />
                          </td>
                          <td className="num">
                            <input
                              type="number"
                              min={0}
                              value={m.minPerModifier}
                              onChange={e =>
                                updateModifier(m._key, { minPerModifier: Number(e.target.value) })
                              }
                              disabled={busy}
                              style={{ width: 56, textAlign: "right" }}
                            />
                          </td>
                          <td className="num">
                            <input
                              type="number"
                              min={1}
                              value={m.maxPerModifier}
                              onChange={e =>
                                updateModifier(m._key, { maxPerModifier: Number(e.target.value) })
                              }
                              disabled={busy}
                              style={{ width: 56, textAlign: "right" }}
                            />
                          </td>
                          <td className="num">
                            <input
                              type="number"
                              min={0}
                              value={m.displayOrder}
                              onChange={e =>
                                updateModifier(m._key, { displayOrder: Number(e.target.value) })
                              }
                              disabled={busy}
                              style={{ width: 56, textAlign: "right" }}
                            />
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <input
                              type="checkbox"
                              className="cbx"
                              checked={m.isActive}
                              onChange={e =>
                                updateModifier(m._key, { isActive: e.target.checked })
                              }
                              disabled={busy}
                            />
                          </td>
                        </tr>
                      ))}
                      {modifiers.length === 0 && !loadingDetail && (
                        <tr>
                          <td colSpan={8} style={{ textAlign: "center", color: "var(--fg-muted)" }}>
                            Chưa có modifier.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <StatusBar
        left={
          <>
            <span>{list.length} loại lựa chọn</span>
            <span>·</span>
            <span>{list.filter(c => c.isActive).length} đang dùng</span>
          </>
        }
      />

      <ItemPickerDialog
        visible={itemPickerOpen}
        title="Tìm kiếm mặt hàng"
        hangBanCategoryId={hangBanCategoryId}
        categories={hangBanCategories}
        excludeItemIds={excludeItemIds}
        onClose={() => setItemPickerOpen(false)}
        onSelect={addModifier}
      />
    </div>
  );
}
