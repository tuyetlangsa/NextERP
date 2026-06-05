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
import { countersApi, areasApi, type CounterUpsert } from "@/lib/api/restaurant";
import { useResource } from "@/lib/http/useResource";
import { useDomainVersion } from "@/lib/http/useDomainVersion";
import { Scopes } from "@/lib/api/sync";
import { LoadingBar, OfflineBar, ErrorBar } from "@/components/ui/ResourceBars";
import { mockCounters, mockAreas } from "@/data/mock";
import type { Counter } from "@/types/api/restaurant";

ensureSyncfusionLicense();

type Draft = Partial<Counter> & { name: string; displayOrder: number; isActive: boolean };

export function WinCounter() {
  const counters = useResource(() => countersApi.list(), { fallback: mockCounters });
  const areas = useResource(() => areasApi.list(), { fallback: mockAreas });

  useDomainVersion([Scopes.FloorPlan], () => {
    counters.reload();
    areas.reload();
  }, 5000);

  const list = counters.data ?? [];
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sel = list.find(c => c.id === selectedId) ?? null;

  // Initialize selection on first data arrival.
  if (selectedId === null && list.length > 0) {
    setSelectedId(list[0].id);
    setDraft({ ...list[0] });
  }

  const areasOfSelected = useMemo(
    () => (areas.data ?? []).filter(a => a.counterId === selectedId),
    [areas.data, selectedId]
  );

  const sortSettings: SortSettingsModel = {
    columns: [{ field: "displayOrder", direction: "Ascending" }],
  };

  const handleRowSelected = (args: { data: Counter | Counter[] }) => {
    const row = Array.isArray(args.data) ? args.data[0] : args.data;
    if (row?.id !== undefined) {
      setSelectedId(row.id);
      setDraft({ ...row });
      setErrorMsg(null);
    }
  };

  const handleCreate = () => {
    setSelectedId(null);
    setDraft({ name: "Quầy mới", note: null, displayOrder: list.length + 1, isActive: true });
    setErrorMsg(null);
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    setErrorMsg(null);
    const body: CounterUpsert = {
      name: draft.name.trim(),
      note: draft.note ?? null,
      displayOrder: draft.displayOrder,
      isActive: draft.isActive,
    };
    const res = sel
      ? await countersApi.update(sel.id, body)
      : await countersApi.create(body);

    if (res.isSuccess) {
      await counters.reload();
      setSelectedId(res.data.id);
      setDraft({ ...res.data });
    } else {
      setErrorMsg(res.detail || res.title);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!sel) return;
    if (!window.confirm(`Xoá Quầy "${sel.name}"?`)) return;
    setSaving(true);
    setErrorMsg(null);
    const res = await countersApi.remove(sel.id);
    if (res.isSuccess) {
      await counters.reload();
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
            <TB icon={ChromeIcons.Refresh} onClick={() => counters.reload()}>Làm mới</TB>
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
              {sel && <Field label="Mã"><input value={String(sel.id)} disabled /></Field>}
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

              {errorMsg && (
                <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 8 }}>{errorMsg}</div>
              )}

              {sel && (
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
              )}
            </>
          ) : (
            <div style={{ color: "var(--fg-muted)", fontSize: 12, padding: 12 }}>
              Chọn một Quầy từ danh sách bên phải, hoặc bấm Tạo mới.
            </div>
          )}
        </DetailPanel>

        <div className="data-list">
          {counters.loading && <LoadingBar text="Đang tải Quầy..." />}
          {counters.isOffline && <OfflineBar onRetry={() => counters.reload()} />}
          {counters.isApiError && <ErrorBar text={counters.error ?? ""} onRetry={() => counters.reload()} />}
          <GridComponent
            dataSource={list}
            allowSorting
            allowPaging
            allowFiltering
            pageSettings={{ pageSize: 20 }}
            sortSettings={sortSettings}
            rowSelected={handleRowSelected}
            selectedRowIndex={selectedId !== null ? list.findIndex(c => c.id === selectedId) : -1}
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
            {counters.isOffline && <><span>·</span><span style={{ color: "var(--warning)" }}>offline (mock)</span></>}
          </>
        }
        right={<span>Quầy là cấp cao nhất: Quầy → Khu → Bàn</span>}
      />
    </>
  );
}

