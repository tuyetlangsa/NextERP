"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ColumnDirective,
  ColumnsDirective,
  Filter,
  GridComponent,
  Inject,
  Sort,
  type SortSettingsModel,
} from "@syncfusion/ej2-react-grids";
import { ensureSyncfusionLicense } from "@/lib/syncfusion-license";
import { WinToolbar, TB } from "@/components/ui/WinToolbar";
import { Field } from "@/components/ui/DetailPanel";
import { StatusBar } from "@/components/ui/StatusBar";
import { LoadingBar, ErrorBar } from "@/components/ui/ResourceBars";
import { ChromeIcons } from "@/components/desktop/icons";
import { ItemPickerDialog } from "@/components/menu/ItemPickerDialog";
import { discountPoliciesApi } from "@/lib/api/discount";
import { areasApi } from "@/lib/api/restaurant";
import { categoriesApi } from "@/lib/api/menu";
import { useResource } from "@/lib/http/useResource";
import { formatApiError } from "@/lib/http/formatError";
import { findHangBanCategoryId } from "@/lib/menu/hangBan";
import type {
  ApplyType,
  DiscountPolicyCondition,
  DiscountPolicyConditionInput,
  DiscountPolicyListRow,
  DiscountPolicyUpsert,
  DiscountType,
} from "@/types/api/discount";
import type { ItemListRow } from "@/types/api/menu";
import type { Area } from "@/types/api/restaurant";

ensureSyncfusionLicense();

type ActiveFilter = "ALL" | "ACTIVE" | "INACTIVE";
type TypeFilter = "ALL" | DiscountType;

type ConditionDraft = {
  _key: string;
  thresholdAmount: number | null;
  itemId: number | null;
  itemName: string | null;
  quantityThreshold: number | null;
  areaId: number | null;
  areaName: string | null;
  applyType: ApplyType;
  discountValue: number;
  displayOrder: number;
};

type HeaderDraft = {
  code: string;
  name: string;
  description: string | null;
  discountType: DiscountType;
  isAutoApply: boolean;
  selectedDays: number[];
  isActive: boolean;
};

const WEEK_DAYS: Array<{ value: number; label: string }> = [
  { value: 1, label: "T2" },
  { value: 2, label: "T3" },
  { value: 3, label: "T4" },
  { value: 4, label: "T5" },
  { value: 5, label: "T6" },
  { value: 6, label: "T7" },
  { value: 7, label: "CN" },
];

const DISCOUNT_TYPE_LABEL: Record<DiscountType, string> = {
  TICKET_THRESHOLD: "Bill ≥ X",
  QUANTITY_ITEM: "Mua ≥ N món",
};

const EMPTY_AREAS: Area[] = [];

function newKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function parseDaysOfWeek(raw: string | null): number[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map(s => Number(s.trim()))
    .filter(n => Number.isFinite(n) && n >= 1 && n <= 7);
}

function serializeDaysOfWeek(days: number[]): string | null {
  if (days.length === 0) return null;
  return [...days].sort((a, b) => a - b).join(",");
}

function toConditionDraft(c: DiscountPolicyCondition): ConditionDraft {
  return {
    _key: newKey("c"),
    thresholdAmount: c.thresholdAmount,
    itemId: c.itemId,
    itemName: c.itemName,
    quantityThreshold: c.quantityThreshold,
    areaId: c.areaId,
    areaName: c.areaName,
    applyType: c.applyType,
    discountValue: c.discountValue,
    displayOrder: c.displayOrder,
  };
}

function emptyCondition(type: DiscountType, order: number): ConditionDraft {
  return {
    _key: newKey("c"),
    thresholdAmount: type === "TICKET_THRESHOLD" ? 0 : null,
    itemId: null,
    itemName: null,
    quantityThreshold: type === "QUANTITY_ITEM" ? 1 : null,
    areaId: null,
    areaName: null,
    applyType: "PERCENT",
    discountValue: 0,
    displayOrder: order,
  };
}

function defaultHeader(type: DiscountType = "TICKET_THRESHOLD"): HeaderDraft {
  return {
    code: "",
    name: "",
    description: null,
    discountType: type,
    isAutoApply: true,
    selectedDays: [],
    isActive: true,
  };
}

function validatePolicy(
  header: HeaderDraft,
  conditions: ConditionDraft[]
): string | null {
  const code = header.code.trim();
  if (!code) return "Mã chính sách là bắt buộc.";
  if (code.length > 20) return "Mã tối đa 20 ký tự.";
  if (!header.name.trim()) return "Tên chính sách là bắt buộc.";
  if (header.name.trim().length > 150) return "Tên tối đa 150 ký tự.";
  if ((header.description?.length ?? 0) > 500) return "Mô tả tối đa 500 ký tự.";
  if (conditions.length === 0) return "Cần ít nhất 1 điều kiện giảm giá.";

  for (let i = 0; i < conditions.length; i++) {
    const c = conditions[i];
    const row = i + 1;
    if (header.discountType === "TICKET_THRESHOLD") {
      if (c.thresholdAmount === null || c.thresholdAmount <= 0) {
        return `Dòng ${row}: ngưỡng bill phải > 0.`;
      }
      if (c.itemId !== null || c.quantityThreshold !== null) {
        return `Dòng ${row}: loại Bill ≥ X không được có món/số lượng.`;
      }
    } else {
      if (c.itemId === null) return `Dòng ${row}: chọn món Hàng bán.`;
      if (c.quantityThreshold === null || c.quantityThreshold <= 0) {
        return `Dòng ${row}: số lượng món phải > 0.`;
      }
      if (c.thresholdAmount !== null) {
        return `Dòng ${row}: loại Mua ≥ N món không được có ngưỡng bill.`;
      }
    }
    if (c.applyType === "PERCENT") {
      if (c.discountValue < 0 || c.discountValue > 100) {
        return `Dòng ${row}: giảm % phải từ 0 đến 100.`;
      }
    } else if (c.discountValue < 0) {
      return `Dòng ${row}: giảm tiền phải ≥ 0.`;
    }
  }
  return null;
}

function buildUpsert(header: HeaderDraft, conditions: ConditionDraft[]): DiscountPolicyUpsert {
  return {
    code: header.code.trim(),
    name: header.name.trim(),
    description: header.description?.trim() || null,
    discountType: header.discountType,
    isAutoApply: header.isAutoApply,
    daysOfWeek: serializeDaysOfWeek(header.selectedDays),
    isActive: header.isActive,
    conditions: conditions.map((c, idx) => {
      const base: DiscountPolicyConditionInput = {
        applyType: c.applyType,
        discountValue: c.discountValue,
        displayOrder: c.displayOrder || idx + 1,
        areaId: c.areaId,
      };
      if (header.discountType === "TICKET_THRESHOLD") {
        return { ...base, thresholdAmount: c.thresholdAmount, itemId: null, quantityThreshold: null };
      }
      return {
        ...base,
        thresholdAmount: null,
        itemId: c.itemId,
        quantityThreshold: c.quantityThreshold,
      };
    }),
  };
}

export function WinDiscountPolicy() {
  const areasRes = useResource(() => areasApi.list({ isActive: true }), {
    fallback: EMPTY_AREAS,
  });
  const categoriesRes = useResource(() => categoriesApi.list({ isActive: true }));
  const areaList = areasRes.data ?? EMPTY_AREAS;
  const hangBanCategoryId = useMemo(
    () => findHangBanCategoryId(categoriesRes.data ?? []),
    [categoriesRes.data]
  );
  const hangBanCategories = useMemo(() => {
    if (hangBanCategoryId === null) return [];
    return (categoriesRes.data ?? []).filter(
      c => c.id === hangBanCategoryId || c.path.startsWith(`${hangBanCategoryId};`)
    );
  }, [categoriesRes.data, hangBanCategoryId]);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("ALL");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");

  const listQuery = useMemo(() => {
    const q: { search?: string; isActive?: boolean; discountType?: DiscountType } = {};
    if (search.trim()) q.search = search.trim();
    if (activeFilter === "ACTIVE") q.isActive = true;
    if (activeFilter === "INACTIVE") q.isActive = false;
    if (typeFilter !== "ALL") q.discountType = typeFilter;
    return q;
  }, [search, activeFilter, typeFilter]);

  const listRes = useResource(() => discountPoliciesApi.list(listQuery), {
    deps: [listQuery.search, listQuery.isActive, listQuery.discountType],
  });
  const list = listRes.data ?? [];

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [header, setHeader] = useState<HeaderDraft | null>(null);
  const [conditions, setConditions] = useState<ConditionDraft[]>([]);
  const [selectedCondKeys, setSelectedCondKeys] = useState<Set<string>>(new Set());
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [itemPickTargetKey, setItemPickTargetKey] = useState<string | null>(null);

  const initRef = useRef(false);
  const isNew = selectedId === null && header !== null;

  useEffect(() => {
    if (!successMsg) return;
    const t = window.setTimeout(() => setSuccessMsg(null), 4000);
    return () => window.clearTimeout(t);
  }, [successMsg]);

  useEffect(() => {
    if (!initRef.current && list.length > 0 && selectedId === null && header === null) {
      initRef.current = true;
      void loadDetail(list[0].id);
    }
  }, [list, selectedId, header]);

  const loadDetail = async (id: number) => {
    setLoadingDetail(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    const res = await discountPoliciesApi.get(id);
    if (res.isSuccess) {
      const d = res.data;
      setSelectedId(d.id);
      setHeader({
        code: d.code,
        name: d.name,
        description: d.description,
        discountType: d.discountType,
        isAutoApply: d.isAutoApply,
        selectedDays: parseDaysOfWeek(d.daysOfWeek),
        isActive: d.isActive,
      });
      setConditions(
        d.conditions.length > 0
          ? d.conditions.map(toConditionDraft).sort((a, b) => a.displayOrder - b.displayOrder)
          : [emptyCondition(d.discountType, 1)]
      );
      setSelectedCondKeys(new Set());
    } else {
      setErrorMsg(formatApiError(res));
    }
    setLoadingDetail(false);
  };

  const handleRowSelected = (args: { data: DiscountPolicyListRow | DiscountPolicyListRow[] }) => {
    const row = Array.isArray(args.data) ? args.data[0] : args.data;
    if (!row?.id || row.id === selectedId) return;
    void loadDetail(row.id);
  };

  const handleCreate = () => {
    setSelectedId(null);
    setHeader(defaultHeader());
    setConditions([emptyCondition("TICKET_THRESHOLD", 1)]);
    setSelectedCondKeys(new Set());
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleRefresh = () => {
    void listRes.reload();
    if (selectedId !== null) void loadDetail(selectedId);
  };

  const handleDiscountTypeChange = (next: DiscountType) => {
    if (!header || header.discountType === next) return;
    if (conditions.length > 0) {
      const ok = window.confirm(
        "Đổi loại chính sách sẽ reset các điều kiện cho khớp loại mới. Tiếp tục?"
      );
      if (!ok) return;
    }
    setHeader({ ...header, discountType: next });
    setConditions([emptyCondition(next, 1)]);
    setSelectedCondKeys(new Set());
  };

  const toggleDay = (day: number) => {
    if (!header) return;
    setHeader({
      ...header,
      selectedDays: header.selectedDays.includes(day)
        ? header.selectedDays.filter(d => d !== day)
        : [...header.selectedDays, day].sort((a, b) => a - b),
    });
  };

  const addCondition = () => {
    if (!header) return;
    setConditions(prev => [...prev, emptyCondition(header.discountType, prev.length + 1)]);
  };

  const removeSelectedConditions = () => {
    if (selectedCondKeys.size === 0) return;
    setConditions(prev => {
      const next = prev.filter(c => !selectedCondKeys.has(c._key));
      return next.length > 0 ? next : header ? [emptyCondition(header.discountType, 1)] : [];
    });
    setSelectedCondKeys(new Set());
  };

  const updateCondition = (key: string, patch: Partial<ConditionDraft>) => {
    setConditions(prev => prev.map(c => (c._key === key ? { ...c, ...patch } : c)));
  };

  const toggleCondSelect = (key: string) => {
    setSelectedCondKeys(prev => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  };

  const openItemPicker = (condKey: string) => {
    setItemPickTargetKey(condKey);
    setItemPickerOpen(true);
  };

  const handleItemPicked = (item: ItemListRow) => {
    if (itemPickTargetKey) {
      updateCondition(itemPickTargetKey, { itemId: item.id, itemName: item.name });
    }
    setItemPickerOpen(false);
    setItemPickTargetKey(null);
  };

  const handleSave = async () => {
    if (!header) return;
    const validation = validatePolicy(header, conditions);
    if (validation) {
      setErrorMsg(validation);
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    const body = buildUpsert(header, conditions);
    const res =
      selectedId === null
        ? await discountPoliciesApi.create(body)
        : await discountPoliciesApi.update(selectedId, body);
    if (res.isSuccess) {
      await listRes.reload();
      setSelectedId(res.data.id);
      setSuccessMsg(
        selectedId === null
          ? `Đã tạo chính sách "${res.data.name}".`
          : `Đã lưu chính sách "${res.data.name}".`
      );
      await loadDetail(res.data.id);
    } else {
      setErrorMsg(formatApiError(res));
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (selectedId === null) return;
    const name = header?.name ?? `#${selectedId}`;
    if (!window.confirm(`Xoá chính sách "${name}"?`)) return;
    setSaving(true);
    setErrorMsg(null);
    const res = await discountPoliciesApi.remove(selectedId);
    if (res.isSuccess) {
      await listRes.reload();
      setSelectedId(null);
      setHeader(null);
      setConditions([]);
      setSelectedCondKeys(new Set());
      setSuccessMsg("Đã xoá chính sách.");
      initRef.current = false;
    } else {
      setErrorMsg(formatApiError(res));
    }
    setSaving(false);
  };

  const busy = saving || loadingDetail;
  const sortSettings: SortSettingsModel = {
    columns: [{ field: "code", direction: "Ascending" }],
  };

  const areaOptions = useMemo(
    () => [{ id: null as number | null, name: "Mọi khu" }, ...areaList.map(a => ({ id: a.id, name: a.name }))],
    [areaList]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
      <WinToolbar
        left={
          <>
            <TB icon={ChromeIcons.Plus} onClick={handleCreate} disabled={listRes.loading || busy}>
              Tạo mới
            </TB>
            <TB
              icon={ChromeIcons.Save}
              onClick={handleSave}
              kind="primary"
              disabled={!header || busy}
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </TB>
            <TB
              icon={ChromeIcons.Trash}
              onClick={handleDelete}
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

      <div className="win-body">
        <div className="data-list" style={{ width: 380, flexShrink: 0, display: "flex", flexDirection: "column" }}>
          <div className="grid-filterbar">
            <strong style={{ fontSize: 13 }}>Chính sách giảm giá</strong>
            <div className="tb-divider" />
            <div className="filter-group">
              <label>Tìm:</label>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Mã / tên..."
              />
            </div>
            <div className="filter-group">
              <label>Loại:</label>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as TypeFilter)}
              >
                <option value="ALL">Tất cả</option>
                <option value="TICKET_THRESHOLD">Bill ≥ X</option>
                <option value="QUANTITY_ITEM">Mua ≥ N món</option>
              </select>
            </div>
            <div className="filter-group">
              <label>KH:</label>
              <select
                value={activeFilter}
                onChange={e => setActiveFilter(e.target.value as ActiveFilter)}
              >
                <option value="ALL">Tất cả</option>
                <option value="ACTIVE">Đang dùng</option>
                <option value="INACTIVE">Tạm tắt</option>
              </select>
            </div>
          </div>
          {listRes.loading && <LoadingBar text="Đang tải..." />}
          {listRes.isApiError && (
            <ErrorBar text={listRes.error ?? ""} onRetry={() => listRes.reload()} />
          )}
          <div style={{ flex: 1, minHeight: 0 }}>
            <GridComponent
              dataSource={list}
              allowSorting
              allowFiltering
              filterSettings={{ type: "Menu" }}
              sortSettings={sortSettings}
              rowSelected={handleRowSelected}
              selectedRowIndex={
                selectedId !== null ? list.findIndex(p => p.id === selectedId) : -1
              }
              height="100%"
            >
              <ColumnsDirective>
                <ColumnDirective field="code" headerText="Mã" width="90" />
                <ColumnDirective field="name" headerText="Tên" width="160" />
                <ColumnDirective
                  field="discountType"
                  headerText="Loại"
                  width="110"
                  template={(row: DiscountPolicyListRow) => (
                    <span>{DISCOUNT_TYPE_LABEL[row.discountType]}</span>
                  )}
                />
                <ColumnDirective
                  field="isAutoApply"
                  headerText="Tự áp dụng"
                  width="90"
                  displayAsCheckBox
                />
                <ColumnDirective field="conditionCount" headerText="ĐK" width="50" textAlign="Right" />
                <ColumnDirective field="isActive" headerText="KH" width="60" displayAsCheckBox />
              </ColumnsDirective>
              <Inject services={[Sort, Filter]} />
            </GridComponent>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {!header ? (
            <div className="empty" style={{ flex: 1 }}>
              <div>
                <div className="em-title">Chưa chọn chính sách</div>
                <div>Chọn từ danh sách bên trái hoặc bấm Tạo mới.</div>
              </div>
            </div>
          ) : (
            <>
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--border)",
                  overflowY: "auto",
                  maxHeight: "42%",
                  flexShrink: 0,
                }}
              >
                <strong style={{ fontSize: 13, display: "block", marginBottom: 10 }}>
                  {isNew ? "Tạo chính sách mới" : "Chi tiết chính sách"}
                </strong>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
                  <Field label="Mã" required>
                    <input
                      value={header.code}
                      maxLength={20}
                      disabled={busy}
                      onChange={e => setHeader({ ...header, code: e.target.value })}
                    />
                  </Field>
                  <Field label="Tên" required>
                    <input
                      value={header.name}
                      maxLength={150}
                      disabled={busy}
                      onChange={e => setHeader({ ...header, name: e.target.value })}
                    />
                  </Field>
                  <Field label="Loại giảm giá" required>
                    <select
                      value={header.discountType}
                      disabled={busy}
                      onChange={e => handleDiscountTypeChange(e.target.value as DiscountType)}
                    >
                      <option value="TICKET_THRESHOLD">Bill ≥ X → giảm</option>
                      <option value="QUANTITY_ITEM">Mua ≥ N món Y → giảm</option>
                    </select>
                  </Field>
                  <Field label="Cách áp dụng">
                    <select
                      value={header.isAutoApply ? "auto" : "manual"}
                      disabled={busy}
                      onChange={e =>
                        setHeader({ ...header, isAutoApply: e.target.value === "auto" })
                      }
                    >
                      <option value="auto">Tự áp dụng</option>
                      <option value="manual">Thu ngân tự chọn</option>
                    </select>
                  </Field>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="Mô tả">
                      <textarea
                        rows={2}
                        maxLength={500}
                        value={header.description ?? ""}
                        disabled={busy}
                        onChange={e =>
                          setHeader({ ...header, description: e.target.value || null })
                        }
                      />
                    </Field>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="Ngày trong tuần">
                      <div className="chip-row">
                        {WEEK_DAYS.map(d => {
                          const checked = header.selectedDays.includes(d.value);
                          return (
                            <label
                              key={d.value}
                              className="chip"
                              style={{ cursor: "pointer", background: checked ? "#dbeafe" : undefined }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={busy}
                                onChange={() => toggleDay(d.value)}
                                style={{ marginRight: 4 }}
                              />
                              {d.label}
                            </label>
                          );
                        })}
                        <span className="tb-help" style={{ marginLeft: 8 }}>
                          Bỏ trống = mọi ngày
                        </span>
                      </div>
                    </Field>
                  </div>
                  <Field label="Kích hoạt">
                    <input
                      type="checkbox"
                      checked={header.isActive}
                      disabled={busy}
                      onChange={e => setHeader({ ...header, isActive: e.target.checked })}
                    />
                  </Field>
                </div>
              </div>

              <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                <div className="grid-filterbar" style={{ flexShrink: 0 }}>
                  <strong style={{ fontSize: 13 }}>Điều kiện ({conditions.length})</strong>
                  <div className="tb-divider" />
                  <TB icon={ChromeIcons.Plus} onClick={addCondition} disabled={busy}>
                    Thêm dòng
                  </TB>
                  <TB
                    icon={ChromeIcons.Trash}
                    onClick={removeSelectedConditions}
                    kind="danger"
                    disabled={busy || selectedCondKeys.size === 0}
                  >
                    Xoá dòng
                  </TB>
                </div>
                {loadingDetail && <LoadingBar text="Đang tải chi tiết..." />}
                <div className="dgrid-wrap" style={{ flex: 1, minHeight: 0 }}>
                  <table className="dgrid">
                    <thead>
                      <tr>
                        <th style={{ width: 36 }} />
                        <th className="stt">#</th>
                        {header.discountType === "TICKET_THRESHOLD" ? (
                          <th style={{ width: 120 }}>Ngưỡng bill</th>
                        ) : (
                          <>
                            <th>Món (Hàng bán)</th>
                            <th style={{ width: 90 }}>Số lượng</th>
                          </>
                        )}
                        <th style={{ width: 140 }}>Khu vực</th>
                        <th style={{ width: 100 }}>Loại giảm</th>
                        <th style={{ width: 110 }}>Giá trị</th>
                        <th style={{ width: 70 }}>TT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conditions.map((c, idx) => (
                        <tr key={c._key}>
                          <td>
                            <input
                              type="checkbox"
                              className="cbx"
                              checked={selectedCondKeys.has(c._key)}
                              onChange={() => toggleCondSelect(c._key)}
                              disabled={busy}
                            />
                          </td>
                          <td className="stt">{idx + 1}</td>
                          {header.discountType === "TICKET_THRESHOLD" ? (
                            <td>
                              <input
                                type="number"
                                min={0}
                                className="num"
                                style={{ width: "100%" }}
                                value={c.thresholdAmount ?? ""}
                                disabled={busy}
                                onChange={e =>
                                  updateCondition(c._key, {
                                    thresholdAmount:
                                      e.target.value === "" ? null : Number(e.target.value),
                                  })
                                }
                              />
                            </td>
                          ) : (
                            <>
                              <td>
                                <button
                                  type="button"
                                  onClick={() => openItemPicker(c._key)}
                                  disabled={busy}
                                  style={{
                                    width: "100%",
                                    textAlign: "left",
                                    padding: "4px 6px",
                                    border: "1px solid var(--border-strong)",
                                    borderRadius: 4,
                                    background: "#fff",
                                    cursor: "pointer",
                                  }}
                                >
                                  {c.itemName ?? (
                                    <span style={{ color: "var(--fg-muted)" }}>Chọn món...</span>
                                  )}
                                </button>
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min={1}
                                  className="num"
                                  style={{ width: "100%" }}
                                  value={c.quantityThreshold ?? ""}
                                  disabled={busy}
                                  onChange={e =>
                                    updateCondition(c._key, {
                                      quantityThreshold:
                                        e.target.value === "" ? null : Number(e.target.value),
                                    })
                                  }
                                />
                              </td>
                            </>
                          )}
                          <td>
                            <select
                              value={c.areaId ?? ""}
                              disabled={busy}
                              onChange={e => {
                                const id = e.target.value === "" ? null : Number(e.target.value);
                                const area = areaList.find(a => a.id === id);
                                updateCondition(c._key, {
                                  areaId: id,
                                  areaName: area?.name ?? null,
                                });
                              }}
                              style={{ width: "100%" }}
                            >
                              {areaOptions.map(opt => (
                                <option key={String(opt.id)} value={opt.id ?? ""}>
                                  {opt.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              value={c.applyType}
                              disabled={busy}
                              onChange={e =>
                                updateCondition(c._key, {
                                  applyType: e.target.value as ApplyType,
                                })
                              }
                              style={{ width: "100%" }}
                            >
                              <option value="PERCENT">%</option>
                              <option value="FIXED">Tiền</option>
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              min={0}
                              max={c.applyType === "PERCENT" ? 100 : undefined}
                              className="num"
                              style={{ width: "100%" }}
                              value={c.discountValue}
                              disabled={busy}
                              onChange={e =>
                                updateCondition(c._key, {
                                  discountValue: Number(e.target.value),
                                })
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min={0}
                              className="num"
                              style={{ width: "100%" }}
                              value={c.displayOrder}
                              disabled={busy}
                              onChange={e =>
                                updateCondition(c._key, {
                                  displayOrder: Number(e.target.value),
                                })
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <StatusBar
        left={
          <>
            <span>{list.length} chính sách</span>
            <span>·</span>
            <span>{list.filter(p => p.isActive).length} đang dùng</span>
          </>
        }
      />

      <ItemPickerDialog
        visible={itemPickerOpen}
        title="Tìm kiếm mặt hàng"
        hangBanCategoryId={hangBanCategoryId}
        categories={hangBanCategories}
        excludeItemIds={[]}
        onClose={() => {
          setItemPickerOpen(false);
          setItemPickTargetKey(null);
        }}
        onSelect={handleItemPicked}
      />
    </div>
  );
}
