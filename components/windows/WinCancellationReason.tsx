"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { cancellationReasonsApi } from "@/lib/api/masterData";
import { useResource } from "@/lib/http/useResource";
import { formatApiError } from "@/lib/http/formatError";
import { mockCancellationReasons } from "@/data/mock";
import type { CancellationReason, CancellationReasonUpsert } from "@/types/api/masterData";

ensureSyncfusionLicense();

/** Seeded system reasons — warn before edit/delete. */
export const SYSTEM_CANCELLATION_CODES = new Set([
  "CUS_CHANGE_MIND",
  "OUT_OF_STOCK",
  "WRONG_DISH",
  "FOREIGN_OBJECT",
  "QUALITY",
  "OTHER",
]);

type ActiveFilter = "ALL" | "ACTIVE" | "INACTIVE";
type Draft = Partial<CancellationReason> & {
  code: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
};

function isSystemReason(code: string): boolean {
  return SYSTEM_CANCELLATION_CODES.has(code.trim().toUpperCase());
}

function validateCancellationReason(draft: Draft): string | null {
  const code = draft.code.trim();
  if (!code) return "Mã lý do là bắt buộc.";
  if (code.length > 20) return "Mã tối đa 20 ký tự.";
  const name = draft.name.trim();
  if (!name) return "Tên lý do là bắt buộc.";
  if (name.length > 50) return "Tên tối đa 50 ký tự.";
  return null;
}

export function WinCancellationReason() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("ALL");
  const listQuery = useMemo(() => {
    const q: { search?: string; isActive?: boolean } = {};
    if (search.trim()) q.search = search.trim();
    if (activeFilter === "ACTIVE") q.isActive = true;
    if (activeFilter === "INACTIVE") q.isActive = false;
    return q;
  }, [search, activeFilter]);

  const reasons = useResource(() => cancellationReasonsApi.list(listQuery), {
    fallback: mockCancellationReasons,
    deps: [listQuery.search, listQuery.isActive],
  });

  const list = reasons.data ?? [];
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sel = list.find(r => r.id === selectedId) ?? null;
  const isSystem = sel ? isSystemReason(sel.code) : false;

  const initSelectedRef = useRef(false);
  useEffect(() => {
    if (!initSelectedRef.current && list.length > 0) {
      initSelectedRef.current = true;
      setSelectedId(list[0].id);
      setDraft({ ...list[0] });
    }
  }, [list]);

  const sortSettings: SortSettingsModel = {
    columns: [{ field: "displayOrder", direction: "Ascending" }],
  };

  const handleRowSelected = (args: { data: CancellationReason | CancellationReason[] }) => {
    const row = Array.isArray(args.data) ? args.data[0] : args.data;
    if (row?.id === undefined || row.id === selectedId) return;
    setSelectedId(row.id);
    setDraft({ ...row });
    setErrorMsg(null);
  };

  const handleCreate = () => {
    setSelectedId(null);
    setDraft({
      code: "",
      name: "",
      displayOrder: list.length > 0 ? Math.max(...list.map(r => r.displayOrder)) + 1 : 1,
      isActive: true,
    });
    setErrorMsg(null);
  };

  const handleSave = async () => {
    if (!draft) return;
    if (sel && isSystemReason(sel.code)) {
      const ok = window.confirm(
        `"${sel.code}" là lý do hệ thống. Bạn có chắc muốn sửa?`
      );
      if (!ok) return;
    }
    const validation = validateCancellationReason(draft);
    if (validation) {
      setErrorMsg(validation);
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    const body: CancellationReasonUpsert = {
      code: draft.code.trim(),
      name: draft.name.trim(),
      displayOrder: Number(draft.displayOrder ?? 0),
      isActive: draft.isActive,
    };
    const res = sel
      ? await cancellationReasonsApi.update(sel.id, body)
      : await cancellationReasonsApi.create(body);

    if (res.isSuccess) {
      await reasons.reload();
      setSelectedId(res.data.id);
      setDraft({ ...res.data });
    } else {
      setErrorMsg(formatApiError(res));
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!sel) return;
    if (isSystemReason(sel.code)) {
      const ok = window.confirm(
        `"${sel.code}" là lý do hệ thống. Xoá có thể ảnh hưởng báo cáo. Tiếp tục?`
      );
      if (!ok) return;
    } else if (!window.confirm(`Xoá lý do "${sel.code} — ${sel.name}"?`)) {
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    const res = await cancellationReasonsApi.remove(sel.id);
    if (res.isSuccess) {
      initSelectedRef.current = false;
      await reasons.reload();
      setSelectedId(null);
      setDraft(null);
    } else {
      setErrorMsg(formatApiError(res));
    }
    setSaving(false);
  };

  return (
    <>
      <WinToolbar
        left={
          <>
            <TB icon={ChromeIcons.Plus} onClick={handleCreate}>Tạo mới</TB>
            <TB icon={ChromeIcons.Save} onClick={handleSave} kind="primary" disabled={!draft || saving}>
              Lưu
            </TB>
            <TB icon={ChromeIcons.Trash} onClick={handleDelete} kind="danger" disabled={!sel || saving}>
              Xoá
            </TB>
            <div className="tb-divider" />
            <TB icon={ChromeIcons.Refresh} onClick={() => reasons.reload()}>Làm mới</TB>
          </>
        }
        right={<TB icon={ChromeIcons.Help}>Trợ giúp</TB>}
      />

      <div className="win-body">
        <DetailPanel
          title="Thông tin lý do huỷ/trả"
          collapsed={collapsed}
          onToggle={() => setCollapsed(c => !c)}
        >
          {draft ? (
            <>
              {sel && <Field label="ID"><input value={String(sel.id)} disabled /></Field>}
              {isSystem && (
                <div style={{ padding: "8px 10px", marginBottom: 10, background: "#fef3c7", borderRadius: 4, fontSize: 12, color: "#92400e" }}>
                  Lý do hệ thống — cẩn thận khi sửa/xoá. Nên tắt Kích hoạt thay vì xoá.
                </div>
              )}
              <Field label="Code" required>
                <input
                  value={draft.code}
                  onChange={e => setDraft({ ...draft, code: e.target.value })}
                  placeholder="vd: ALLERGY"
                  disabled={isSystem}
                />
              </Field>
              <Field label="Tên hiển thị" required>
                <input
                  value={draft.name}
                  onChange={e => setDraft({ ...draft, name: e.target.value })}
                  placeholder="vd: Dị ứng thực phẩm"
                />
              </Field>
              <Field label="Thứ tự hiển thị">
                <input
                  type="number"
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
                <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 8, whiteSpace: "pre-wrap" }}>
                  {errorMsg}
                </div>
              )}
              <div style={{ marginTop: 16, padding: 10, background: "#f4f4f5", borderRadius: 4, fontSize: 11, color: "var(--fg-muted)" }}>
                <div>• Lý do đã dùng trong Order/Ticket không xoá được — hãy tắt Kích hoạt.</div>
                <div>• Cashier dùng lookup riêng (chỉ lý do đang bật).</div>
              </div>
            </>
          ) : (
            <div style={{ color: "var(--fg-muted)", fontSize: 12, padding: 12 }}>
              Chọn một lý do từ danh sách, hoặc bấm Tạo mới.
            </div>
          )}
        </DetailPanel>

        <div className="data-list">
          <div className="grid-filterbar">
            <strong style={{ fontSize: 13 }}>Danh sách lý do huỷ/trả</strong>
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
              <label>Kích hoạt:</label>
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
          {reasons.loading && <LoadingBar text="Đang tải lý do..." />}
          {reasons.isOffline && <OfflineBar onRetry={() => reasons.reload()} />}
          {reasons.isApiError && <ErrorBar text={reasons.error ?? ""} onRetry={() => reasons.reload()} />}
          <GridComponent
            dataSource={list}
            allowSorting
            allowPaging
            allowFiltering
            filterSettings={{ type: "Menu" }}
            pageSettings={{ pageSize: 20 }}
            sortSettings={sortSettings}
            rowSelected={handleRowSelected}
            selectedRowIndex={selectedId !== null ? list.findIndex(r => r.id === selectedId) : -1}
            height="100%"
          >
            <ColumnsDirective>
              <ColumnDirective field="code" headerText="Code" width="150" />
              <ColumnDirective field="name" headerText="Tên" width="220" />
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
            <span>{list.length} lý do</span>
            <span>·</span>
            <span>{list.filter(r => r.isActive).length} đang hoạt động</span>
            {reasons.isOffline && <><span>·</span><span style={{ color: "var(--warning)" }}>offline (mock)</span></>}
          </>
        }
        right={<span>Master data — huỷ món / trả món tại Cashier</span>}
      />
    </>
  );
}
