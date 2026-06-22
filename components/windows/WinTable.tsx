"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ColumnDirective,
  ColumnsDirective,
  Filter,
  GridComponent,
  Group,
  Inject,
  Page,
  Sort,
  type GroupSettingsModel,
  type SortSettingsModel,
} from "@syncfusion/ej2-react-grids";
import { ensureSyncfusionLicense } from "@/lib/syncfusion-license";
import { WinToolbar, TB } from "@/components/ui/WinToolbar";
import { DetailPanel, Field } from "@/components/ui/DetailPanel";
import { StatusBar } from "@/components/ui/StatusBar";
import { LoadingBar, OfflineBar, ErrorBar } from "@/components/ui/ResourceBars";
import { ChromeIcons } from "@/components/desktop/icons";
import { areasApi, countersApi, tablesApi, type TableBatchCreate, type TableUpsert } from "@/lib/api/restaurant";
import { useResource } from "@/lib/http/useResource";
import { mockAreas, mockCounters, mockTables } from "@/data/mock";
import type { Area, RestaurantTable } from "@/types/api/restaurant";

ensureSyncfusionLicense();

type Draft = Partial<RestaurantTable> & {
  areaId: number;
  code: string;
  seatCount: number;
  isActive: boolean;
};

type BatchDraft = {
  areaId: number;
  codePrefix: string;
  startNumber: number;
  count: number;
  seatCount: number;
  description: string | null;
  isActive: boolean;
};

export function WinTable() {
  const tables = useResource(() => tablesApi.list(), { fallback: mockTables });
  const areas = useResource(() => areasApi.list(), { fallback: mockAreas });
  const counters = useResource(() => countersApi.list(), { fallback: mockCounters });

  const list = tables.data ?? [];
  const areaList = areas.data ?? [];
  const counterList = counters.data ?? [];

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [counterFilter, setCounterFilter] = useState<number | "ALL">("ALL");
  const [areaFilter, setAreaFilter] = useState<number | "ALL">("ALL");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [batchDraft, setBatchDraft] = useState<BatchDraft | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sel = list.find(t => t.id === selectedId) ?? null;

  const initSelectedRef = useRef(false);
  const gridRef = useRef<GridComponent | null>(null);
  useEffect(() => {
    if (!initSelectedRef.current && list.length > 0) {
      initSelectedRef.current = true;
      setSelectedId(list[0].id);
      setDraft({ ...list[0] });
    }
  }, [list]);

  const areaMap = useMemo(
    () => Object.fromEntries(areaList.map(a => [a.id, a])),
    [areaList]
  );
  const counterMap = useMemo(
    () => Object.fromEntries(counterList.map(c => [c.id, c])),
    [counterList]
  );

  const availableAreas: Area[] = useMemo(() => {
    if (counterFilter === "ALL") return areaList;
    return areaList.filter(a => a.counterId === counterFilter);
  }, [counterFilter, areaList]);

  const dataView = useMemo(() => {
    let rows = list;
    if (counterFilter !== "ALL") {
      const areaIds = areaList.filter(a => a.counterId === counterFilter).map(a => a.id);
      rows = rows.filter(t => areaIds.includes(t.areaId));
    }
    if (areaFilter !== "ALL") rows = rows.filter(t => t.areaId === areaFilter);
    return rows.map(t => {
      const area = areaMap[t.areaId];
      return {
        ...t,
        areaName: area?.name ?? "",
        counterName: area ? counterMap[area.counterId]?.name ?? "" : "",
      };
    });
  }, [list, counterFilter, areaFilter, areaMap, counterMap, areaList]);

  const sortSettings: SortSettingsModel = {
    columns: [{ field: "code", direction: "Ascending" }],
  };

  const groupSettings: GroupSettingsModel = {
    columns: ["areaName"],
    showGroupedColumn: false,
    showDropArea: false,
  };

  const handleRowSelected = (args: { data: RestaurantTable | RestaurantTable[] }) => {
    const row = Array.isArray(args.data) ? args.data[0] : args.data;
    if (row?.id === undefined || row.id === selectedId) return;
    setSelectedId(row.id);
    setDraft({ ...row });
    setBatchDraft(null);
    setErrorMsg(null);
  };

  const syncGridSelection = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) return;
    if (selectedId === null) {
      grid.clearSelection();
      return;
    }
    const rowIndex = grid.getRowIndexByPrimaryKey(selectedId);
    if (rowIndex >= 0) grid.selectRow(rowIndex);
  }, [selectedId]);

  useEffect(() => {
    syncGridSelection();
  }, [syncGridSelection, dataView]);

  const handleCreate = () => {
    const fallbackAreaId =
      areaFilter !== "ALL" ? areaFilter : availableAreas[0]?.id ?? areaList[0]?.id ?? 0;
    setSelectedId(null);
    setDraft({
      areaId: fallbackAreaId,
      code: "",
      seatCount: 4,
      description: null,
      status: "AVAILABLE",
      isActive: true,
    });
    setBatchDraft(null);
    setErrorMsg(null);
  };

  const handleBatchCreate = () => {
    const fallbackAreaId =
      areaFilter !== "ALL" ? areaFilter : availableAreas[0]?.id ?? areaList[0]?.id ?? 0;
    setSelectedId(null);
    setDraft(null);
    setBatchDraft({
      areaId: fallbackAreaId,
      codePrefix: "B",
      startNumber: 1,
      count: 10,
      seatCount: 4,
      description: null,
      isActive: true,
    });
    setErrorMsg(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg(null);

    if (batchDraft) {
      const body: TableBatchCreate = {
        areaId: batchDraft.areaId,
        codePrefix: batchDraft.codePrefix.trim(),
        startNumber: batchDraft.startNumber,
        count: batchDraft.count,
        seatCount: batchDraft.seatCount,
        description: batchDraft.description,
        isActive: batchDraft.isActive,
      };
      const res = await tablesApi.batchCreate(body);
      if (res.isSuccess) {
        await tables.reload();
        setBatchDraft(null);
      } else {
        setErrorMsg(res.detail || res.title);
      }
      setSaving(false);
      return;
    }

    if (!draft) {
      setSaving(false);
      return;
    }
    const body: TableUpsert = {
      areaId: draft.areaId,
      code: draft.code.trim(),
      seatCount: draft.seatCount,
      description: draft.description ?? null,
      isActive: draft.isActive,
    };
    const res = sel ? await tablesApi.update(sel.id, body) : await tablesApi.create(body);

    if (res.isSuccess) {
      await tables.reload();
      setSelectedId(res.data.id);
      setDraft({ ...res.data });
    } else {
      setErrorMsg(res.detail || res.title);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!sel) return;
    if (!window.confirm(`Xoá Bàn "${sel.code}"?`)) return;
    setSaving(true);
    setErrorMsg(null);
    const res = await tablesApi.remove(sel.id);
    if (res.isSuccess) {
      await tables.reload();
      setSelectedId(null);
      setDraft(null);
    } else {
      setErrorMsg(res.detail || res.title);
    }
    setSaving(false);
  };

  return (
    <>
      <WinToolbar
        left={
          <>
            <TB icon={ChromeIcons.Plus} onClick={handleCreate}>Tạo mới</TB>
            <TB icon={ChromeIcons.Plus} onClick={handleBatchCreate}>Tạo nhiều</TB>
            <TB icon={ChromeIcons.Save} onClick={handleSave} kind="primary" disabled={(!draft && !batchDraft) || saving}>Lưu</TB>
            <TB icon={ChromeIcons.Trash} onClick={handleDelete} kind="danger" disabled={!sel || saving}>Xoá</TB>
            <div className="tb-divider" />
            <TB icon={ChromeIcons.Refresh} onClick={() => tables.reload()}>Làm mới</TB>
            <TB icon={ChromeIcons.Export}>Xuất dữ liệu</TB>
            <div className="tb-divider" />
            <span className="tb-help">Quầy:</span>
            <select
              value={String(counterFilter)}
              onChange={e => {
                const v = e.target.value === "ALL" ? "ALL" : Number(e.target.value);
                setCounterFilter(v);
                setAreaFilter("ALL");
              }}
              style={{ padding: "5px 8px", border: "1px solid var(--border-strong)", borderRadius: 4 }}
            >
              <option value="ALL">Tất cả</option>
              {counterList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <span className="tb-help">Khu:</span>
            <select
              value={String(areaFilter)}
              onChange={e => setAreaFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
              style={{ padding: "5px 8px", border: "1px solid var(--border-strong)", borderRadius: 4 }}
            >
              <option value="ALL">Tất cả</option>
              {availableAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </>
        }
        right={<TB icon={ChromeIcons.Help}>Trợ giúp</TB>}
      />

      <div className="win-body">
        <DetailPanel
          title={batchDraft ? "Tạo nhiều Bàn" : "Thông tin Bàn"}
          collapsed={collapsed}
          onToggle={() => setCollapsed(c => !c)}
        >
          {batchDraft ? (
            <>
              <Field label="Khu" required>
                <select
                  value={batchDraft.areaId}
                  onChange={e => setBatchDraft({ ...batchDraft, areaId: Number(e.target.value) })}
                >
                  {areaList.map(a => (
                    <option key={a.id} value={a.id}>
                      {counterMap[a.counterId]?.name} — {a.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tiền tố mã" required>
                <input
                  value={batchDraft.codePrefix}
                  onChange={e => setBatchDraft({ ...batchDraft, codePrefix: e.target.value })}
                  placeholder="vd: B, DA, KM"
                />
              </Field>
              <Field label="Bắt đầu từ" required>
                <input
                  type="number"
                  min={0}
                  value={batchDraft.startNumber}
                  onChange={e => setBatchDraft({ ...batchDraft, startNumber: Math.max(0, Number(e.target.value)) })}
                />
              </Field>
              <Field label="Số lượng" required>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={batchDraft.count}
                  onChange={e => setBatchDraft({ ...batchDraft, count: Math.min(100, Math.max(1, Number(e.target.value))) })}
                />
              </Field>
              <Field label="Số ghế" required>
                <input
                  type="number"
                  min={1}
                  value={batchDraft.seatCount}
                  onChange={e => setBatchDraft({ ...batchDraft, seatCount: Math.max(1, Number(e.target.value)) })}
                />
              </Field>
              <Field label="Mô tả">
                <textarea
                  rows={2}
                  value={batchDraft.description ?? ""}
                  onChange={e => setBatchDraft({ ...batchDraft, description: e.target.value || null })}
                />
              </Field>
              <Field label="Kích hoạt">
                <input
                  type="checkbox"
                  checked={batchDraft.isActive}
                  onChange={e => setBatchDraft({ ...batchDraft, isActive: e.target.checked })}
                />
              </Field>
              <div style={{ marginTop: 12, padding: 10, background: "#f4f4f5", borderRadius: 4, fontSize: 11, color: "var(--fg-muted)" }}>
                {(() => {
                  const last = batchDraft.startNumber + batchDraft.count - 1;
                  const width = String(last).length;
                  const pad = (n: number) => String(n).padStart(width, "0");
                  const first = `${batchDraft.codePrefix.trim()}${pad(batchDraft.startNumber)}`;
                  const lastCode = `${batchDraft.codePrefix.trim()}${pad(last)}`;
                  return <>Sẽ tạo: <b>{first}</b> → <b>{lastCode}</b> ({batchDraft.count} bàn)</>;
                })()}
              </div>
              {errorMsg && (
                <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 8 }}>{errorMsg}</div>
              )}
            </>
          ) : draft ? (
            <>
              {sel && <Field label="Mã"><input value={String(sel.id)} disabled /></Field>}
              <Field label="Mã bàn" required>
                <input value={draft.code} onChange={e => setDraft({ ...draft, code: e.target.value })} />
              </Field>
              <Field label="Số ghế" required>
                <input
                  type="number"
                  min={1}
                  value={draft.seatCount}
                  onChange={e => setDraft({ ...draft, seatCount: Math.max(1, Number(e.target.value)) })}
                />
              </Field>
              <Field label="Khu" required>
                <select
                  value={draft.areaId}
                  onChange={e => setDraft({ ...draft, areaId: Number(e.target.value) })}
                >
                  {areaList.map(a => (
                    <option key={a.id} value={a.id}>
                      {counterMap[a.counterId]?.name} — {a.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Mô tả">
                <textarea
                  rows={3}
                  value={draft.description ?? ""}
                  onChange={e => setDraft({ ...draft, description: e.target.value || null })}
                />
              </Field>
              <Field label="Kích hoạt">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={e => setDraft({ ...draft, isActive: e.target.checked })}
                />
              </Field>
              {errorMsg && (
                <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 8 }}>{errorMsg}</div>
              )}
            </>
          ) : (
            <div style={{ color: "var(--fg-muted)", fontSize: 12, padding: 12 }}>
              Chọn một Bàn từ danh sách bên phải, hoặc bấm Tạo mới / Tạo nhiều.
            </div>
          )}
        </DetailPanel>

        <div className="data-list">
          {tables.loading && <LoadingBar text="Đang tải Bàn..." />}
          {tables.isOffline && <OfflineBar onRetry={() => tables.reload()} />}
          {tables.isApiError && <ErrorBar text={tables.error ?? ""} onRetry={() => tables.reload()} />}
          <GridComponent
            ref={(g: GridComponent | null) => { gridRef.current = g; }}
            dataSource={dataView}
            allowSorting
            allowPaging
            allowFiltering
            allowGrouping
            filterSettings={{ type: "Menu" }}
            pageSettings={{ pageSize: 20 }}
            sortSettings={sortSettings}
            groupSettings={groupSettings}
            dataBound={syncGridSelection}
            rowSelected={handleRowSelected}
            height="100%"
          >
            <ColumnsDirective>
              <ColumnDirective field="id" headerText="ID" width="70" textAlign="Right" isPrimaryKey />
              <ColumnDirective field="code" headerText="Mã bàn" width="110" />
              <ColumnDirective field="seatCount" headerText="Số ghế" width="90" textAlign="Right" />
              <ColumnDirective field="counterName" headerText="Quầy" width="150" />
              <ColumnDirective field="areaName" headerText="Khu" width="160" />
              <ColumnDirective field="description" headerText="Mô tả" width="240" />
              <ColumnDirective field="isActive" headerText="Kích hoạt" width="110" displayAsCheckBox />
            </ColumnsDirective>
            <Inject services={[Page, Sort, Filter, Group]} />
          </GridComponent>
        </div>
      </div>

      <StatusBar
        left={
          <>
            <span>{dataView.length} Bàn hiển thị</span>
            <span>·</span>
            <span>{dataView.filter(t => t.isActive).length} đang kích hoạt</span>
            {tables.isOffline && <><span>·</span><span style={{ color: "var(--warning)" }}>offline (mock)</span></>}
          </>
        }
        right={<span>Gộp nhóm theo Khu</span>}
      />
    </>
  );
}
