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
import { shiftsApi } from "@/lib/api/masterData";
import { useResource } from "@/lib/http/useResource";
import { formatApiError } from "@/lib/http/formatError";
import { computeIsNextDay, toTimeInput } from "@/lib/masterData/time";
import { mockShifts } from "@/data/mock";
import type { Shift, ShiftUpsert } from "@/types/api/masterData";

ensureSyncfusionLicense();

type ActiveFilter = "ALL" | "ACTIVE" | "INACTIVE";
type Draft = Partial<Shift> & {
  code: string;
  name: string;
  beginTime: string;
  endTime: string;
  isNextDay: boolean;
  isActive: boolean;
};

function validateShift(draft: Draft): string | null {
  const code = draft.code.trim();
  if (!code) return "Mã ca là bắt buộc.";
  if (code.length > 20) return "Mã tối đa 20 ký tự.";
  const name = draft.name.trim();
  if (!name) return "Tên ca là bắt buộc.";
  if (name.length > 50) return "Tên tối đa 50 ký tự.";
  if (!draft.beginTime) return "Giờ bắt đầu là bắt buộc.";
  if (!draft.endTime) return "Giờ kết thúc là bắt buộc.";
  const note = draft.note?.trim();
  if (note && note.length > 200) return "Ghi chú tối đa 200 ký tự.";
  return null;
}

/** Grid display: "22:00:00" → "22:00" */
function formatTimeColumn(value: string): string {
  return toTimeInput(value);
}

export function WinShift() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("ALL");
  const listQuery = useMemo(() => {
    const q: { search?: string; isActive?: boolean } = {};
    if (search.trim()) q.search = search.trim();
    if (activeFilter === "ACTIVE") q.isActive = true;
    if (activeFilter === "INACTIVE") q.isActive = false;
    return q;
  }, [search, activeFilter]);

  const shifts = useResource(() => shiftsApi.list(listQuery), {
    fallback: mockShifts,
    deps: [listQuery.search, listQuery.isActive],
  });

  const list = useMemo(
    () =>
      (shifts.data ?? []).map(s => ({
        ...s,
        beginTimeDisplay: formatTimeColumn(s.beginTime),
        endTimeDisplay: formatTimeColumn(s.endTime),
      })),
    [shifts.data]
  );

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sel = list.find(s => s.id === selectedId) ?? null;

  const initSelectedRef = useRef(false);
  useEffect(() => {
    if (!initSelectedRef.current && list.length > 0) {
      initSelectedRef.current = true;
      const first = list[0];
      setSelectedId(first.id);
      setDraft({
        ...first,
        beginTime: toTimeInput(first.beginTime),
        endTime: toTimeInput(first.endTime),
      });
    }
  }, [list]);

  const sortSettings: SortSettingsModel = {
    columns: [{ field: "beginTimeDisplay", direction: "Ascending" }],
  };

  const handleRowSelected = (args: { data: (typeof list)[number] | (typeof list)[number][] }) => {
    const row = Array.isArray(args.data) ? args.data[0] : args.data;
    if (row?.id === undefined || row.id === selectedId) return;
    setSelectedId(row.id);
    setDraft({
      ...row,
      beginTime: toTimeInput(row.beginTime),
      endTime: toTimeInput(row.endTime),
    });
    setErrorMsg(null);
  };

  const updateTime = (field: "beginTime" | "endTime", value: string) => {
    if (!draft) return;
    const next = { ...draft, [field]: value };
    next.isNextDay = computeIsNextDay(next.beginTime, next.endTime);
    setDraft(next);
  };

  const handleCreate = () => {
    setSelectedId(null);
    setDraft({
      code: "",
      name: "",
      beginTime: "06:00",
      endTime: "14:00",
      isNextDay: false,
      note: null,
      isActive: true,
    });
    setErrorMsg(null);
  };

  const handleSave = async () => {
    if (!draft) return;
    const validation = validateShift(draft);
    if (validation) {
      setErrorMsg(validation);
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    const isNextDay = computeIsNextDay(draft.beginTime, draft.endTime);
    const body: ShiftUpsert = {
      code: draft.code.trim(),
      name: draft.name.trim(),
      beginTime: draft.beginTime,
      endTime: draft.endTime,
      isNextDay,
      note: draft.note?.trim() || null,
      isActive: draft.isActive,
    };
    const res = sel
      ? await shiftsApi.update(sel.id, body)
      : await shiftsApi.create(body);

    if (res.isSuccess) {
      await shifts.reload();
      setSelectedId(res.data.id);
      setDraft({
        ...res.data,
        beginTime: toTimeInput(res.data.beginTime),
        endTime: toTimeInput(res.data.endTime),
      });
    } else {
      setErrorMsg(formatApiError(res));
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!sel) return;
    if (!window.confirm(`Xoá ca "${sel.code} — ${sel.name}"?`)) return;
    setSaving(true);
    setErrorMsg(null);
    const res = await shiftsApi.remove(sel.id);
    if (res.isSuccess) {
      initSelectedRef.current = false;
      await shifts.reload();
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
            <TB icon={ChromeIcons.Refresh} onClick={() => shifts.reload()}>Làm mới</TB>
          </>
        }
        right={<TB icon={ChromeIcons.Help}>Trợ giúp</TB>}
      />

      <div className="win-body">
        <DetailPanel
          title="Thông tin ca làm việc"
          collapsed={collapsed}
          onToggle={() => setCollapsed(c => !c)}
        >
          {draft ? (
            <>
              {sel && <Field label="ID"><input value={String(sel.id)} disabled /></Field>}
              <Field label="Code" required>
                <input
                  value={draft.code}
                  onChange={e => setDraft({ ...draft, code: e.target.value })}
                  placeholder="vd: S_MORNING, S_NIGHT"
                />
              </Field>
              <Field label="Tên hiển thị" required>
                <input
                  value={draft.name}
                  onChange={e => setDraft({ ...draft, name: e.target.value })}
                  placeholder="vd: Ca sáng, Ca đêm"
                />
              </Field>
              <Field label="Giờ bắt đầu" required>
                <input
                  type="time"
                  value={draft.beginTime}
                  onChange={e => updateTime("beginTime", e.target.value)}
                />
              </Field>
              <Field label="Giờ kết thúc" required>
                <input
                  type="time"
                  value={draft.endTime}
                  onChange={e => updateTime("endTime", e.target.value)}
                />
              </Field>
              <Field label="Qua ngày hôm sau">
                <input
                  type="checkbox"
                  checked={draft.isNextDay}
                  onChange={e => setDraft({ ...draft, isNextDay: e.target.checked })}
                />
                <span style={{ marginLeft: 8, fontSize: 11, color: "var(--fg-muted)" }}>
                  Tự động bật khi giờ kết thúc &lt; giờ bắt đầu
                </span>
              </Field>
              <Field label="Ghi chú">
                <textarea
                  rows={3}
                  value={draft.note ?? ""}
                  onChange={e => setDraft({ ...draft, note: e.target.value || null })}
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
                <div>• Ca đêm: bắt đầu 22:00, kết thúc 06:00 — bật Qua ngày hôm sau.</div>
                <div>• Không xoá được nếu đang có Ticket/Phiên quầy tham chiếu — hãy tắt Kích hoạt.</div>
              </div>
            </>
          ) : (
            <div style={{ color: "var(--fg-muted)", fontSize: 12, padding: 12 }}>
              Chọn một ca từ danh sách, hoặc bấm Tạo mới.
            </div>
          )}
        </DetailPanel>

        <div className="data-list">
          <div className="grid-filterbar">
            <strong style={{ fontSize: 13 }}>Danh sách ca làm việc</strong>
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
          {shifts.loading && <LoadingBar text="Đang tải ca..." />}
          {shifts.isOffline && <OfflineBar onRetry={() => shifts.reload()} />}
          {shifts.isApiError && <ErrorBar text={shifts.error ?? ""} onRetry={() => shifts.reload()} />}
          <GridComponent
            dataSource={list}
            allowSorting
            allowPaging
            allowFiltering
            filterSettings={{ type: "Menu" }}
            pageSettings={{ pageSize: 20 }}
            sortSettings={sortSettings}
            rowSelected={handleRowSelected}
            selectedRowIndex={selectedId !== null ? list.findIndex(s => s.id === selectedId) : -1}
            height="100%"
          >
            <ColumnsDirective>
              <ColumnDirective field="code" headerText="Code" width="120" />
              <ColumnDirective field="name" headerText="Tên" width="180" />
              <ColumnDirective field="beginTimeDisplay" headerText="Bắt đầu" width="100" />
              <ColumnDirective field="endTimeDisplay" headerText="Kết thúc" width="100" />
              <ColumnDirective field="isNextDay" headerText="Qua ngày" width="100" displayAsCheckBox />
              <ColumnDirective field="isActive" headerText="Kích hoạt" width="110" displayAsCheckBox />
            </ColumnsDirective>
            <Inject services={[Page, Sort, Filter]} />
          </GridComponent>
        </div>
      </div>

      <StatusBar
        left={
          <>
            <span>{list.length} ca</span>
            <span>·</span>
            <span>{list.filter(s => s.isActive).length} đang hoạt động</span>
            {shifts.isOffline && <><span>·</span><span style={{ color: "var(--warning)" }}>offline (mock)</span></>}
          </>
        }
        right={<span>Master data — Cashier chọn ca khi mở phiên</span>}
      />
    </>
  );
}
