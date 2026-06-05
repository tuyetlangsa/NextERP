"use client";

import { useMemo, useState } from "react";
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
import { DetailPanel, Field } from "@/components/ui/DetailPanel";
import { StatusBar } from "@/components/ui/StatusBar";
import { LoadingBar, OfflineBar, ErrorBar } from "@/components/ui/ResourceBars";
import { ChromeIcons } from "@/components/desktop/icons";
import { areasApi, countersApi, tablesApi, type TableUpsert } from "@/lib/api/restaurant";
import { useResource } from "@/lib/http/useResource";
import { mockAreas, mockCounters, mockTables } from "@/data/mock";
import type { Area, RestaurantTable, TableStatus } from "@/types/api/restaurant";

ensureSyncfusionLicense();

type Draft = Partial<RestaurantTable> & {
  areaId: number;
  code: string;
  seatCount: number;
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
  const [collapsed, setCollapsed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sel = list.find(t => t.id === selectedId) ?? null;

  if (selectedId === null && list.length > 0) {
    setSelectedId(list[0].id);
    setDraft({ ...list[0] });
  }

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

  const handleRowSelected = (args: { data: RestaurantTable | RestaurantTable[] }) => {
    const row = Array.isArray(args.data) ? args.data[0] : args.data;
    if (row?.id !== undefined) {
      setSelectedId(row.id);
      setDraft({ ...row });
      setErrorMsg(null);
    }
  };

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
    setErrorMsg(null);
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    setErrorMsg(null);
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

  const statusOptions: TableStatus[] = ["AVAILABLE", "OCCUPIED"];

  return (
    <>
      <WinToolbar
        left={
          <>
            <TB icon={ChromeIcons.Plus} onClick={handleCreate}>Tạo mới</TB>
            <TB icon={ChromeIcons.Save} onClick={handleSave} kind="primary" disabled={!draft || saving}>Lưu</TB>
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
          title="Thông tin Bàn"
          collapsed={collapsed}
          onToggle={() => setCollapsed(c => !c)}
        >
          {draft ? (
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
              {sel && (
                <Field label="Trạng thái">
                  <select value={draft.status ?? "AVAILABLE"} disabled>
                    {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              )}
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
              Chọn một Bàn từ danh sách bên phải, hoặc bấm Tạo mới.
            </div>
          )}
        </DetailPanel>

        <div className="data-list">
          {tables.loading && <LoadingBar text="Đang tải Bàn..." />}
          {tables.isOffline && <OfflineBar onRetry={() => tables.reload()} />}
          {tables.isApiError && <ErrorBar text={tables.error ?? ""} onRetry={() => tables.reload()} />}
          <GridComponent
            dataSource={dataView}
            allowSorting
            allowPaging
            allowFiltering
            pageSettings={{ pageSize: 20 }}
            sortSettings={sortSettings}
            rowSelected={handleRowSelected}
            selectedRowIndex={selectedId !== null ? dataView.findIndex(t => t.id === selectedId) : -1}
            height="100%"
          >
            <ColumnsDirective>
              <ColumnDirective field="id" headerText="ID" width="70" textAlign="Right" />
              <ColumnDirective field="code" headerText="Mã bàn" width="110" />
              <ColumnDirective field="seatCount" headerText="Số ghế" width="90" textAlign="Right" />
              <ColumnDirective field="counterName" headerText="Quầy" width="150" />
              <ColumnDirective field="areaName" headerText="Khu" width="160" />
              <ColumnDirective field="description" headerText="Mô tả" width="200" />
              <ColumnDirective field="status" headerText="Trạng thái" width="120" />
              <ColumnDirective field="isActive" headerText="Kích hoạt" width="110" displayAsCheckBox />
            </ColumnsDirective>
            <Inject services={[Page, Sort, Filter]} />
          </GridComponent>
        </div>
      </div>

      <StatusBar
        left={
          <>
            <span>{dataView.length} Bàn hiển thị</span>
            <span>·</span>
            <span>{dataView.filter(t => t.status === "AVAILABLE").length} sẵn sàng</span>
            <span>·</span>
            <span>{dataView.filter(t => t.status === "OCCUPIED").length} đang phục vụ</span>
            {tables.isOffline && <><span>·</span><span style={{ color: "var(--warning)" }}>offline (mock)</span></>}
          </>
        }
        right={<span>Trạng thái cập nhật theo Ticket — không sửa được tay</span>}
      />
    </>
  );
}
