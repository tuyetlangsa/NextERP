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
import { ChromeIcons } from "@/components/desktop/icons";
import { mockAreas, mockCounters, mockTables } from "@/data/mock";
import type { Area } from "@/types/api/restaurant";

ensureSyncfusionLicense();

type Draft = Area;

export function WinArea() {
  const [list, setList] = useState<Area[]>(mockAreas);
  const [selectedId, setSelectedId] = useState<number>(mockAreas[0].id);
  const [counterFilter, setCounterFilter] = useState<number | "ALL">("ALL");
  const [collapsed, setCollapsed] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(mockAreas[0]);

  const counterMap = useMemo(
    () => Object.fromEntries(mockCounters.map(c => [c.id, c])),
    []
  );

  const dataView = useMemo(() => {
    const filtered = counterFilter === "ALL" ? list : list.filter(a => a.counterId === counterFilter);
    return filtered.map(a => ({
      ...a,
      counterName: counterMap[a.counterId]?.name ?? "",
      tableCount: mockTables.filter(t => t.areaId === a.id).length,
    }));
  }, [list, counterFilter, counterMap]);

  const sortSettings: SortSettingsModel = {
    columns: [{ field: "displayOrder", direction: "Ascending" }],
  };

  const handleRowSelected = (args: { data: Area | Area[] }) => {
    const row = Array.isArray(args.data) ? args.data[0] : args.data;
    if (row?.id !== undefined) {
      setSelectedId(row.id);
      setDraft(list.find(a => a.id === row.id) ?? null);
    }
  };

  const handleSave = () => {
    if (!draft) return;
    setList(list.map(a => (a.id === draft.id ? draft : a)));
  };

  const handleCreate = () => {
    const id = Math.max(0, ...list.map(a => a.id)) + 1;
    const fresh: Area = {
      id,
      counterId: counterFilter === "ALL" ? mockCounters[0].id : counterFilter,
      name: "Khu mới",
      description: null,
      displayOrder: list.length + 1,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setList([...list, fresh]);
    setSelectedId(id);
    setDraft(fresh);
  };

  const handleDelete = () => {
    if (!draft) return;
    setList(list.filter(a => a.id !== draft.id));
    setDraft(null);
  };

  return (
    <>
      <WinToolbar
        left={
          <>
            <TB icon={ChromeIcons.Plus} onClick={handleCreate}>Tạo mới</TB>
            <TB icon={ChromeIcons.Save} onClick={handleSave} kind="primary" disabled={!draft}>Lưu</TB>
            <TB icon={ChromeIcons.Trash} onClick={handleDelete} kind="danger" disabled={!draft}>Xoá</TB>
            <div className="tb-divider" />
            <TB icon={ChromeIcons.Refresh}>Làm mới</TB>
            <TB icon={ChromeIcons.Export}>Xuất dữ liệu</TB>
            <div className="tb-divider" />
            <span className="tb-help">Quầy:</span>
            <select
              value={String(counterFilter)}
              onChange={e => setCounterFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
              style={{ padding: "5px 8px", border: "1px solid var(--border-strong)", borderRadius: 4 }}
            >
              <option value="ALL">Tất cả</option>
              {mockCounters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
              <Field label="Mã"><input value={String(draft.id)} disabled /></Field>
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
                  {mockCounters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
            </>
          ) : (
            <div style={{ color: "var(--fg-muted)", fontSize: 12, padding: 12 }}>
              Chọn một Khu từ danh sách bên phải.
            </div>
          )}
        </DetailPanel>

        <div className="data-list">
          <GridComponent
            dataSource={dataView}
            allowSorting
            allowPaging
            allowFiltering
            pageSettings={{ pageSize: 20 }}
            sortSettings={sortSettings}
            rowSelected={handleRowSelected}
            selectedRowIndex={dataView.findIndex(a => a.id === selectedId)}
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
          </>
        }
        right={<span>Khu thuộc Quầy, chứa nhiều Bàn</span>}
      />
    </>
  );
}
