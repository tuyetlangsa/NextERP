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
import type { Area, RestaurantTable, TableStatus } from "@/types/api/restaurant";

ensureSyncfusionLicense();

type Draft = RestaurantTable;

export function WinTable() {
  const [list, setList] = useState<RestaurantTable[]>(mockTables);
  const [selectedId, setSelectedId] = useState<number>(mockTables[0].id);
  const [counterFilter, setCounterFilter] = useState<number | "ALL">("ALL");
  const [areaFilter, setAreaFilter] = useState<number | "ALL">("ALL");
  const [collapsed, setCollapsed] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(mockTables[0]);

  const areaMap = useMemo(
    () => Object.fromEntries(mockAreas.map(a => [a.id, a])),
    []
  );
  const counterMap = useMemo(
    () => Object.fromEntries(mockCounters.map(c => [c.id, c])),
    []
  );

  // When counterFilter changes, restrict area dropdown to areas in that counter.
  const availableAreas: Area[] = useMemo(() => {
    if (counterFilter === "ALL") return mockAreas;
    return mockAreas.filter(a => a.counterId === counterFilter);
  }, [counterFilter]);

  const dataView = useMemo(() => {
    let rows = list;
    if (counterFilter !== "ALL") {
      const areaIds = mockAreas.filter(a => a.counterId === counterFilter).map(a => a.id);
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
  }, [list, counterFilter, areaFilter, areaMap, counterMap]);

  const sortSettings: SortSettingsModel = {
    columns: [{ field: "code", direction: "Ascending" }],
  };

  const handleRowSelected = (args: { data: RestaurantTable | RestaurantTable[] }) => {
    const row = Array.isArray(args.data) ? args.data[0] : args.data;
    if (row?.id !== undefined) {
      setSelectedId(row.id);
      setDraft(list.find(t => t.id === row.id) ?? null);
    }
  };

  const handleSave = () => {
    if (!draft) return;
    setList(list.map(t => (t.id === draft.id ? draft : t)));
  };

  const handleCreate = () => {
    const id = Math.max(0, ...list.map(t => t.id)) + 1;
    const fallbackAreaId =
      areaFilter !== "ALL"
        ? areaFilter
        : availableAreas[0]?.id ?? mockAreas[0].id;
    const fresh: RestaurantTable = {
      id,
      areaId: fallbackAreaId,
      code: `T${String(id).padStart(2, "0")}`,
      seatCount: 4,
      description: null,
      status: "AVAILABLE",
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
    setList(list.filter(t => t.id !== draft.id));
    setDraft(null);
  };

  const statusOptions: TableStatus[] = ["AVAILABLE", "OCCUPIED"];

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
              onChange={e => {
                const v = e.target.value === "ALL" ? "ALL" : Number(e.target.value);
                setCounterFilter(v);
                setAreaFilter("ALL");
              }}
              style={{ padding: "5px 8px", border: "1px solid var(--border-strong)", borderRadius: 4 }}
            >
              <option value="ALL">Tất cả</option>
              {mockCounters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
              <Field label="Mã"><input value={String(draft.id)} disabled /></Field>
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
                  {mockAreas.map(a => (
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
              <Field label="Trạng thái">
                <select
                  value={draft.status}
                  onChange={e => setDraft({ ...draft, status: e.target.value as TableStatus })}
                >
                  {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
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
              Chọn một Bàn từ danh sách bên phải.
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
            selectedRowIndex={dataView.findIndex(t => t.id === selectedId)}
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
          </>
        }
        right={<span>Bàn thuộc Khu. Trạng thái cập nhật theo Ticket.</span>}
      />
    </>
  );
}
