"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState } from "react";
import {
  ArrowLeft,
  Pencil,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { LoadingBar, ErrorBar } from "@/components/ui/ResourceBars";
import { TemplateWeekGrid } from "@/components/schedule/TemplateWeekGrid";
import { TemplateRoleDialog } from "@/components/schedule/TemplateRoleDialog";
import { TemplateConfirmDialog } from "@/components/schedule/TemplateConfirmDialog";
import { scheduleApi } from "@/lib/api/schedule";
import { lookupsApi } from "@/lib/api/lookups";
import { useResource } from "@/lib/http/useResource";
import { formatApiError } from "@/lib/http/formatError";
import { shortTime } from "@/lib/schedule/dates";
import { normalizeShiftLookups } from "@/lib/schedule/normalizeShifts";
import {
  cellKey,
  cellMapToUpsertLines,
  cloneRoles,
  expandAllCells,
  linesToCellMap,
  type TemplateRoleQty,
} from "@/lib/schedule/templateCells";
import type { AssignableRoleRow } from "@/types/api/access";
import type { ScheduleTemplateLookupItem } from "@/types/api/restaurant";

const DOW_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;
const PAGE_SIZE = 10;

type Banner = { kind: "error" | "info"; text: string } | null;

interface Props {
  roles: AssignableRoleRow[];
  /** Refresh active-only list used by "Tạo lịch" dialog (`GET /api/schedule-templates`). */
  onActiveTemplatesChanged?: () => Promise<unknown> | unknown;
  onBanner?: (banner: Banner) => void;
}

type EditorMode = "create" | "edit";

interface Draft {
  mode: EditorMode;
  id: number | null;
  name: string;
  description: string;
  isActive: boolean;
  cells: Map<string, TemplateRoleQty[]>;
}

export function TemplatePanel({
  roles,
  onActiveTemplatesChanged,
  onBanner,
}: Props) {
  /** Always load rows for the week grid from GET /api/lookups/shifts */
  const shiftsRes = useResource(() => lookupsApi.getShifts());
  const shifts = useMemo(
    () => normalizeShiftLookups(shiftsRes.data),
    [shiftsRes.data],
  );

  /** Management list: active + inactive via GET /api/lookups/schedule-templates */
  const templatesRes = useResource(() => lookupsApi.getScheduleTemplates());
  const templates = templatesRes.data ?? [];

  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [localBanner, setLocalBanner] = useState<Banner>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const [roleDialog, setRoleDialog] = useState<{
    dayOfWeek: number;
    shiftId: number;
  } | null>(null);

  const [dupSource, setDupSource] = useState<string | null>(null);
  const [dupTargets, setDupTargets] = useState<Set<string>>(() => new Set());
  const [toggleConfirm, setToggleConfirm] = useState<ScheduleTemplateLookupItem | null>(null);

  const setBanner = useCallback(
    (b: Banner) => {
      setLocalBanner(b);
      onBanner?.(b);
    },
    [onBanner],
  );

  const reloadLists = async () => {
    await templatesRes.reload();
    await onActiveTemplatesChanged?.();
  };

  const totalPages = Math.max(1, Math.ceil(templates.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return templates.slice(start, start + PAGE_SIZE);
  }, [templates, safePage]);

  useEffect(() => {
    setPage(1);
  }, [templates]);

  const openCreate = () => {
    setBanner(null);
    setDupSource(null);
    setDupTargets(new Set());
    setDraft({
      mode: "create",
      id: null,
      name: "",
      description: "",
      isActive: true,
      cells: new Map(),
    });
  };

  const openEdit = async (row: ScheduleTemplateLookupItem) => {
    setBanner(null);
    setBusy(true);
    const res = await scheduleApi.getTemplate(row.id);
    setBusy(false);
    if (!res.isSuccess) {
      setBanner({ kind: "error", text: formatApiError(res) });
      return;
    }
    setDupSource(null);
    setDupTargets(new Set());
    setDraft({
      mode: "edit",
      id: res.data.id,
      name: res.data.name,
      description: res.data.description ?? "",
      isActive: res.data.isActive,
      // API only returns requiredCount > 0 — pad zeros so Edit matches Create cells
      cells: expandAllCells(linesToCellMap(res.data.lines), roles),
    });
  };

  const closeEditor = async () => {
    setDraft(null);
    setRoleDialog(null);
    setDupSource(null);
    setDupTargets(new Set());
    await reloadLists();
  };

  const handleSave = async () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      setBanner({ kind: "error", text: "Tên template là bắt buộc." });
      return;
    }
    setBusy(true);
    const lines = cellMapToUpsertLines(draft.cells);
    const res =
      draft.mode === "create"
        ? await scheduleApi.createTemplate({
            name: draft.name.trim(),
            description: draft.description.trim() || null,
            lines,
          })
        : await scheduleApi.updateTemplate(draft.id!, {
            name: draft.name.trim(),
            description: draft.description.trim() || null,
            isActive: draft.isActive,
            lines,
          });
    setBusy(false);
    if (res.isSuccess) {
      await reloadLists();
      setBanner({
        kind: "info",
        text: draft.mode === "create" ? "Đã tạo template." : "Đã lưu template.",
      });
      setDraft(null);
      setRoleDialog(null);
      setDupSource(null);
      setDupTargets(new Set());
    } else {
      setBanner({ kind: "error", text: formatApiError(res) });
    }
  };

  /**
   * Toggle Kích hoạt → PUT /api/schedule-templates/{id} with flipped isActive
   * (keeps current name/description/lines). Confirmed via in-app dialog.
   */
  const requestToggleActive = (row: ScheduleTemplateLookupItem) => {
    setToggleConfirm(row);
  };

  const applyToggleActive = async () => {
    const row = toggleConfirm;
    if (!row) return;
    const next = !row.isActive;

    setBusy(true);
    const detailRes = await scheduleApi.getTemplate(row.id);
    if (!detailRes.isSuccess) {
      setBusy(false);
      setToggleConfirm(null);
      setBanner({ kind: "error", text: formatApiError(detailRes) });
      return;
    }
    const d = detailRes.data;
    const res = await scheduleApi.updateTemplate(row.id, {
      name: d.name,
      description: d.description,
      isActive: next,
      lines: d.lines.map(({ dayOfWeek, shiftId, roleId, requiredCount }) => ({
        dayOfWeek,
        shiftId,
        roleId,
        requiredCount,
      })),
    });
    setBusy(false);
    setToggleConfirm(null);
    if (res.isSuccess) {
      await reloadLists();
      setBanner({
        kind: "info",
        text: next ? "Đã kích hoạt template." : "Đã tắt template.",
      });
    } else {
      setBanner({ kind: "error", text: formatApiError(res) });
    }
  };

  const setCellRoles = (dayOfWeek: number, shiftId: number, rolesQty: TemplateRoleQty[]) => {
    setDraft(prev => {
      if (!prev) return prev;
      const next = new Map(prev.cells);
      const key = cellKey(dayOfWeek, shiftId);
      if (!rolesQty.some(r => r.requiredCount > 0)) next.delete(key);
      else next.set(key, rolesQty.map(r => ({ ...r })));
      return { ...prev, cells: next };
    });
  };

  const clearCell = (dayOfWeek: number, shiftId: number) => {
    setDraft(prev => {
      if (!prev) return prev;
      const next = new Map(prev.cells);
      next.delete(cellKey(dayOfWeek, shiftId));
      return { ...prev, cells: next };
    });
    setRoleDialog(null);
  };

  const startDuplicate = (dayOfWeek: number, shiftId: number) => {
    setDupSource(cellKey(dayOfWeek, shiftId));
    setDupTargets(new Set());
  };

  const cancelDuplicate = () => {
    setDupSource(null);
    setDupTargets(new Set());
  };

  const toggleTarget = (dayOfWeek: number, shiftId: number) => {
    if (!dupSource) return;
    const key = cellKey(dayOfWeek, shiftId);
    if (key === dupSource) return;
    setDupTargets(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const completeDuplicate = () => {
    if (!draft || !dupSource) return;
    const sourceRoles = draft.cells.get(dupSource);
    if (!sourceRoles) {
      cancelDuplicate();
      return;
    }
    const copied = cloneRoles(sourceRoles);
    setDraft(prev => {
      if (!prev) return prev;
      const next = new Map(prev.cells);
      for (const key of dupTargets) {
        next.set(key, cloneRoles(copied));
      }
      return { ...prev, cells: next };
    });
    cancelDuplicate();
  };

  const roleDialogContext = useMemo(() => {
    if (!roleDialog) return "";
    const shift = shifts.find(s => s.id === roleDialog.shiftId);
    const day = DOW_LABELS[roleDialog.dayOfWeek - 1] ?? "";
    const time = shift
      ? `${shortTime(shift.beginTime)} - ${shortTime(shift.endTime)}`
      : "";
    return `${shift?.name ?? "Ca"} - ${day}${time ? `, ${time}` : ""}`;
  }, [roleDialog, shifts]);

  const roleDialogInitial = useMemo(() => {
    if (!draft || !roleDialog) return [] as TemplateRoleQty[];
    return draft.cells.get(cellKey(roleDialog.dayOfWeek, roleDialog.shiftId)) ?? [];
  }, [draft, roleDialog]);

  if (!draft) {
    return (
      <div className="tpl-panel">
        {localBanner && (
          <div className={localBanner.kind === "error" ? "sched-error" : "sched-info"}>
            {localBanner.text}
          </div>
        )}
        {templatesRes.loading && <LoadingBar text="Đang tải template..." />}
        {templatesRes.isApiError && templatesRes.error && (
          <ErrorBar text={templatesRes.error} onRetry={() => templatesRes.reload()} />
        )}

        <button type="button" className="tpl-create-btn" onClick={openCreate} disabled={busy}>
          <Plus size={16} />
          Tạo template mới
        </button>

        <div className="tpl-list-head">
          <h3 className="tpl-list-title">Danh sách template</h3>
        </div>

        {templates.length === 0 && !templatesRes.loading ? (
          <div className="sched-info" style={{ margin: "0 0 12px" }}>
            Chưa có template — bấm &quot;Tạo template mới&quot; trước khi sinh lịch tuần.
          </div>
        ) : (
          <div className="sched-list-card">
            <div className="sched-list-table-wrap">
              <table className="sched-list-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tên template</th>
                    <th>Mô tả</th>
                    <th>Kích hoạt</th>
                    <th className="sched-col-actions">Hoạt động</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map(row => (
                    <tr key={row.id}>
                      <td>{row.id}</td>
                      <td>{row.name}</td>
                      <td>{row.description?.trim() || "—"}</td>
                      <td>
                        <input
                          type="checkbox"
                          className="cbx"
                          checked={!!row.isActive}
                          disabled={busy}
                          title={row.isActive ? "Bỏ chọn để tắt" : "Chọn để kích hoạt lại"}
                          onClick={e => {
                            e.preventDefault();
                            void requestToggleActive(row);
                          }}
                          onChange={() => {}}
                          aria-label={`Kích hoạt ${row.name}`}
                        />
                      </td>
                      <td className="sched-col-actions">
                        <div className="tpl-row-actions">
                          <button
                            type="button"
                            className="tpl-icon-btn"
                            title="Sửa"
                            disabled={busy}
                            onClick={() => void openEdit(row)}
                          >
                            <Pencil size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

                        <div className="tpl-pager">
              <div className="tpl-pager-nav">
                <button
                  type="button"
                  className="tpl-pager-btn"
                  disabled={safePage <= 1}
                  onClick={() => setPage(1)}
                  aria-label="Trang đầu"
                >
                  <ChevronsLeft size={16} />
                </button>
                <button
                  type="button"
                  className="tpl-pager-btn"
                  disabled={safePage <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  aria-label="Trang trước"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="tpl-pager-page is-current">{safePage}</span>
                <button
                  type="button"
                  className="tpl-pager-btn"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  aria-label="Trang sau"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  type="button"
                  className="tpl-pager-btn"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(totalPages)}
                  aria-label="Trang cuối"
                >
                  <ChevronsRight size={16} />
                </button>
              </div>
              <div className="tpl-pager-info">
                Trang {safePage} / {totalPages} ({templates.length} mục)
              </div>
            </div>
          </div>
        )}

        <TemplateConfirmDialog
          open={toggleConfirm !== null}
          title={toggleConfirm?.isActive ? "Tắt template" : "Kích hoạt template"}
          message={
            toggleConfirm
              ? toggleConfirm.isActive
                ? `Bạn có chắc muốn tắt template "${toggleConfirm.name}"?`
                : `Bạn có chắc muốn kích hoạt template "${toggleConfirm.name}"?`
              : ""
          }
          confirmLabel={toggleConfirm?.isActive ? "Tắt" : "Kích hoạt"}
          busy={busy}
          onCancel={() => {
            if (!busy) setToggleConfirm(null);
          }}
          onConfirm={() => void applyToggleActive()}
        />
      </div>
    );
  }

  const duplicateMode = dupSource !== null;

  return (
    <div className="tpl-panel tpl-panel-editor">
      <div className="tpl-editor-top">
        {localBanner && (
          <div className={localBanner.kind === "error" ? "sched-error" : "sched-info"}>
            {localBanner.text}
          </div>
        )}

        {(shiftsRes.loading || busy) && (
          <LoadingBar text={shiftsRes.loading ? "Đang tải ca làm việc..." : "Đang xử lý..."} />
        )}
        {shiftsRes.isApiError && (
          <ErrorBar
            text={shiftsRes.error ?? "Không tải được danh sách ca."}
            onRetry={() => shiftsRes.reload()}
          />
        )}
        {!shiftsRes.loading && !shiftsRes.isApiError && shifts.length === 0 && (
          <div className="sched-error">
            API /api/lookups/shifts không trả ca nào (hoặc parse thất bại). Hãy kiểm tra ca đang kích hoạt.
          </div>
        )}

        <button
          type="button"
          className="tpl-back"
          onClick={() => void closeEditor()}
          disabled={busy}
        >
          <ArrowLeft size={18} />
          <span>{draft.mode === "create" ? "Tạo template mới" : "Sửa template"}</span>
        </button>

        <label className="tpl-field">
          <span className="tpl-field-label">
            Tên template <span className="required" aria-hidden>*</span>
          </span>
          <input
            className="tpl-input"
            placeholder="Nhập tên template"
            value={draft.name}
            required
            aria-required="true"
            disabled={busy || duplicateMode}
            onChange={e => setDraft({ ...draft, name: e.target.value })}
          />
        </label>

        <label className="tpl-field">
          <span className="tpl-field-label">Mô tả</span>
          <input
            className="tpl-input"
            placeholder="Nhập mô tả"
            value={draft.description}
            disabled={busy || duplicateMode}
            onChange={e => setDraft({ ...draft, description: e.target.value })}
          />
        </label>
      </div>

      <div className={`tpl-grid-card${duplicateMode ? " is-duplicating" : ""}`}>
        {duplicateMode && (
          <div className="tpl-dup-bar">
            <span className="tpl-dup-title">Đang nhân bản lịch</span>
            <div className="tpl-dup-actions">
              <button type="button" className="tpl-btn tpl-btn-outline" onClick={cancelDuplicate}>
                Hủy
              </button>
              <button
                type="button"
                className="tpl-btn tpl-btn-accent"
                disabled={dupTargets.size === 0}
                onClick={completeDuplicate}
              >
                Hoàn thành
              </button>
            </div>
          </div>
        )}

        <TemplateWeekGrid
          shifts={shifts}
          roles={roles}
          cells={draft.cells}
          duplicateMode={duplicateMode}
          sourceKey={dupSource}
          targetKeys={dupTargets}
          onEmptyClick={(day, shiftId) => setRoleDialog({ dayOfWeek: day, shiftId })}
          onEdit={(day, shiftId) => setRoleDialog({ dayOfWeek: day, shiftId })}
          onStartDuplicate={startDuplicate}
          onToggleTarget={toggleTarget}
        />
      </div>

      <div className="tpl-editor-foot">
        <button
          type="button"
          className="tpl-btn tpl-btn-secondary"
          onClick={() => void closeEditor()}
          disabled={busy}
        >
          Hủy
        </button>
        <button
          type="button"
          className="tpl-btn tpl-btn-primary"
          onClick={handleSave}
          disabled={busy || duplicateMode || !draft.name.trim()}
        >
          {draft.mode === "create" ? "Tạo" : "Lưu"}
        </button>
      </div>

      <TemplateRoleDialog
        open={roleDialog !== null && !duplicateMode}
        titleContext={roleDialogContext}
        roles={roles}
        initial={roleDialogInitial}
        onClose={() => setRoleDialog(null)}
        onClear={() => {
          if (roleDialog) clearCell(roleDialog.dayOfWeek, roleDialog.shiftId);
        }}
        onSave={rolesQty => {
          if (!roleDialog) return;
          setCellRoles(roleDialog.dayOfWeek, roleDialog.shiftId, rolesQty);
          setRoleDialog(null);
        }}
      />
    </div>
  );
}
