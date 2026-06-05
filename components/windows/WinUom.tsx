"use client";

import { useState } from "react";
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
import { uomsApi, type UomUpsert } from "@/lib/api/menu";
import { useResource } from "@/lib/http/useResource";
import { useDomainVersion } from "@/lib/http/useDomainVersion";
import { Scopes } from "@/lib/api/sync";
import { mockUoms } from "@/data/mock";
import type { Uom } from "@/types/api/menu";

ensureSyncfusionLicense();

type Draft = Partial<Uom> & { code: string; name: string; isActive: boolean };

export function WinUom() {
  const uoms = useResource(() => uomsApi.list(), { fallback: mockUoms });

  // Auto-refetch when another client edits any MENU master data.
  useDomainVersion([Scopes.Menu], () => uoms.reload(), 5000);

  const list = uoms.data ?? [];
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sel = list.find(u => u.id === selectedId) ?? null;

  if (selectedId === null && list.length > 0) {
    setSelectedId(list[0].id);
    setDraft({ ...list[0] });
  }

  const sortSettings: SortSettingsModel = {
    columns: [{ field: "code", direction: "Ascending" }],
  };

  const handleRowSelected = (args: { data: Uom | Uom[] }) => {
    const row = Array.isArray(args.data) ? args.data[0] : args.data;
    if (row?.id !== undefined) {
      setSelectedId(row.id);
      setDraft({ ...row });
      setErrorMsg(null);
    }
  };

  const handleCreate = () => {
    setSelectedId(null);
    setDraft({ code: "", name: "", description: null, isActive: true });
    setErrorMsg(null);
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    setErrorMsg(null);
    const body: UomUpsert = {
      code: draft.code.trim(),
      name: draft.name.trim(),
      description: draft.description ?? null,
      isActive: draft.isActive,
    };
    const res = sel ? await uomsApi.update(sel.id, body) : await uomsApi.create(body);

    if (res.isSuccess) {
      await uoms.reload();
      setSelectedId(res.data.id);
      setDraft({ ...res.data });
    } else {
      setErrorMsg(res.detail || res.title);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!sel) return;
    if (!window.confirm(`Xoá đơn vị tính "${sel.code} — ${sel.name}"?`)) return;
    setSaving(true);
    setErrorMsg(null);
    const res = await uomsApi.remove(sel.id);
    if (res.isSuccess) {
      await uoms.reload();
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
            <TB icon={ChromeIcons.Refresh} onClick={() => uoms.reload()}>Làm mới</TB>
            <TB icon={ChromeIcons.Export}>Xuất dữ liệu</TB>
          </>
        }
        right={<TB icon={ChromeIcons.Help}>Trợ giúp</TB>}
      />

      <div className="win-body">
        <DetailPanel
          title="Thông tin đơn vị tính"
          collapsed={collapsed}
          onToggle={() => setCollapsed(c => !c)}
        >
          {draft ? (
            <>
              {sel && <Field label="Mã"><input value={String(sel.id)} disabled /></Field>}
              <Field label="Code" required>
                <input
                  value={draft.code}
                  onChange={e => setDraft({ ...draft, code: e.target.value })}
                  placeholder="vd: chai, phan, kg"
                />
              </Field>
              <Field label="Tên hiển thị" required>
                <input
                  value={draft.name}
                  onChange={e => setDraft({ ...draft, name: e.target.value })}
                  placeholder="vd: Chai, Phần, Kilogam"
                />
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
              <div style={{ marginTop: 16, padding: 10, background: "#f4f4f5", borderRadius: 4, fontSize: 11, color: "var(--fg-muted)" }}>
                <div>• Code không phân biệt hoa/thường khi check trùng.</div>
                <div>• Đổi Code không phá lịch sử — Cart/Order đã snapshot.</div>
                <div>• Không xoá được nếu đang dùng — hãy tắt Kích hoạt.</div>
              </div>
            </>
          ) : (
            <div style={{ color: "var(--fg-muted)", fontSize: 12, padding: 12 }}>
              Chọn một đơn vị tính từ danh sách, hoặc bấm Tạo mới.
            </div>
          )}
        </DetailPanel>

        <div className="data-list">
          {uoms.loading && <LoadingBar text="Đang tải đơn vị tính..." />}
          {uoms.isOffline && <OfflineBar onRetry={() => uoms.reload()} />}
          {uoms.isApiError && <ErrorBar text={uoms.error ?? ""} onRetry={() => uoms.reload()} />}
          <GridComponent
            dataSource={list}
            allowSorting
            allowPaging
            allowFiltering
            pageSettings={{ pageSize: 20 }}
            sortSettings={sortSettings}
            rowSelected={handleRowSelected}
            selectedRowIndex={selectedId !== null ? list.findIndex(u => u.id === selectedId) : -1}
            height="100%"
          >
            <ColumnsDirective>
              <ColumnDirective field="id" headerText="ID" width="70" textAlign="Right" />
              <ColumnDirective field="code" headerText="Code" width="120" />
              <ColumnDirective field="name" headerText="Tên" width="180" />
              <ColumnDirective field="description" headerText="Mô tả" width="320" />
              <ColumnDirective field="isActive" headerText="Kích hoạt" width="110" displayAsCheckBox />
            </ColumnsDirective>
            <Inject services={[Page, Sort, Filter]} />
          </GridComponent>
        </div>
      </div>

      <StatusBar
        left={
          <>
            <span>{list.length} đơn vị tính</span>
            <span>·</span>
            <span>{list.filter(u => u.isActive).length} đang hoạt động</span>
            {uoms.isOffline && <><span>·</span><span style={{ color: "var(--warning)" }}>offline (mock)</span></>}
          </>
        }
        right={<span>Master data — dùng cho Item, Cart, Order, Bill</span>}
      />
    </>
  );
}
