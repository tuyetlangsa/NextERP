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
import { areasApi, countersApi, tablesApi, type AreaUpsert } from "@/lib/api/restaurant";
import { useResource } from "@/lib/http/useResource";
import { mockAreas, mockCounters, mockTables } from "@/data/mock";
import type { Area } from "@/types/api/restaurant";

ensureSyncfusionLicense();

type Draft = Partial<Area> & {
  counterId: number;
  name: string;
  displayOrder: number;
  isActive: boolean;
};

export function WinArea() {
  const areas = useResource(() => areasApi.list(), { fallback: mockAreas });
  const counters = useResource(() => countersApi.list(), { fallback: mockCounters });
  const tables = useResource(() => tablesApi.list(), { fallback: mockTables });

  const list = areas.data ?? [];
  const counterList = counters.data ?? [];
  const tableList = tables.data ?? [];

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [counterFilter, setCounterFilter] = useState<number | "ALL">("ALL");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sel = list.find(a => a.id === selectedId) ?? null;

  if (selectedId === null && list.length > 0) {
    setSelectedId(list[0].id);
    setDraft({ ...list[0] });
  }

  const counterMap = useMemo(
    () => Object.fromEntries(counterList.map(c => [c.id, c])),
    [counterList]
  );

  const dataView = useMemo(() => {
    const filtered = counterFilter === "ALL" ? list : list.filter(a => a.counterId === counterFilter);
    return filtered.map(a => ({
      ...a,
      counterName: counterMap[a.counterId]?.name ?? "",
      tableCount: tableList.filter(t => t.areaId === a.id).length,
    }));
  }, [list, counterFilter, counterMap, tableList]);

  const sortSettings: SortSettingsModel = {
    columns: [{ field: "displayOrder", direction: "Ascending" }],
  };

  const handleRowSelected = (args: { data: Area | Area[] }) => {
    const row = Array.isArray(args.data) ? args.data[0] : args.data;
    if (row?.id !== undefined) {
      setSelectedId(row.id);
      setDraft({ ...row });
      setErrorMsg(null);
    }
  };

  const handleCreate = () => {
    setSelectedId(null);
    setDraft({
      counterId: counterFilter === "ALL" ? counterList[0]?.id ?? 0 : counterFilter,
      name: "Khu mới",
      description: null,
      displayOrder: list.length + 1,
      isActive: true,
    });
    setErrorMsg(null);
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    setErrorMsg(null);
    const body: AreaUpsert = {
      counterId: draft.counterId,
      name: draft.name.trim(),
      description: draft.description ?? null,
      displayOrder: draft.displayOrder,
      isActive: draft.isActive,
    };
    const res = sel ? await areasApi.update(sel.id, body) : await areasApi.create(body);

    if (res.isSuccess) {
      await areas.reload();
      setSelectedId(res.data.id);
      setDraft({ ...res.data });
    } else {
      setErrorMsg(res.detail || res.title);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!sel) return;
    if (!window.confirm(`Xoá Khu "${sel.name}"?`)) return;
    setSaving(true);
    setErrorMsg(null);
    const res = await areasApi.remove(sel.id);
    if (res.isSuccess) {
      await areas.reload();
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
            <TB icon={ChromeIcons.Save} onClick={handleSave} kind="primary" disabled={!draft || saving}>Lưu</TB>
            <TB icon={ChromeIcons.Trash} onClick={handleDelete} kind="danger" disabled={!sel || saving}>Xoá</TB>
            <div className="tb-divider" />
            <TB icon={ChromeIcons.Refresh} onClick={() => areas.reload()}>Làm mới</TB>
            <TB icon={ChromeIcons.Export}>Xuất dữ liệu</TB>
            <div className="tb-divider" />
            <span className="tb-help">Quầy:</span>
            <select
              value={String(counterFilter)}
              onChange={e => setCounterFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
              style={{ padding: "5px 8px", border: "1px solid var(--border-strong)", borderRadius: 4 }}
            >
              <option value="ALL">Tất cả</option>
              {counterList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </>
        }
        right={<TB icon={ChromeIcons.Help}>Trợ giúp</TB>}
      />

      <div className="win-body">
        <DetailPanel
          title="Thông tin Khu"
          collapsed={collapsed}
          onToggle={() => setCollapsed(c => !c)}
        >
          {draft ? (
            <>
              {sel && <Field label="Mã"><input value={String(sel.id)} disabled /></Field>}
              <Field label="Tên Khu" required>
                <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
              </Field>
              <Field label="Mô tả">
                <textarea
                  rows={3}
                  value={draft.description ?? ""}
                  onChange={e => setDraft({ ...draft, description: e.target.value || null })}
                />
              </Field>
              <Field label="Quầy" required>
                <select
                  value={draft.counterId}
                  onChange={e => setDraft({ ...draft, counterId: Number(e.target.value) })}
                >
                  {counterList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Thứ tự hiển thị">
                <input
                  type="number"
                  min={0}
                  value={draft.displayOrder}
                  onChange={e => setDraft({ ...draft, displayOrder: Number(e.target.value) })}
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
              Chọn một Khu từ danh sách bên phải, hoặc bấm Tạo mới.
            </div>
          )}
        </DetailPanel>

        <div className="data-list">
          {areas.loading && <LoadingBar text="Đang tải Khu..." />}
          {areas.isOffline && <OfflineBar onRetry={() => areas.reload()} />}
          {areas.isApiError && <ErrorBar text={areas.error ?? ""} onRetry={() => areas.reload()} />}
          <GridComponent
            dataSource={dataView}
            allowSorting
            allowPaging
            allowFiltering
            pageSettings={{ pageSize: 20 }}
            sortSettings={sortSettings}
            rowSelected={handleRowSelected}
            selectedRowIndex={selectedId !== null ? dataView.findIndex(a => a.id === selectedId) : -1}
            height="100%"
          >
            <ColumnsDirective>
              <ColumnDirective field="id" headerText="ID" width="70" textAlign="Right" />
              <ColumnDirective field="name" headerText="Tên Khu" width="180" />
              <ColumnDirective field="description" headerText="Mô tả" width="240" />
              <ColumnDirective field="counterName" headerText="Quầy" width="160" />
              <ColumnDirective field="tableCount" headerText="Số bàn" width="90" textAlign="Right" />
              <ColumnDirective field="displayOrder" headerText="Thứ tự" width="90" textAlign="Right" />
              <ColumnDirective field="isActive" headerText="Kích hoạt" width="110" displayAsCheckBox />
            </ColumnsDirective>
            <Inject services={[Page, Sort, Filter]} />
          </GridComponent>
        </div>
      </div>

      <StatusBar
        left={
          <>
            <span>{dataView.length} Khu hiển thị</span>
            <span>·</span>
            <span>{dataView.filter(a => a.isActive).length} đang hoạt động</span>
            {areas.isOffline && <><span>·</span><span style={{ color: "var(--warning)" }}>offline (mock)</span></>}
          </>
        }
        right={<span>Khu thuộc Quầy, chứa nhiều Bàn</span>}
      />
    </>
  );
}
