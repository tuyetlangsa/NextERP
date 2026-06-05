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
import { mockCounters, mockAreas } from "@/data/mock";
import type { Counter } from "@/types/api/restaurant";

ensureSyncfusionLicense();

type Draft = Omit<Counter, "createdAt" | "updatedAt"> & {
  createdAt?: string;
  updatedAt?: string;
};

export function WinCounter() {
  const [list, setList] = useState<Counter[]>(mockCounters);
  const [selectedId, setSelectedId] = useState<number>(mockCounters[0].id);
  const [collapsed, setCollapsed] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(mockCounters[0]);

  const sortSettings: SortSettingsModel = {
    columns: [{ field: "displayOrder", direction: "Ascending" }],
  };

  const areasOfSelected = useMemo(
    () => mockAreas.filter(a => a.counterId === selectedId),
    [selectedId]
  );

  const handleRowSelected = (args: { data: Counter | Counter[] }) => {
    const row = Array.isArray(args.data) ? args.data[0] : args.data;
    if (row?.id !== undefined) {
      setSelectedId(row.id);
      setDraft(list.find(c => c.id === row.id) ?? null);
    }
  };

  const handleSave = () => {
    if (!draft) return;
    setList(list.map(c => (c.id === draft.id ? { ...c, ...draft } as Counter : c)));
  };

  const handleCreate = () => {
    const id = Math.max(0, ...list.map(c => c.id)) + 1;
    const fresh: Counter = {
      id,
      name: "Quầy mới",
      note: null,
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
    setList(list.filter(c => c.id !== draft.id));
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
          </>
        }
        right={<TB icon={ChromeIcons.Help}>Trợ giúp</TB>}
      />

      <div className="win-body">
        <DetailPanel
          title="Thông tin Quầy"
          collapsed={collapsed}
          onToggle={() => setCollapsed(c => !c)}
        >
          {draft ? (
            <>
              <Field label="Mã"><input value={String(draft.id)} disabled /></Field>
              <Field label="Tên Quầy" required>
                <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
              </Field>
              <Field label="Ghi chú">
                <textarea
                  rows={3}
                  value={draft.note ?? ""}
                  onChange={e => setDraft({ ...draft, note: e.target.value || null })}
                />
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

              <div style={{ marginTop: 16 }}>
                <h4 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-muted)", margin: "0 0 8px" }}>
                  Khu thuộc Quầy ({areasOfSelected.length})
                </h4>
                <div style={{ maxHeight: 160, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 4, background: "#fff" }}>
                  {areasOfSelected.length === 0 ? (
                    <div style={{ padding: 12, textAlign: "center", color: "var(--fg-muted)", fontSize: 12 }}>
                      Quầy này chưa có khu
                    </div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <tbody>
                        {areasOfSelected.map((a, i) => (
                          <tr key={a.id} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td style={{ padding: "6px 10px", fontFamily: "var(--font-mono)", color: "var(--fg-muted)", width: 32 }}>{i + 1}</td>
                            <td style={{ padding: "6px 10px" }}>{a.name}</td>
                            <td style={{ padding: "6px 10px", textAlign: "right", color: "var(--fg-muted)" }}>#{a.displayOrder}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div style={{ color: "var(--fg-muted)", fontSize: 12, padding: 12 }}>
              Chọn một Quầy từ danh sách bên phải.
            </div>
          )}
        </DetailPanel>

        <div className="data-list">
          <GridComponent
            dataSource={list}
            allowSorting
            allowPaging
            allowFiltering
            pageSettings={{ pageSize: 20 }}
            sortSettings={sortSettings}
            rowSelected={handleRowSelected}
            selectedRowIndex={list.findIndex(c => c.id === selectedId)}
            height="100%"
          >
            <ColumnsDirective>
              <ColumnDirective field="id" headerText="ID" width="70" textAlign="Right" />
              <ColumnDirective field="name" headerText="Tên Quầy" width="200" />
              <ColumnDirective field="note" headerText="Ghi chú" width="240" />
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
            <span>{list.length} Quầy</span>
            <span>·</span>
            <span>{list.filter(c => c.isActive).length} đang hoạt động</span>
          </>
        }
        right={<span>Quầy là cấp cao nhất: Quầy → Khu → Bàn</span>}
      />
    </>
  );
}
