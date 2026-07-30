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
import { DialogComponent } from "@syncfusion/ej2-react-popups";
import { ensureSyncfusionLicense } from "@/lib/syncfusion-license";
import { WinToolbar, TB } from "@/components/ui/WinToolbar";
import { Field } from "@/components/ui/DetailPanel";
import { StatusBar } from "@/components/ui/StatusBar";
import { LoadingBar, OfflineBar, ErrorBar } from "@/components/ui/ResourceBars";
import { ChromeIcons } from "@/components/desktop/icons";
import { ScheduleGrid } from "@/components/schedule/ScheduleGrid";
import { TemplatePanel } from "@/components/schedule/TemplatePanel";
import { scheduleApi } from "@/lib/api/schedule";
import { accessApi } from "@/lib/api/access";
import { lookupsApi } from "@/lib/api/lookups";
import {
  formatDateLong,
  formatIsoDate,
  nextMonday,
  parseIsoDate,
  startOfWeek,
  weekLabel,
} from "@/lib/schedule/dates";
import { normalizeScheduleDetail } from "@/lib/schedule/normalize";
import { useResource } from "@/lib/http/useResource";
import { formatApiError } from "@/lib/http/formatError";
import type { StaffAccountRow } from "@/types/api/access";
import {
  SCHEDULE_STATUS_LABELS,
  SWAP_STATUS_LABELS,
  GENERATION_TYPE_LABELS,
  type ScheduleAssignmentRow,
  type ScheduleDetail,
  type ScheduleRow,
  type SwapRequestRow,
  type SwapStatus,
} from "@/types/api/schedule";

ensureSyncfusionLicense();

type MainTab = "schedules" | "templates" | "swaps";

export function WinSchedule() {
  const [tab, setTab] = useState<MainTab>("schedules");
  const [banner, setBanner] = useState<{ kind: "error" | "info"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogTarget, setDialogTarget] = useState<HTMLElement | null>(null);

  useEffect(() => setDialogTarget(document.body), []);

  const schedulesRes = useResource(() => scheduleApi.listSchedules());
  const templatesRes = useResource(() => scheduleApi.listTemplates());
  const shiftsRes = useResource(() => lookupsApi.getShifts());
  const rolesRes = useResource(() => accessApi.listRoles());

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

  // ── Schedule detail ───────────────────────────────────────────────────────
  const [detail, setDetail] = useState<ScheduleDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busySlotId, setBusySlotId] = useState<number | null>(null);

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

  // ── Create / duplicate ────────────────────────────────────────────────────
  const earliestWeek = useMemo(() => formatIsoDate(nextMonday(new Date())), []);
  const [createOpen, setCreateOpen] = useState(false);
  const [createWeek, setCreateWeek] = useState(earliestWeek);
  const [createTemplateId, setCreateTemplateId] = useState<number | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const [dupOpen, setDupOpen] = useState(false);
  const [dupWeek, setDupWeek] = useState(earliestWeek);

  /** Backend chỉ nhận Thứ 2 ≥ tuần sau — chuẩn hoá trước khi gửi. */
  const normalizeWeek = (value: string) => formatIsoDate(startOfWeek(parseIsoDate(value)));

  const openCreate = () => {
    setCreateWeek(earliestWeek);
    setCreateTemplateId(templates[0]?.id ?? null);
    setDialogError(null);
    setCreateOpen(true);
  };

  const handleGenerate = async () => {
    if (createTemplateId === null) {
      setDialogError("Chưa có template đang hoạt động — hãy tạo template trước.");
      return;
    }
    const tpl = templates.find(t => t.id === createTemplateId);
    if (!tpl || tpl.lineCount < 1) {
      setDialogError(
        "Template chưa có dòng (thứ × ca × vai trò) — mở tab Template, thêm dòng rồi thử lại.",
      );
      return;
    }
    const week = normalizeWeek(createWeek);
    if (week < earliestWeek) {
      setDialogError("Chỉ tạo được lịch cho tuần sau trở đi.");
      return;
    }
    setBusy(true);
    setDialogError(null);
    const res = await scheduleApi.generateSchedule(createTemplateId, week);
    setBusy(false);
    if (!res.isSuccess) {
      setDialogError(formatApiError(res));
      return;
    }
    setCreateOpen(false);
    await schedulesRes.reload();
    await openSchedule(res.data.id);
    if (res.data.assignmentCount === 0) {
      setBanner({
        kind: "error",
        text: `Lịch tuần ${weekLabel(week)} đã tạo nhưng không có ô phân công — template "${tpl.name}" có thể trống lúc sinh lịch. Huỷ nháp và tạo lại sau khi thêm dòng vào template.`,
      });
      return;
    }
    setBanner({
      kind: "info",
      text: `Đã tạo lịch nháp tuần ${weekLabel(week)} — ${res.data.filledCount}/${res.data.assignmentCount} ô đã có người.`,
    });
  };

  const handleDuplicate = async () => {
    if (!detail) return;
    const week = normalizeWeek(dupWeek);
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
    setBanner({ kind: "info", text: `Đã nhân bản sang tuần ${weekLabel(week)}.` });
  };

  const handlePublish = async () => {
    if (!detail) return;
    if (detail.assignments.length === 0) {
      setBanner({
        kind: "error",
        text: "Không thể đăng lịch trống — huỷ nháp và tạo lại từ template có ít nhất một dòng phân công.",
      });
      return;
    }
    const empty = detail.assignments.filter(a => a.staffAccountId === null).length;
    if (empty > 0 && !window.confirm(`Còn ${empty} ô trống. Vẫn đăng lịch?`)) return;
    setBusy(true);
    const res = await scheduleApi.publishSchedule(detail.id);
    setBusy(false);
    if (res.isSuccess) {
      await schedulesRes.reload();
      await openSchedule(detail.id);
      setBanner({ kind: "info", text: "Đã đăng lịch — nhân viên được phân công sẽ thấy ngay." });
    } else {
      setBanner({ kind: "error", text: formatApiError(res) });
    }
  };

  const handleScrap = async () => {
    if (!detail || detail.status !== "DRAFT") return;
    if (!window.confirm(`Huỷ lịch nháp tuần ${weekLabel(detail.weekStartDate)}?`)) return;
    setBusy(true);
    const res = await scheduleApi.scrapSchedule(detail.id);
    setBusy(false);
    if (res.isSuccess) {
      setDetail(null);
      await schedulesRes.reload();
      setBanner({ kind: "info", text: "Đã huỷ lịch nháp — tuần này có thể tạo lại." });
    } else {
      setBanner({ kind: "error", text: formatApiError(res) });
    }
  };

  // ── Staff picker cho từng ô ───────────────────────────────────────────────
  const [pickSlot, setPickSlot] = useState<ScheduleAssignmentRow | null>(null);
  const [candidates, setCandidates] = useState<StaffAccountRow[] | null>(null);
  const [candidateError, setCandidateError] = useState<string | null>(null);

  const openPicker = async (slot: ScheduleAssignmentRow) => {
    setPickSlot(slot);
    setCandidates(null);
    setCandidateError(null);
    const res = await accessApi.listAccounts({ roleId: slot.roleId, pageNumber: 1, pageSize: 200 });
    if (res.isSuccess) setCandidates(res.data.items.filter(s => s.isActive && !s.isLocked));
    else setCandidateError(formatApiError(res));
  };

  const applyAssignment = async (slot: ScheduleAssignmentRow, staffAccountId: number | null) => {
    setBusySlotId(slot.id);
    const res = await scheduleApi.editAssignment(slot.id, staffAccountId, slot.version);
    setBusySlotId(null);
    setPickSlot(null);
    if (!res.isSuccess) {
      setBanner({ kind: "error", text: formatApiError(res) });
      await reloadDetail();
      return;
    }
    if (res.data.warnings.length > 0) {
      setBanner({ kind: "error", text: `Cảnh báo: ${res.data.warnings.join(" · ")}` });
    } else {
      setBanner(null);
    }
    await reloadDetail();
  };

  // ── Swap ──────────────────────────────────────────────────────────────────
  const [swapId, setSwapId] = useState<number | null>(null);
  const selectedSwap = swaps.find(s => s.id === swapId) ?? null;

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

  const scheduleWithSlots = useMemo(
    () => schedules.find(s => (s.assignmentCount ?? 0) > 0),
    [schedules],
  );
  const emptyScheduleCount = useMemo(
    () => schedules.filter(s => (s.assignmentCount ?? 0) === 0).length,
    [schedules],
  );
  const isDraft = detail?.status === "DRAFT";
  const filledCount = detail?.assignments.filter(a => a.staffAccountId !== null).length ?? 0;
  const sourceTemplateMeta = useMemo(() => {
    if (!detail) return null;
    const fromList = detail.sourceTemplateId
      ? templates.find(t => t.id === detail.sourceTemplateId)
      : undefined;
    return {
      name: detail.sourceTemplateName ?? fromList?.name ?? null,
      lineCount: fromList?.lineCount ?? null,
      id: detail.sourceTemplateId ?? fromList?.id ?? null,
    };
  }, [detail, templates]);

  const emptyScheduleHint = useMemo(() => {
    if (!detail || detail.assignments.length > 0) return null;
    const tplName = sourceTemplateMeta?.name;
    const tplLines = sourceTemplateMeta?.lineCount;
    if (tplName && tplLines != null && tplLines > 0) {
      return isDraft
        ? `Lịch trống nhưng template "${tplName}" hiện có ${tplLines} dòng — có thể template được bổ sung sau khi tạo lịch. Huỷ nháp và bấm "Tạo lịch mới" lại.`
        : `Lịch đã đăng nhưng 0 ô phân công — thường do tạo/đăng khi template còn trống. Lịch đã đăng không thể sửa; hãy mở tuần khác có dữ liệu hoặc tạo lịch tuần mới.${
            scheduleWithSlots
              ? ` Gợi ý: tuần ${weekLabel(scheduleWithSlots.weekStartDate)} có ${scheduleWithSlots.filledCount ?? 0}/${scheduleWithSlots.assignmentCount} ô.`
              : ""
          }`;
    }
    if (tplName) {
      return `Lịch sinh từ template "${tplName}" nhưng chưa có ô phân công — thêm dòng vào template (tab Template) rồi ${isDraft ? "huỷ nháp và tạo lại" : "tạo lịch tuần khác"}.`;
    }
    return "Lịch chưa có ô phân công — kiểm tra template nguồn có dòng (thứ × ca × vai trò) trước khi tạo lịch.";
  }, [detail, isDraft, sourceTemplateMeta, scheduleWithSlots]);

  return (
    <>
      {tab === "schedules" && (
        <WinToolbar
          left={
            <>
              {!detail && (
                <TB icon={ChromeIcons.Plus} onClick={openCreate} kind="primary" disabled={busy}>
                  Tạo lịch mới
                </TB>
              )}
              {detail && (
                <>
                  <TB icon={ChromeIcons.Back} onClick={() => setDetail(null)}>
                    Danh sách lịch
                  </TB>
                  {isDraft && (
                    <>
                      <TB icon={ChromeIcons.Check} onClick={handlePublish} kind="primary" disabled={busy}>
                        Đăng
                      </TB>
                      <TB icon={ChromeIcons.Trash} onClick={handleScrap} kind="danger" disabled={busy}>
                        Huỷ nháp
                      </TB>
                    </>
                  )}
                  <TB
                    icon={ChromeIcons.Copy}
                    onClick={() => {
                      setDupWeek(earliestWeek);
                      setDialogError(null);
                      setDupOpen(true);
                    }}
                    disabled={busy}
                  >
                    Nhân bản lịch
                  </TB>
                </>
              )}
            </>
          }
        />
      )}

      <div className="cc-tabs">
        {(["schedules", "templates", "swaps"] as const).map(t => (
          <button
            key={t}
            type="button"
            className={`cc-tab${tab === t ? " active" : ""}`}
            onClick={() => {
              setTab(t);
              setBanner(null);
            }}
          >
            {t === "schedules" ? "Lịch làm việc" : t === "templates" ? "Template" : "Đơn đổi ca"}
          </button>
        ))}
      </div>

      <div className="win-body sched-body">
        {(schedulesRes.loading || detailLoading) && <LoadingBar text="Đang tải lịch..." />}
        {schedulesRes.isOffline && <OfflineBar onRetry={() => schedulesRes.reload()} />}
        {schedulesRes.isApiError && (
          <ErrorBar text={schedulesRes.error ?? ""} onRetry={() => schedulesRes.reload()} />
        )}
        {banner && tab !== "templates" && (
          <div className={banner.kind === "error" ? "sched-error" : "sched-info"}>{banner.text}</div>
        )}

        {tab === "schedules" && !detail && (
          <div className="data-list sched-list">
            <div className="grid-filterbar">
              <strong style={{ fontSize: 13 }}>Danh sách lịch tuần</strong>
              <div className="tb-divider" />
              <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>
                Chọn một tuần để xem và xếp ca
              </span>
            </div>
            {emptyScheduleCount > 0 && (
              <div className="sched-error" style={{ margin: "8px 12px" }}>
                {emptyScheduleCount} lịch tuần đang trống (0 ô phân công) — thường do tạo khi template chưa có
                dòng.{" "}
                {scheduleWithSlots ? (
                  <button
                    type="button"
                    className="sched-link-btn"
                    onClick={() => openSchedule(scheduleWithSlots.id)}
                  >
                    Mở tuần {weekLabel(scheduleWithSlots.weekStartDate)} (
                    {scheduleWithSlots.filledCount ?? 0}/{scheduleWithSlots.assignmentCount} ô)
                  </button>
                ) : (
                  "Hãy tạo lịch mới từ template đã có dòng."
                )}
              </div>
            )}
            <GridComponent
              dataSource={schedules.map(s => ({
                ...s,
                weekText: weekLabel(s.weekStartDate),
                statusText: SCHEDULE_STATUS_LABELS[s.status],
                slotsText:
                  s.assignmentCount != null
                    ? `${s.filledCount ?? 0}/${s.assignmentCount} ô`
                    : "—",
                templateText: s.sourceTemplateName ?? "—",
                publishedText: s.publishedAt
                  ? new Date(s.publishedAt).toLocaleString("vi-VN")
                  : "—",
                isEmpty: (s.assignmentCount ?? 0) === 0,
              }))}
              allowSorting
              allowPaging
              pageSettings={{ pageSize: 12 }}
              rowSelected={(args: { data: ScheduleRow | ScheduleRow[] }) => {
                const row = Array.isArray(args.data) ? args.data[0] : args.data;
                if (row?.id) openSchedule(row.id);
              }}
              height="100%"
            >
              <ColumnsDirective>
                <ColumnDirective field="weekText" headerText="Tuần" width="170" />
                <ColumnDirective field="statusText" headerText="Trạng thái" width="100" />
                <ColumnDirective field="slotsText" headerText="Phân công" width="110" />
                <ColumnDirective field="templateText" headerText="Template" width="140" />
                <ColumnDirective field="publishedText" headerText="Đăng lúc" width="160" />
              </ColumnsDirective>
              <Inject services={[Page, Sort]} />
            </GridComponent>
          </div>
        )}

        {tab === "schedules" && detail && (
          <div className="sched-detail">
            <div className="sched-meta">
              <div>
                <span className="k">Tuần:</span> {weekLabel(detail.weekStartDate)}
              </div>
              <div>
                <span className="k">Trạng thái:</span>{" "}
                <span className={`sched-badge ${detail.status.toLowerCase()}`}>
                  {SCHEDULE_STATUS_LABELS[detail.status]}
                </span>
              </div>
              <div>
                <span className="k">Đã xếp:</span> {filledCount}/{detail.assignments.length} ô
              </div>
              {sourceTemplateMeta?.name && (
                <div>
                  <span className="k">Template nguồn:</span>{" "}
                  {sourceTemplateMeta.name}
                  {sourceTemplateMeta.lineCount != null && (
                    <span className="sched-meta-sub"> ({sourceTemplateMeta.lineCount} dòng hiện tại)</span>
                  )}
                  {detail.generationType && (
                    <span className="sched-meta-sub">
                      {" "}
                      · {GENERATION_TYPE_LABELS[detail.generationType] ?? detail.generationType}
                    </span>
                  )}
                </div>
              )}
              {!isDraft && (
                <div className="sched-note">
                  Lịch đã đăng — chỉ sửa được ô còn cách giờ làm đủ lâu.
                </div>
              )}
            </div>
            {emptyScheduleHint && (
              <div className="sched-error sched-empty-hint">
                {emptyScheduleHint}
                {scheduleWithSlots && scheduleWithSlots.id !== detail.id && (
                  <>
                    {" "}
                    <button
                      type="button"
                      className="sched-link-btn"
                      onClick={() => openSchedule(scheduleWithSlots.id)}
                    >
                      Xem tuần {weekLabel(scheduleWithSlots.weekStartDate)}
                    </button>
                  </>
                )}
              </div>
            )}
            <ScheduleGrid
              weekStartDate={detail.weekStartDate}
              assignments={detail.assignments}
              shifts={shifts}
              emptyHint={emptyScheduleHint ?? undefined}
              busyAssignmentId={busySlotId}
              onPickStaff={openPicker}
              onClearStaff={slot => applyAssignment(slot, null)}
            />
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
                      <button type="button" className="tb-btn danger" onClick={() => reviewSwap(false)} disabled={busy}>
                        Từ chối
                      </button>
                      <button type="button" className="tb-btn primary" onClick={() => reviewSwap(true)} disabled={busy}>
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

      <DialogComponent
        header="Tạo lịch tuần mới"
        visible={createOpen}
        width="440px"
        isModal
        showCloseIcon
        target={dialogTarget ?? undefined}
        beforeClose={args => {
          if (busy) args.cancel = true;
          else setCreateOpen(false);
        }}
      >
        {createOpen ? (
          <div className="sched-dialog-body">
            <Field label="Tuần bắt đầu (Thứ 2)" required>
              <input
                type="date"
                min={earliestWeek}
                value={createWeek}
                onChange={e => {
                  setCreateWeek(e.target.value);
                  setDialogError(null);
                }}
              />
            </Field>
            <Field label="Template" required>
              <select
                value={createTemplateId ?? ""}
                onChange={e => setCreateTemplateId(Number(e.target.value) || null)}
                disabled={templates.length === 0}
              >
                {templates.length === 0 ? (
                  <option value="">— Chưa có template —</option>
                ) : (
                  templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.lineCount} dòng)
                    </option>
                  ))
                )}
              </select>
            </Field>
            <p className="sched-hint">
              Sẽ tạo tuần {weekLabel(normalizeWeek(createWeek))}. Chỉ tạo được từ tuần sau
              ({weekLabel(earliestWeek)}) trở đi và mỗi tuần chỉ một lịch.
              {templates.length === 0 && (
                <>
                  {" "}
                  <button type="button" className="sched-link-btn" onClick={() => setTab("templates")}>
                    Tạo template trước
                  </button>
                </>
              )}
            </p>
            {dialogError && <div className="sched-dialog-error">{dialogError}</div>}
            <div className="sched-dialog-foot">
              <button type="button" className="tb-btn" onClick={() => setCreateOpen(false)} disabled={busy}>
                Hủy
              </button>
              <button type="button" className="tb-btn primary" onClick={handleGenerate} disabled={busy}>
                {busy ? "Đang tạo..." : "Tạo"}
              </button>
            </div>
          </div>
        ) : null}
      </DialogComponent>

      <DialogComponent
        header="Nhân bản lịch"
        visible={dupOpen}
        width="440px"
        isModal
        showCloseIcon
        target={dialogTarget ?? undefined}
        beforeClose={args => {
          if (busy) args.cancel = true;
          else setDupOpen(false);
        }}
      >
        {dupOpen ? (
          <div className="sched-dialog-body">
            <Field label="Tuần đích (Thứ 2)" required>
              <input
                type="date"
                min={earliestWeek}
                value={dupWeek}
                onChange={e => {
                  setDupWeek(e.target.value);
                  setDialogError(null);
                }}
              />
            </Field>
            <p className="sched-hint">
              Copy toàn bộ phân công của tuần {detail ? weekLabel(detail.weekStartDate) : ""} sang
              tuần {weekLabel(normalizeWeek(dupWeek))}.
            </p>
            {dialogError && <div className="sched-dialog-error">{dialogError}</div>}
            <div className="sched-dialog-foot">
              <button type="button" className="tb-btn" onClick={() => setDupOpen(false)} disabled={busy}>
                Hủy
              </button>
              <button type="button" className="tb-btn primary" onClick={handleDuplicate} disabled={busy}>
                Nhân bản
              </button>
            </div>
          </div>
        ) : null}
      </DialogComponent>

      <DialogComponent
        header={pickSlot ? `Chọn nhân viên — ${pickSlot.roleName}` : "Chọn nhân viên"}
        visible={pickSlot !== null}
        width="360px"
        isModal
        showCloseIcon
        target={dialogTarget ?? undefined}
        beforeClose={() => setPickSlot(null)}
      >
        {pickSlot ? (
          <div className="sched-picker">
            <div className="sched-picker-head">
              {formatDateLong(pickSlot.workDate)} · {pickSlot.shiftName}
            </div>
            {candidateError && <div className="sched-dialog-error">{candidateError}</div>}
            {!candidates && !candidateError && <LoadingBar text="Đang tải nhân viên..." />}
            {candidates && candidates.length === 0 && (
              <div className="sched-empty-detail">
                Không có nhân viên hoạt động thuộc vai trò &quot;{pickSlot.roleName}&quot; — tạo
                tài khoản với vai trò này trong Quản lý tài khoản.
              </div>
            )}
            {candidates && candidates.length > 0 && (
              <ul className="sched-picker-list">
                {candidates.map(s => (
                  <li key={s.id}>
                    <button type="button" onClick={() => applyAssignment(pickSlot, s.id)}>
                      <span className="name">{s.fullName}</span>
                      <span className="role">{s.roleName}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="sched-picker-foot">
              {pickSlot.staffAccountId !== null && (
                <button type="button" className="tb-btn" onClick={() => applyAssignment(pickSlot, null)}>
                  Bỏ trống ô
                </button>
              )}
              <button type="button" className="tb-btn" onClick={() => setPickSlot(null)}>
                Hủy
              </button>
            </div>
          </div>
        ) : null}
      </DialogComponent>
    </>
  );
}
