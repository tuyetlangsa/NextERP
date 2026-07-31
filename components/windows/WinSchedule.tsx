"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ColumnDirective,
  ColumnsDirective,
  GridComponent,
  Inject,
  Page,
  Sort,
} from "@syncfusion/ej2-react-grids";
import { ArrowLeft, Copy, Upload } from "lucide-react";
import { ensureSyncfusionLicense } from "@/lib/syncfusion-license";
import { StatusBar } from "@/components/ui/StatusBar";
import { LoadingBar, OfflineBar, ErrorBar } from "@/components/ui/ResourceBars";
import { ScheduleTabs, type ScheduleMainTab } from "@/components/schedule/ScheduleTabs";
import { ScheduleListPanel } from "@/components/schedule/ScheduleListPanel";
import { ScheduleGrid } from "@/components/schedule/ScheduleGrid";
import { ShiftAssignModal } from "@/components/schedule/ShiftAssignModal";
import { CreateScheduleDialog, DuplicateScheduleDialog } from "@/components/schedule/ScheduleDialogs";
import { TemplatePanel } from "@/components/schedule/TemplatePanel";
import { TemplateConfirmDialog } from "@/components/schedule/TemplateConfirmDialog";
import { scheduleApi } from "@/lib/api/schedule";
import { accessApi } from "@/lib/api/access";
import { lookupsApi } from "@/lib/api/lookups";
import {
  formatDateLong,
  formatIsoDate,
  nextMonday,
  parseIsoDate,
  startOfWeek,
  weekRangeLabel,
} from "@/lib/schedule/dates";
import { normalizeScheduleDetail } from "@/lib/schedule/normalize";
import { useResource } from "@/lib/http/useResource";
import { formatApiError } from "@/lib/http/formatError";
import {
  SCHEDULE_STATUS_LABELS,
  SWAP_STATUS_LABELS,
  type ScheduleAssignmentRow,
  type ScheduleDetail,
  type ScheduleRow,
  type SwapRequestRow,
  type SwapStatus,
} from "@/types/api/schedule";

ensureSyncfusionLicense();

type ConfirmKind = "publish" | "scrap" | null;

export function WinSchedule() {
  const [tab, setTab] = useState<ScheduleMainTab>("schedules");
  const [banner, setBanner] = useState<{ kind: "error" | "info"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const schedulesRes = useResource(() => scheduleApi.listSchedules());
  const templatesRes = useResource(() => scheduleApi.listTemplates());
  const shiftsRes = useResource(() => lookupsApi.getShifts());
  const rolesRes = useResource(() => accessApi.listAssignableRoles());

  const [swapFilter, setSwapFilter] = useState<SwapStatus | "ALL">("ALL");
  const swapsRes = useResource(
    () => scheduleApi.listSwapRequests(swapFilter === "ALL" ? undefined : swapFilter),
    { deps: [swapFilter] },
  );

  const schedules = schedulesRes.data ?? [];
  const templates = templatesRes.data ?? [];
  const shifts = shiftsRes.data ?? [];
  const roles = rolesRes.data?.roles ?? [];
  const swaps = swapsRes.data ?? [];

  const [detail, setDetail] = useState<ScheduleDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const earliestWeek = useMemo(() => formatIsoDate(nextMonday(new Date())), []);
  const [createOpen, setCreateOpen] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [confirmTarget, setConfirmTarget] = useState<ScheduleRow | ScheduleDetail | null>(null);

  const [assignCell, setAssignCell] = useState<{
    shiftId: number;
    workDate: string;
    slots: ScheduleAssignmentRow[];
  } | null>(null);

  const [swapId, setSwapId] = useState<number | null>(null);
  const selectedSwap = swaps.find(s => s.id === swapId) ?? null;

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

  const openCreate = () => {
    setDialogError(null);
    setCreateOpen(true);
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

  const reviewSwap = async (approve: boolean) => {
    if (!selectedSwap) return;
    setBusy(true);
    const res = approve
      ? await scheduleApi.approveSwap(selectedSwap.id)
      : await scheduleApi.rejectSwap(selectedSwap.id);
    setBusy(false);
    if (res.isSuccess) {
      await swapsRes.reload();
      if (detail) await reloadDetail();
      setBanner({ kind: "info", text: approve ? "Đã duyệt đơn đổi ca." : "Đã từ chối đơn." });
    } else {
      setBanner({ kind: "error", text: formatApiError(res) });
    }
  };

  const isDraft = detail?.status === "DRAFT";
  const sourceTemplateName = detail?.sourceTemplateName ?? "—";

  useEffect(() => {
    // Reset assign modal when leaving detail
    if (!detail) setAssignCell(null);
  }, [detail]);

  return (
    <>
      <ScheduleTabs
        active={tab}
        onChange={t => {
          setTab(t);
          setBanner(null);
          if (t !== "schedules") setDetail(null);
        }}
      />

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
              onClick={() => setDetail(null)}
              disabled={busy}
            >
              <ArrowLeft size={18} />
              <span>{isDraft ? "Tạo lịch" : "Chi tiết lịch"}</span>
            </button>

            <div className="sched-detail-meta">
              <div>
                <span className="k">Ngày tháng</span>
                <span>{weekRangeLabel(detail.weekStartDate)}</span>
              </div>
              <div>
                <span className="k">Mẫu template</span>
                <span>{sourceTemplateName}</span>
              </div>
              <div>
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

        {tab === "swaps" && (
          <div className="sched-swap-layout">
            <div className="sched-swap-list">
              <div className="grid-filterbar">
                <div className="filter-group">
                  <label>Trạng thái:</label>
                  <select
                    value={swapFilter}
                    onChange={e => setSwapFilter(e.target.value as SwapStatus | "ALL")}
                  >
                    <option value="ALL">Tất cả</option>
                    {(Object.keys(SWAP_STATUS_LABELS) as SwapStatus[]).map(s => (
                      <option key={s} value={s}>
                        {SWAP_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {swapsRes.loading && <LoadingBar text="Đang tải đơn..." />}
              {swapsRes.isApiError && (
                <ErrorBar text={swapsRes.error ?? ""} onRetry={() => swapsRes.reload()} />
              )}
              {!swapsRes.loading && !swapsRes.isApiError && swaps.length === 0 && (
                <div className="sched-info">Chưa có dữ liệu đơn đổi ca.</div>
              )}
              <GridComponent
                dataSource={swaps.map(s => ({
                  ...s,
                  statusText: SWAP_STATUS_LABELS[s.status],
                  createdText: new Date(s.createdAt).toLocaleDateString("vi-VN"),
                }))}
                allowSorting
                allowPaging
                pageSettings={{ pageSize: 10 }}
                rowSelected={(args: { data: SwapRequestRow | SwapRequestRow[] }) => {
                  const row = Array.isArray(args.data) ? args.data[0] : args.data;
                  if (row?.id) setSwapId(row.id);
                }}
                height="100%"
              >
                <ColumnsDirective>
                  <ColumnDirective field="requesterName" headerText="Người gửi" width="160" />
                  <ColumnDirective field="targetName" headerText="Người thay" width="160" />
                  <ColumnDirective field="statusText" headerText="Trạng thái" width="120" />
                  <ColumnDirective field="createdText" headerText="Ngày gửi" width="110" />
                </ColumnsDirective>
                <Inject services={[Page, Sort]} />
              </GridComponent>
            </div>
            <div className="sched-swap-detail">
              {selectedSwap ? (
                <>
                  <h3 className="sched-swap-title">Chi tiết đơn đổi ca</h3>
                  <div className="sched-swap-pane">
                    <div>
                      <span className="k">Người gửi:</span> {selectedSwap.requesterName}
                    </div>
                    <div>
                      <span className="k">Người thay thế:</span> {selectedSwap.targetName}
                    </div>
                    <div>
                      <span className="k">Ca sớm nhất:</span>{" "}
                      {formatDateLong(selectedSwap.earliestShiftStartAt.slice(0, 10))}{" "}
                      {new Date(selectedSwap.earliestShiftStartAt).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div>
                      <span className="k">Trạng thái:</span>{" "}
                      {SWAP_STATUS_LABELS[selectedSwap.status]}
                    </div>
                  </div>
                  {selectedSwap.status === "PENDING" && (
                    <div className="sched-swap-actions">
                      <button
                        type="button"
                        className="tb-btn danger"
                        onClick={() => reviewSwap(false)}
                        disabled={busy}
                      >
                        Từ chối
                      </button>
                      <button
                        type="button"
                        className="tb-btn primary"
                        onClick={() => reviewSwap(true)}
                        disabled={busy}
                      >
                        Duyệt
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="sched-empty-detail">Chọn một đơn để xem chi tiết.</div>
              )}
            </div>
          </div>
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
          setTab("templates");
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
            void reloadDetail();
            setBanner({ kind: "info", text: "Đã lưu phân công ca." });
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
