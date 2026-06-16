"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ColumnDirective,
  ColumnsDirective,
  Filter,
  GridComponent,
  Inject,
  Sort,
  type SelectionSettingsModel,
} from "@syncfusion/ej2-react-grids";
import { DialogComponent } from "@syncfusion/ej2-react-popups";
import { ensureSyncfusionLicense } from "@/lib/syncfusion-license";
import { WinToolbar, TB } from "@/components/ui/WinToolbar";
import { Field } from "@/components/ui/DetailPanel";
import { StatusBar } from "@/components/ui/StatusBar";
import { LoadingBar, ErrorBar } from "@/components/ui/ResourceBars";
import { ChromeIcons } from "@/components/desktop/icons";
import { ItemPickerDialog } from "@/components/menu/ItemPickerDialog";
import { choiceCategoriesApi } from "@/lib/api/choice";
import { categoriesApi, itemsApi } from "@/lib/api/menu";
import { setMenuApi } from "@/lib/api/setMenu";
import { useResource } from "@/lib/http/useResource";
import { formatApiError } from "@/lib/http/formatError";
import { buildCategoryTreeNodes, findHangBanCategoryId } from "@/lib/menu/hangBan";
import type { ChoiceCategoryListRow } from "@/types/api/choice";
import type { Category, ItemListRow } from "@/types/api/menu";
import type { SetMenuDetailInput } from "@/types/api/setMenu";

ensureSyncfusionLicense();

const PAGE_SIZE = 100;

type ItemTab = "all" | "setmenu" | "not";
type ComponentDraft = {
  _key: string;
  componentItemId: number;
  componentItemCode: string;
  componentItemName: string;
  quantity: number;
  isFixed: boolean;
  displayOrder: number;
};
type ChoiceCatDraft = {
  _key: string;
  choiceCategoryId: number;
  choiceCategoryName: string;
  displayOrder: number;
};

function newKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function isDescendantCategory(cat: Category, ancestorId: number): boolean {
  return cat.id === ancestorId || cat.path.startsWith(`${ancestorId};`);
}

export function WinSetMenu() {
  const categoriesRes = useResource(() => categoriesApi.list({ isActive: true }));
  const choiceCatsRes = useResource(() => choiceCategoriesApi.list({ isActive: true }));
  const allCategories = categoriesRes.data ?? [];
  const hangBanRootId = useMemo(() => findHangBanCategoryId(allCategories), [allCategories]);
  const hangBanCategories = useMemo(
    () =>
      hangBanRootId === null
        ? []
        : allCategories.filter(c => isDescendantCategory(c, hangBanRootId)),
    [allCategories, hangBanRootId]
  );

  const [categoryFilterId, setCategoryFilterId] = useState<number | null>(null);
  const [itemTab, setItemTab] = useState<ItemTab>("all");
  const [search, setSearch] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [itemRows, setItemRows] = useState<ItemListRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsLoading, setItemsLoading] = useState(false);

  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<ItemListRow | null>(null);
  const [setMenuKnown, setSetMenuKnown] = useState<Map<number, boolean>>(new Map());

  const [description, setDescription] = useState<string | null>(null);
  const [components, setComponents] = useState<ComponentDraft[]>([]);
  const [choiceCats, setChoiceCats] = useState<ChoiceCatDraft[]>([]);
  const [isSetMenuDraft, setIsSetMenuDraft] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);

  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [compPickerOpen, setCompPickerOpen] = useState(false);
  const [ccPickerOpen, setCcPickerOpen] = useState(false);
  const [selectedCompKeys, setSelectedCompKeys] = useState<Set<string>>(new Set());
  const [selectedCcKeys, setSelectedCcKeys] = useState<Set<string>>(new Set());

  const loadSeqRef = useRef(0);
  const skipRowSelectRef = useRef(false);

  const compPickerExcludeIds = useMemo(
    () => [
      ...(selectedItem ? [selectedItem.id] : []),
      ...components.map(c => c.componentItemId),
    ],
    [selectedItem, components]
  );

  const { byParent } = useMemo(
    () => buildCategoryTreeNodes(hangBanCategories, hangBanRootId),
    [hangBanCategories, hangBanRootId]
  );

  useEffect(() => {
    if (hangBanRootId !== null) {
      setExpanded(prev => new Set(prev).add(hangBanRootId));
      setCategoryFilterId(prev => prev ?? hangBanRootId);
    }
  }, [hangBanRootId]);

  useEffect(() => {
    if (!successMsg) return;
    const t = window.setTimeout(() => setSuccessMsg(null), 4000);
    return () => window.clearTimeout(t);
  }, [successMsg]);

  const effectiveCategoryId = categoryFilterId ?? hangBanRootId;

  useEffect(() => {
    if (effectiveCategoryId === null) {
      setItemRows([]);
      setTotalCount(0);
      return;
    }
    let cancelled = false;
    (async () => {
      setItemsLoading(true);
      const res = await itemsApi.list({
        categoryId: effectiveCategoryId,
        isActive: true,
        search: search.trim() || undefined,
        pageNumber,
        pageSize: PAGE_SIZE,
      });
      if (cancelled) return;
      if (res.isSuccess) {
        setItemRows(res.data.items);
        setTotalCount(res.data.totalCount);
      } else {
        setItemRows([]);
        setTotalCount(0);
        setErrorMsg(formatApiError(res));
      }
      setItemsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveCategoryId, search, pageNumber]);

  const filteredItems = useMemo(() => {
    if (itemTab === "all") return itemRows;
    return itemRows.filter(row => {
      const known = setMenuKnown.get(row.id);
      const isSet = known ?? row.isSetMenu;
      if (itemTab === "setmenu") return isSet === true;
      return isSet !== true;
    });
  }, [itemRows, itemTab, setMenuKnown]);

  /** Grid rows carry a derived checkbox value so Syncfusion repaints when draft changes. */
  const gridItems = useMemo(
    () =>
      filteredItems.map(row => ({
        ...row,
        setMenuChecked:
          row.id === selectedItemId
            ? isSetMenuDraft
            : !!(setMenuKnown.get(row.id) ?? row.isSetMenu),
      })),
    [filteredItems, selectedItemId, isSetMenuDraft, setMenuKnown]
  );

  const loadSetMenuConfig = useCallback(async (item: ItemListRow) => {
    const seq = ++loadSeqRef.current;
    setLoadingConfig(true);
    setErrorMsg(null);
    setSelectedItem(item);
    setSelectedItemId(item.id);

    const res = await setMenuApi.get(item.id);
    if (seq !== loadSeqRef.current) return;

    if (res.isSuccess) {
      setIsSetMenuDraft(true);
      setSetMenuKnown(prev => new Map(prev).set(item.id, true));
      setDescription(res.data.description);
      const comps: ComponentDraft[] = [];
      const ccs: ChoiceCatDraft[] = [];
      for (const d of res.data.details) {
        if (d.detailType === "COMPONENT" && d.componentItemId) {
          comps.push({
            _key: newKey("c"),
            componentItemId: d.componentItemId,
            componentItemCode: "",
            componentItemName: d.componentItemName ?? `#${d.componentItemId}`,
            quantity: d.quantity ?? 1,
            isFixed: d.isFixed ?? false,
            displayOrder: d.displayOrder,
          });
        } else if (d.detailType === "CHOICE_CATEGORY" && d.choiceCategoryId) {
          ccs.push({
            _key: newKey("cc"),
            choiceCategoryId: d.choiceCategoryId,
            choiceCategoryName: d.choiceCategoryName ?? `#${d.choiceCategoryId}`,
            displayOrder: d.displayOrder,
          });
        }
      }
      setComponents(comps);
      setChoiceCats(ccs);
    } else if (res.title === "SetMenu.NotASetMenu") {
      setIsSetMenuDraft(false);
      setSetMenuKnown(prev => new Map(prev).set(item.id, false));
      setDescription(null);
      setComponents([]);
      setChoiceCats([]);
    } else {
      setErrorMsg(formatApiError(res));
      setIsSetMenuDraft(false);
      setDescription(null);
      setComponents([]);
      setChoiceCats([]);
    }
    if (seq === loadSeqRef.current) setLoadingConfig(false);
  }, []);

  const handleItemSelect = (args: { data: ItemListRow | ItemListRow[] }) => {
    if (skipRowSelectRef.current) return;
    const row = Array.isArray(args.data) ? args.data[0] : args.data;
    if (!row?.id || row.id === selectedItemId) return;
    void loadSetMenuConfig(row);
  };

  const handleSetMenuDraftToggle = (item: ItemListRow, checked: boolean) => {
    // Checkbox sits inside a grid row — block the rowSelected handler that would
    // fire loadSetMenuConfig and overwrite the draft we are about to set.
    skipRowSelectRef.current = true;
    window.setTimeout(() => {
      skipRowSelectRef.current = false;
    }, 200);

    const switching = item.id !== selectedItemId;
    if (switching) {
      setSelectedItem(item);
      setSelectedItemId(item.id);
    }

    // Apply draft immediately so Lưu sees the user's intent.
    setIsSetMenuDraft(checked);

    if (switching) {
      const wasSet = !!(setMenuKnown.get(item.id) ?? item.isSetMenu);
      if (checked && wasSet) {
        void loadSetMenuConfig(item);
      } else {
        loadSeqRef.current += 1;
        setLoadingConfig(false);
        setDescription(null);
        setComponents([]);
        setChoiceCats([]);
      }
    }
  };

  const buildDetailsPayload = (): SetMenuDetailInput[] => {
    const compDetails: SetMenuDetailInput[] = components.map(c => ({
      detailType: "COMPONENT",
      componentItemId: c.componentItemId,
      quantity: c.quantity,
      isFixed: c.isFixed,
      displayOrder: c.displayOrder,
    }));
    const ccDetails: SetMenuDetailInput[] = choiceCats.map(c => ({
      detailType: "CHOICE_CATEGORY",
      choiceCategoryId: c.choiceCategoryId,
      displayOrder: c.displayOrder,
    }));
    return [...compDetails, ...ccDetails].sort((a, b) => a.displayOrder - b.displayOrder);
  };

  const handleSave = async () => {
    if (!selectedItem) return;
    setSaving(true);
    setErrorMsg(null);

    const wasSetMenu = setMenuKnown.get(selectedItem.id) ?? selectedItem.isSetMenu;

    if (!isSetMenuDraft) {
      if (!wasSetMenu) {
        setSuccessMsg("Không có thay đổi.");
        setSaving(false);
        return;
      }
      const res = await setMenuApi.remove(selectedItem.id);
      if (res.isSuccess) {
        setIsSetMenuDraft(false);
        setSetMenuKnown(prev => new Map(prev).set(selectedItem.id, false));
        setDescription(null);
        setComponents([]);
        setChoiceCats([]);
        setSuccessMsg(`Đã gỡ Set Menu khỏi "${selectedItem.name}".`);
      } else {
        setErrorMsg(formatApiError(res));
      }
      setSaving(false);
      return;
    }

    const res = await setMenuApi.upsert(selectedItem.id, {
      description: description?.trim() || null,
      details: buildDetailsPayload(),
    });
    if (res.isSuccess) {
      setSetMenuKnown(prev => new Map(prev).set(selectedItem.id, true));
      setSuccessMsg(`Đã lưu Set Menu (${res.data.detailCount} dòng cấu hình)`);
      await loadSetMenuConfig(selectedItem);
    } else {
      setErrorMsg(formatApiError(res));
    }
    setSaving(false);
  };

  const addComponent = (item: ItemListRow) => {
    if (!selectedItem || item.id === selectedItem.id) {
      setErrorMsg("Component không thể là chính món Set Menu.");
      return;
    }
    if (components.some(c => c.componentItemId === item.id)) return;
    setComponents(prev => [
      ...prev,
      {
        _key: newKey("c"),
        componentItemId: item.id,
        componentItemCode: item.code,
        componentItemName: item.name,
        quantity: 1,
        isFixed: true,
        displayOrder: prev.length + choiceCats.length + 1,
      },
    ]);
    setCompPickerOpen(false);
  };

  const addChoiceCategory = (cc: ChoiceCategoryListRow) => {
    if (choiceCats.some(c => c.choiceCategoryId === cc.id)) return;
    setChoiceCats(prev => [
      ...prev,
      {
        _key: newKey("cc"),
        choiceCategoryId: cc.id,
        choiceCategoryName: cc.name,
        displayOrder: components.length + prev.length + 1,
      },
    ]);
    setCcPickerOpen(false);
  };

  const renderTree = (parentId: number | null, depth = 0): React.ReactNode => {
    const nodes = byParent.get(parentId) ?? [];
    return nodes.map(cat => {
      const open = expanded.has(cat.id);
      const hasKids = (byParent.get(cat.id) ?? []).length > 0;
      return (
        <div key={cat.id}>
          <div
            className={`tree-node${categoryFilterId === cat.id ? " selected" : ""}`}
            style={{ paddingLeft: 6 + depth * 10 }}
            onClick={() => {
              setCategoryFilterId(cat.id);
              setPageNumber(1);
            }}
          >
            <span
              className={`tree-caret${hasKids ? (open ? " open" : "") : " empty"}`}
              onClick={e => {
                e.stopPropagation();
                if (!hasKids) return;
                setExpanded(prev => {
                  const n = new Set(prev);
                  if (n.has(cat.id)) n.delete(cat.id);
                  else n.add(cat.id);
                  return n;
                });
              }}
            >
              <ChromeIcons.ChevronRight />
            </span>
            <span className="ico">
              <ChromeIcons.Folder />
            </span>
            <span className="name">{cat.name}</span>
          </div>
          {open && hasKids && renderTree(cat.id, depth + 1)}
        </div>
      );
    });
  };

  const busy = saving || loadingConfig;
  const selectionSettings: SelectionSettingsModel = useMemo(
    () => ({ type: "Single", mode: "Row", persistSelection: true }),
    []
  );
  const choiceList = choiceCatsRes.data ?? [];
  const setMenuCount = [...setMenuKnown.values()].filter(Boolean).length;

  return (
    <>
      <WinToolbar
        left={
          <>
            <TB icon={ChromeIcons.Save} onClick={handleSave} kind="primary" disabled={!selectedItem || busy}>
              {saving ? "Đang lưu..." : "Lưu"}
            </TB>
            <div className="tb-divider" />
            <TB
              icon={ChromeIcons.Refresh}
              onClick={() => {
                categoriesRes.reload();
                choiceCatsRes.reload();
                if (selectedItem) void loadSetMenuConfig(selectedItem);
              }}
              disabled={busy}
            >
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

      <div className="win-body">
        <div className="user-tree">
          <div className="tree-section-title">Nhóm Hàng bán</div>
          {hangBanRootId === null ? (
            <div style={{ padding: 12, fontSize: 12, color: "var(--fg-muted)" }}>Không tìm thấy HANG_BAN</div>
          ) : (
            <>
              <div
                className={`tree-node${categoryFilterId === hangBanRootId ? " selected" : ""}`}
                style={{ paddingLeft: 8 }}
                onClick={() => {
                  setCategoryFilterId(hangBanRootId);
                  setPageNumber(1);
                }}
              >
                <span className="tree-caret empty">
                  <ChromeIcons.ChevronRight />
                </span>
                <span className="ico">
                  <ChromeIcons.Folder />
                </span>
                <span className="name">
                  <strong>Tất cả Hàng bán</strong>
                </span>
              </div>
              <div className="tree">{renderTree(hangBanRootId, 1)}</div>
            </>
          )}
        </div>

        <div className="grid-area vsplit">
          <div className="vtop" style={{ display: "flex", flexDirection: "column" }}>
            <div className="cc-tabs">
              <button
                type="button"
                className={`cc-tab${itemTab === "all" ? " active" : ""}`}
                onClick={() => setItemTab("all")}
              >
                Tất cả ({itemRows.length})
              </button>
              <button
                type="button"
                className={`cc-tab${itemTab === "setmenu" ? " active" : ""}`}
                onClick={() => setItemTab("setmenu")}
              >
                Đã là Set Menu ({setMenuCount})
              </button>
              <button
                type="button"
                className={`cc-tab${itemTab === "not" ? " active" : ""}`}
                onClick={() => setItemTab("not")}
              >
                Chưa cấu hình
              </button>
              <div style={{ flex: 1 }} />
              <input
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPageNumber(1);
                }}
                placeholder="Tên / mã hàng..."
                style={{
                  margin: "4px 12px",
                  padding: "5px 8px",
                  border: "1px solid var(--border-strong)",
                  borderRadius: 4,
                  width: 180,
                }}
              />
            </div>
            {itemsLoading && <LoadingBar text="Đang tải món..." />}
            <GridComponent
              dataSource={gridItems}
              allowSorting
              allowFiltering
              filterSettings={{ type: "Menu" }}
              selectionSettings={selectionSettings}
              rowSelected={handleItemSelect}
              rowDataBound={(args: { data: ItemListRow; row: HTMLTableRowElement }) => {
                const known = setMenuKnown.get(args.data.id);
                if ((known ?? args.data.isSetMenu) === true) {
                  args.row.style.fontWeight = "bold";
                }
              }}
              height="100%"
            >
              <ColumnsDirective>
                <ColumnDirective
                  headerText="Set Menu"
                  width="80"
                  textAlign="Center"
                  template={(props: ItemListRow & { setMenuChecked?: boolean }) => (
                      <input
                        type="checkbox"
                        className="cbx"
                        checked={!!props.setMenuChecked}
                        disabled={saving}
                        onMouseDown={e => e.stopPropagation()}
                        onClick={e => e.stopPropagation()}
                        onChange={e => handleSetMenuDraftToggle(props, e.target.checked)}
                      />
                    )}
                />
                <ColumnDirective field="code" headerText="Mã" width="100" />
                <ColumnDirective field="name" headerText="Tên" width="220" />
                <ColumnDirective field="primaryCategoryName" headerText="Nhóm chính" width="160" />
                <ColumnDirective field="baseUomCode" headerText="ĐVT" width="60" />
                <ColumnDirective field="isActive" headerText="KH" width="50" displayAsCheckBox />
              </ColumnsDirective>
              <Inject services={[Sort, Filter]} />
            </GridComponent>
          </div>

          <div className="vbot" style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div className="cc-tabs">
              <button type="button" className="cc-tab active">
                Cấu hình ({components.length} component · {choiceCats.length} loại LC)
              </button>
              <div style={{ flex: 1 }} />
              {selectedItem && (
                <div style={{ padding: "4px 12px", fontSize: 12 }}>
                  <span className="mute">Đang xem:</span> <strong>{selectedItem.name}</strong>
                  <span style={{ marginLeft: 8, color: isSetMenuDraft ? "var(--positive)" : "var(--fg-muted)" }}>
                    {isSetMenuDraft ? "· Set Menu" : "· Không phải Set Menu"}
                  </span>
                </div>
              )}
            </div>

            {!selectedItem ? (
              <div className="empty">
                <div>
                  <div className="em-title">Chọn một món Hàng bán</div>
                  <div>Chọn từ danh sách phía trên để cấu hình Set Menu.</div>
                </div>
              </div>
            ) : loadingConfig ? (
              <LoadingBar text="Đang tải cấu hình..." />
            ) : (
              <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
                  <div className="field-checkbox" style={{ marginBottom: 12 }}>
                    <label className="field-checkbox-label">
                      <input
                        type="checkbox"
                        checked={isSetMenuDraft}
                        disabled={saving}
                        onChange={e => handleSetMenuDraftToggle(selectedItem, e.target.checked)}
                      />
                      Là Set Menu
                    </label>
                  </div>
                  <Field label="Mô tả Set Menu">
                    <textarea
                      rows={2}
                      value={description ?? ""}
                      onChange={e => setDescription(e.target.value || null)}
                      disabled={busy}
                    />
                  </Field>
                </div>

                <div className="grid-filterbar" style={{ borderTop: "none", background: "#fafaf9" }}>
                  <strong style={{ fontSize: 12 }}>① Components</strong>
                  <div className="tb-divider" />
                  <TB
                    icon={ChromeIcons.Plus}
                    onClick={() => setCompPickerOpen(true)}
                    disabled={busy || hangBanRootId === null}
                  >
                    Thêm component
                  </TB>
                  <TB
                    icon={ChromeIcons.Trash}
                    kind="danger"
                    disabled={busy || selectedCompKeys.size === 0}
                    onClick={() => {
                      setComponents(prev => prev.filter(c => !selectedCompKeys.has(c._key)));
                      setSelectedCompKeys(new Set());
                    }}
                  >
                    Xoá
                  </TB>
                  <div style={{ flex: 1 }} />
                  <span className="tb-help">Cố định = Main · bỏ tick = khách đổi được</span>
                </div>
                <div className="dgrid-wrap">
                  <table className="dgrid">
                    <thead>
                      <tr>
                        <th style={{ width: 36 }} />
                        <th>Component</th>
                        <th style={{ width: 80 }}>SL</th>
                        <th style={{ width: 80 }}>Cố định</th>
                        <th style={{ width: 70 }}>TT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {components.map(c => (
                        <tr key={c._key}>
                          <td>
                            <input
                              type="checkbox"
                              className="cbx"
                              checked={selectedCompKeys.has(c._key)}
                              onChange={() =>
                                setSelectedCompKeys(prev => {
                                  const n = new Set(prev);
                                  if (n.has(c._key)) n.delete(c._key);
                                  else n.add(c._key);
                                  return n;
                                })
                              }
                            />
                          </td>
                          <td>
                            <strong>{c.componentItemName}</strong>
                            <span className="mute" style={{ marginLeft: 8 }}>{c.componentItemCode}</span>
                          </td>
                          <td className="num">
                            <input
                              type="number"
                              min={0.01}
                              step={0.5}
                              value={c.quantity}
                              onChange={e =>
                                setComponents(prev =>
                                  prev.map(x =>
                                    x._key === c._key ? { ...x, quantity: Number(e.target.value) } : x
                                  )
                                )
                              }
                              disabled={busy}
                              style={{ width: 64, textAlign: "right" }}
                            />
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <input
                              type="checkbox"
                              className="cbx"
                              checked={c.isFixed}
                              onChange={e =>
                                setComponents(prev =>
                                  prev.map(x =>
                                    x._key === c._key ? { ...x, isFixed: e.target.checked } : x
                                  )
                                )
                              }
                              disabled={busy}
                            />
                          </td>
                          <td className="num">
                            <input
                              type="number"
                              min={0}
                              value={c.displayOrder}
                              onChange={e =>
                                setComponents(prev =>
                                  prev.map(x =>
                                    x._key === c._key
                                      ? { ...x, displayOrder: Number(e.target.value) }
                                      : x
                                  )
                                )
                              }
                              disabled={busy}
                              style={{ width: 56, textAlign: "right" }}
                            />
                          </td>
                        </tr>
                      ))}
                      {components.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: "center", color: "var(--fg-muted)" }}>
                            Chưa có component.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="grid-filterbar" style={{ background: "#fafaf9" }}>
                  <strong style={{ fontSize: 12 }}>② Loại lựa chọn đính kèm</strong>
                  <div className="tb-divider" />
                  <TB icon={ChromeIcons.Plus} onClick={() => setCcPickerOpen(true)} disabled={busy}>
                    Đính kèm
                  </TB>
                  <TB
                    icon={ChromeIcons.Trash}
                    kind="danger"
                    disabled={busy || selectedCcKeys.size === 0}
                    onClick={() => {
                      setChoiceCats(prev => prev.filter(c => !selectedCcKeys.has(c._key)));
                      setSelectedCcKeys(new Set());
                    }}
                  >
                    Bỏ đính kèm
                  </TB>
                </div>
                <div className="dgrid-wrap">
                  <table className="dgrid">
                    <thead>
                      <tr>
                        <th style={{ width: 36 }} />
                        <th>Loại lựa chọn</th>
                        <th style={{ width: 70 }}>TT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {choiceCats.map(c => (
                        <tr key={c._key}>
                          <td>
                            <input
                              type="checkbox"
                              className="cbx"
                              checked={selectedCcKeys.has(c._key)}
                              onChange={() =>
                                setSelectedCcKeys(prev => {
                                  const n = new Set(prev);
                                  if (n.has(c._key)) n.delete(c._key);
                                  else n.add(c._key);
                                  return n;
                                })
                              }
                            />
                          </td>
                          <td>{c.choiceCategoryName}</td>
                          <td className="num">
                            <input
                              type="number"
                              min={0}
                              value={c.displayOrder}
                              onChange={e =>
                                setChoiceCats(prev =>
                                  prev.map(x =>
                                    x._key === c._key
                                      ? { ...x, displayOrder: Number(e.target.value) }
                                      : x
                                  )
                                )
                              }
                              disabled={busy}
                              style={{ width: 56, textAlign: "right" }}
                            />
                          </td>
                        </tr>
                      ))}
                      {choiceCats.length === 0 && (
                        <tr>
                          <td colSpan={3} style={{ textAlign: "center", color: "var(--fg-muted)" }}>
                            Chưa đính kèm loại lựa chọn.
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
            <span>{setMenuCount} Set Menu đã biết</span>
            <span>·</span>
            <span>{totalCount} món Hàng bán (trang)</span>
          </>
        }
        right={<span>Tick Set Menu → cấu hình → Lưu · Bỏ tick → Lưu để gỡ</span>}
      />

      <ItemPickerDialog
        visible={compPickerOpen}
        title="Tìm kiếm mặt hàng"
        hangBanCategoryId={hangBanRootId}
        categories={hangBanCategories}
        excludeItemIds={compPickerExcludeIds}
        onClose={() => setCompPickerOpen(false)}
        onSelect={addComponent}
      />

      <DialogComponent
        visible={ccPickerOpen}
        header="Chọn Loại lựa chọn"
        showCloseIcon
        isModal
        width="520px"
        beforeClose={() => setCcPickerOpen(false)}
      >
        <div className="dgrid-wrap" style={{ maxHeight: 360, margin: 12 }}>
          <table className="dgrid">
            <thead>
              <tr>
                <th>Tên</th>
                <th style={{ width: 80 }}>Min</th>
                <th style={{ width: 80 }}>Max</th>
              </tr>
            </thead>
            <tbody>
              {choiceList
                .filter(cc => !choiceCats.some(c => c.choiceCategoryId === cc.id))
                .map(cc => (
                  <tr key={cc.id} onDoubleClick={() => addChoiceCategory(cc)} style={{ cursor: "pointer" }}>
                    <td>{cc.name}</td>
                    <td className="num">{cc.minChoice}</td>
                    <td className="num">{cc.maxChoice ?? "∞"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "0 12px 12px", fontSize: 11, color: "var(--fg-muted)" }}>
          Double-click để đính kèm.
        </div>
      </DialogComponent>
    </>
  );
}
