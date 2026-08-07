"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Copy, Upload } from "lucide-react";
import { StatusBar } from "@/components/ui/StatusBar";
import { LoadingBar, OfflineBar, ErrorBar } from "@/components/ui/ResourceBars";
import { ScheduleTabs, type ScheduleMainTab } from "@/components/schedule/ScheduleTabs";
import { ScheduleListPanel } from "@/components/schedule/ScheduleListPanel";
import { ScheduleGrid } from "@/components/schedule/ScheduleGrid";
import { ShiftAssignModal } from "@/components/schedule/ShiftAssignModal";
import { CreateScheduleDialog, DuplicateScheduleDialog } from "@/components/schedule/ScheduleDialogs";
import { TemplatePanel } from "@/components/schedule/TemplatePanel";
import { TemplateConfirmDialog } from "@/components/schedule/TemplateConfirmDialog";
import { SwapListPanel } from "@/components/schedule/SwapListPanel";
import { SwapDetailPanel } from "@/components/schedule/SwapDetailPanel";
import { scheduleApi } from "@/lib/api/schedule";
import { accessApi } from "@/lib/api/access";
import { authApi } from "@/lib/api/auth";
import { lookupsApi } from "@/lib/api/lookups";
import {
  formatIsoDate,
  nextMonday,
  parseIsoDate,
  startOfWeek,
  weekRangeLabel,
} from "@/lib/schedule/dates";
import {
  normalizeScheduleDetail,
  normalizeScheduleList,
  normalizeSwapList,
} from "@/lib/schedule/normalize";
import { useResource } from "@/lib/http/useResource";
import { formatApiError } from "@/lib/http/formatError";
import {
  GENERATION_TYPE_LABELS,
  SCHEDULE_STATUS_LABELS,
  type ScheduleAssignmentRow,
  type ScheduleDetail,
  type ScheduleRow,
  type SwapRequestRow,
} from "@/types/api/schedule";

type ConfirmKind = "publish" | "scrap" | null;

export function WinSchedule() {
  const [tab, setTab] = useState<ScheduleMainTab>("schedules");
  const [banner, setBanner] = useState<{ kind: "error" | "info"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  // Mở module → load đủ dữ liệu cho status bar (Lịch / Template / Đơn chờ duyệt) + tab Lịch.
  const schedulesRes = useResource(() => scheduleApi.listSchedules());
  const shiftsRes = useResource(() => lookupsApi.getShifts());
  const templatesRes = useResource(() => scheduleApi.listTemplates());
  const rolesRes = useResource(() => accessApi.listAssignableRoles());
  const swapsRes = useResource(() => scheduleApi.listSwapRequests());
  const meRes = useResource(() => authApi.me());

  const schedules = useMemo(
    () => normalizeScheduleList(schedulesRes.data ?? []),
    [schedulesRes.data],
  );
  const templates = templatesRes.data ?? [];
  const shifts = shiftsRes.data ?? [];
  const roles = rolesRes.data?.roles ?? [];
  const swaps = useMemo(() => normalizeSwapList(swapsRes.data ?? []), [swapsRes.data]);
  const currentStaffAccountId = meRes.data?.staffAccountId ?? null;

  const [detail, setDetail] = useState<ScheduleDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const earliestWeek = useMemo(() => formatIsoDate(nextMonday(new Date())), []);

  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [confirmTarget, setConfirmTarget] = useState<ScheduleRow | ScheduleDetail | null>(null);

  const [assignCell, setAssignCell] = useState<{
    shiftId: number;
    workDate: string;
    slots: ScheduleAssignmentRow[];
  } | null>(null);

  const [selectedSwap, setSelectedSwap] = useState<SwapRequestRow | null>(null);

  const normalizeWeek = (value: string) => formatIsoDate(startOfWeek(parseIsoDate(value)));

  const openSchedule = async (id: number) => {
    setDetailLoading(true);
    setBanner(null);
    const res = await scheduleApi.getSchedule(id);
    setDetailLoading(false);
    if (res.isSuccess) setDetail(normalizeScheduleDetail(res.data));
    else setBanner({ kind: "error", text: formatApiError(res) });
  };

  const reloadDetail = async () => {
    if (detail) await openSchedule(detail.id);
  };

  const backToScheduleList = async () => {
    setAssignCell(null);
    setDetail(null);
    await schedulesRes.reload();
  };

  const openSwap = async (row: SwapRequestRow) => {
    const fresh = await swapsRes.reload();
    const list = normalizeSwapList(fresh ?? []);
    setSelectedSwap(list.find(s => s.id === row.id) ?? row);
  };

  const backToSwapList = async () => {
    setSelectedSwap(null);
    await swapsRes.reload();
  };

  const changeTab = (t: ScheduleMainTab) => {
    setTab(t);
    setBanner(null);
    setDetail(null);
    setSelectedSwap(null);
    setAssignCell(null);
    if (t === "schedules") void schedulesRes.reload();
    if (t === "templates") void templatesRes.reload();
    if (t === "swaps") {
      void swapsRes.reload();
      void meRes.reload();
    }
  };

  const openCreate = () => {
    setDialogError(null);
    setCreateOpen(true);
    void templatesRes.reload();
  };

  const handleGenerate = async (weekStartDate: string, templateId: number) => {
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl || tpl.lineCount < 1) {
      setDialogError(
        "Template chưa có dòng (thứ × ca × vai trò) — mở tab Template, thêm dòng rồi thử lại.",
      );
      return;
    }
    const week = normalizeWeek(weekStartDate);
    if (week < earliestWeek) {
      setDialogError("Chỉ tạo được lịch cho tuần sau trở đi.");
      return;
    }
    setBusy(true);
    setDialogError(null);
    const res = await scheduleApi.generateSchedule(templateId, week);
    setBusy(false);
    if (!res.isSuccess) {
      setDialogError(formatApiError(res));
      return;
    }
    setCreateOpen(false);
    await schedulesRes.reload();
    await openSchedule(res.data.id);
    setBanner({
      kind: "info",
      text: `Đã tạo lịch nháp tuần ${weekRangeLabel(week)}.`,
    });
  };

  const handleDuplicate = async (weekStartDate: string) => {
    if (!detail) return;
    const week = normalizeWeek(weekStartDate);
    if (week < earliestWeek) {
      setDialogError("Chỉ nhân bản sang tuần sau trở đi.");
      return;
    }
    setBusy(true);
    setDialogError(null);
    const res = await scheduleApi.duplicateSchedule(detail.id, week);
    setBusy(false);
    if (!res.isSuccess) {
      setDialogError(formatApiError(res));
      return;
    }
    setDupOpen(false);
    await schedulesRes.reload();
    await openSchedule(res.data.id);
    setBanner({ kind: "info", text: `Đã nhân bản sang tuần ${weekRangeLabel(week)}.` });
  };

  const requestPublish = (target: ScheduleRow | ScheduleDetail) => {
    setConfirmTarget(target);
    setConfirmKind("publish");
  };

  const requestScrap = (target: ScheduleRow | ScheduleDetail) => {
    setConfirmTarget(target);
    setConfirmKind("scrap");
  };

  const applyConfirm = async () => {
    if (!confirmKind || !confirmTarget) return;
    const id = confirmTarget.id;
    setBusy(true);
    if (confirmKind === "publish") {
      const res = await scheduleApi.publishSchedule(id);
      setBusy(false);
      setConfirmKind(null);
      setConfirmTarget(null);
      if (res.isSuccess) {
        await schedulesRes.reload();
        if (detail?.id === id) await openSchedule(id);
        setBanner({ kind: "info", text: "Đã đăng lịch — nhân viên được phân công sẽ thấy ngay." });
      } else {
        setBanner({ kind: "error", text: formatApiError(res) });
      }
      return;
    }

    const res = await scheduleApi.scrapSchedule(id);
    setBusy(false);
    setConfirmKind(null);
    setConfirmTarget(null);
    if (res.isSuccess) {
      if (detail?.id === id) setDetail(null);
      await schedulesRes.reload();
      setBanner({ kind: "info", text: "Đã xóa lịch nháp — tuần này có thể tạo lại." });
    } else {
      setBanner({ kind: "error", text: formatApiError(res) });
    }
  };

  const reviewSwap = async (approve: boolean, row?: SwapRequestRow | null) => {
    const target = row ?? selectedSwap;
    if (!target) return;
    setBusy(true);
    const res = approve
      ? await scheduleApi.approveSwap(target.id)
      : await scheduleApi.rejectSwap(target.id);
    setBusy(false);
    if (res.isSuccess) {
      await swapsRes.reload();
      if (selectedSwap?.id === target.id) setSelectedSwap(null);
      if (detail) await reloadDetail();
      setBanner({ kind: "info", text: approve ? "Đã duyệt đơn đổi ca." : "Đã từ chối đơn." });
    } else {
      setBanner({ kind: "error", text: formatApiError(res) });
    }
  };

  const isDraft = detail?.status === "DRAFT";
  const sourceTemplateName = detail?.sourceTemplateName?.trim() || "—";
  const generationLabel = detail?.generationType
    ? GENERATION_TYPE_LABELS[detail.generationType]
    : "—";

  useEffect(() => {
    // Reset assign modal when leaving detail
    if (!detail) setAssignCell(null);
  }, [detail]);

  return (
    <>
      <ScheduleTabs active={tab} onChange={changeTab} />

      <div className="win-body sched-body">
        {(schedulesRes.loading || detailLoading || shiftsRes.loading) && (
          <LoadingBar text="Đang tải..." />
        )}
        {schedulesRes.isOffline && <OfflineBar onRetry={() => schedulesRes.reload()} />}
        {schedulesRes.isApiError && (
          <ErrorBar text={schedulesRes.error ?? "Lỗi tải danh sách lịch"} onRetry={() => schedulesRes.reload()} />
        )}
        {banner && tab !== "templates" && (
          <div className={banner.kind === "error" ? "sched-error" : "sched-info"}>{banner.text}</div>
        )}

        {tab === "schedules" && !detail && (
          <ScheduleListPanel
            schedules={schedules}
            busy={busy}
            onCreate={openCreate}
            onEdit={row => void openSchedule(row.id)}
            onPublish={row => requestPublish(row)}
            onDelete={row => requestScrap(row)}
          />
        )}

        {tab === "schedules" && detail && (
          <div className="sched-detail-panel">
            <button
              type="button"
              className="tpl-back"
              onClick={() => void backToScheduleList()}
              disabled={busy}
            >
              <ArrowLeft size={18} />
              <span>{isDraft ? "Tạo lịch" : "Chi tiết lịch"}</span>
            </button>

            <div className="sched-detail-meta">
              <div className="sched-detail-meta-item">
                <span className="k">Ngày tháng</span>
                <span>{weekRangeLabel(detail.weekStartDate)}</span>
              </div>
              <div className="sched-detail-meta-item">
                <span className="k">Loại</span>
                {detail.generationType ? (
                  <span className={`sched-type-pill type-${detail.generationType.toLowerCase()}`}>
                    {generationLabel}
                  </span>
                ) : (
                  <span>—</span>
                )}
              </div>
              <div className="sched-detail-meta-item">
                <span className="k">Mẫu template</span>
                <span>{sourceTemplateName}</span>
              </div>
              <div className="sched-detail-meta-item">
                <span className="k">Trạng thái</span>
                <span className={`sched-status-pill status-${detail.status.toLowerCase()}`}>
                  <span className="sched-status-dot" aria-hidden />
                  {SCHEDULE_STATUS_LABELS[detail.status]}
                </span>
              </div>
            </div>

            <div className="sched-detail-grid-card">
              <ScheduleGrid
                weekStartDate={detail.weekStartDate}
                assignments={detail.assignments}
                shifts={shifts}
                readOnly={detail.status === "DELETED"}
                onEditCell={(shiftId, workDate, slots) =>
                  setAssignCell({ shiftId, workDate, slots })
                }
              />
            </div>

            <div className="sched-detail-foot">
              {isDraft && (
                <button
                  type="button"
                  className="tpl-btn sched-btn-danger"
                  disabled={busy}
                  onClick={() => requestScrap(detail)}
                >
                  Xóa nháp
                </button>
              )}
              <button
                type="button"
                className="tpl-btn tpl-btn-secondary"
                disabled={busy}
                onClick={() => {
                  setDialogError(null);
                  setDupOpen(true);
                }}
              >
                <Copy size={16} />
                Nhân bản lịch
              </button>
              {isDraft && (
                <button
                  type="button"
                  className="tpl-btn tpl-btn-primary"
                  disabled={busy}
                  onClick={() => requestPublish(detail)}
                >
                  <Upload size={16} />
                  Đăng
                </button>
              )}
            </div>
          </div>
        )}

        {tab === "templates" && (
          <TemplatePanel
            roles={roles}
            onActiveTemplatesChanged={() => templatesRes.reload()}
            onBanner={setBanner}
          />
        )}

        {tab === "swaps" && !selectedSwap && (
          <>
            {swapsRes.loading && swaps.length === 0 && <LoadingBar text="Đang tải đơn..." />}
            {swapsRes.isApiError && swaps.length === 0 && (
              <ErrorBar text={swapsRes.error ?? ""} onRetry={() => swapsRes.reload()} />
            )}
            {(swaps.length > 0 || (!swapsRes.loading && !swapsRes.isApiError)) && (
              <SwapListPanel
                swaps={swaps}
                currentStaffAccountId={currentStaffAccountId}
                busy={busy}
                onOpen={row => void openSwap(row)}
                onApprove={row => void reviewSwap(true, row)}
                onReject={row => void reviewSwap(false, row)}
              />
            )}
          </>
        )}

        {tab === "swaps" && selectedSwap && (
          <SwapDetailPanel
            swap={selectedSwap}
            busy={busy}
            onBack={() => void backToSwapList()}
            onApprove={() => void reviewSwap(true, selectedSwap)}
            onReject={() => void reviewSwap(false, selectedSwap)}
          />
        )}
      </div>

      <StatusBar
        left={
          <>
            <span>{schedules.length} lịch</span>
            <span>·</span>
            <span>{templates.length} template</span>
            <span>·</span>
            <span>{swaps.filter(s => s.status === "PENDING").length} đơn chờ duyệt</span>
          </>
        }
        right={<span>Lịch làm việc — dữ liệu lưu trên máy chủ</span>}
      />

      <CreateScheduleDialog
        open={createOpen}
        earliestWeek={earliestWeek}
        templates={templates}
        busy={busy}
        error={dialogError}
        onClose={() => {
          if (!busy) setCreateOpen(false);
        }}
        onSubmit={(week, templateId) => void handleGenerate(week, templateId)}
        onGoTemplates={() => {
          setCreateOpen(false);
          changeTab("templates");
        }}
      />

      <DuplicateScheduleDialog
        open={dupOpen}
        sourceWeekLabel={detail ? weekRangeLabel(detail.weekStartDate) : ""}
        earliestWeek={earliestWeek}
        busy={busy}
        error={dialogError}
        onClose={() => {
          if (!busy) setDupOpen(false);
        }}
        onSubmit={week => void handleDuplicate(week)}
      />

      {detail && assignCell && (
        <ShiftAssignModal
          open
          scheduleId={detail.id}
          shiftId={assignCell.shiftId}
          workDate={assignCell.workDate}
          slots={assignCell.slots}
          shifts={shifts}
          busy={busy}
          onClose={() => setAssignCell(null)}
          onSaved={() => {
            void (async () => {
              await reloadDetail();
              await schedulesRes.reload();
              setBanner({ kind: "info", text: "Đã lưu phân công ca." });
            })();
          }}
          onError={msg => setBanner({ kind: "error", text: msg })}
        />
      )}

      <TemplateConfirmDialog
        open={confirmKind !== null}
        title={confirmKind === "publish" ? "Đăng lịch" : "Xóa nháp"}
        message={
          confirmKind === "publish"
            ? `Đăng lịch tuần ${confirmTarget && "weekStartDate" in confirmTarget ? weekRangeLabel(confirmTarget.weekStartDate) : ""}? Nhân viên được phân công sẽ thấy ngay.`
            : `Xóa lịch nháp tuần ${confirmTarget && "weekStartDate" in confirmTarget ? weekRangeLabel(confirmTarget.weekStartDate) : ""}? Tuần này có thể tạo lại sau.`
        }
        confirmLabel={confirmKind === "publish" ? "Đăng" : "Xóa"}
        busy={busy}
        onCancel={() => {
          if (!busy) {
            setConfirmKind(null);
            setConfirmTarget(null);
          }
        }}
        onConfirm={() => void applyConfirm()}
      />
    </>
  );
}
