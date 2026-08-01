"use client";

import { useMemo, useState } from "react";
import {
  Pencil,
  Trash2,
  Upload,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { weekRangeLabel } from "@/lib/schedule/dates";
import {
  GENERATION_TYPE_LABELS,
  SCHEDULE_STATUS_LABELS,
  type ScheduleRow,
} from "@/types/api/schedule";

const PAGE_SIZE = 10;

interface Props {
  schedules: ScheduleRow[];
  busy?: boolean;
  onCreate: () => void;
  onEdit: (row: ScheduleRow) => void;
  onPublish: (row: ScheduleRow) => void;
  onDelete: (row: ScheduleRow) => void;
}

function publishedDateText(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN");
}

export function ScheduleListPanel({
  schedules,
  busy,
  onCreate,
  onEdit,
  onPublish,
  onDelete,
}: Props) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(schedules.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return schedules.slice(start, start + PAGE_SIZE);
  }, [schedules, safePage]);

  return (
    <div className="sched-panel">
      <button type="button" className="tpl-create-btn" onClick={onCreate} disabled={busy}>
        <Plus size={16} />
        Tạo lịch mới
      </button>

      <div className="tpl-list-head">
        <h3 className="tpl-list-title">Danh sách lịch</h3>
      </div>

      {schedules.length === 0 ? (
        <div className="sched-info">Chưa có dữ liệu lịch — bấm &quot;Tạo lịch mới&quot; để bắt đầu.</div>
      ) : (
        <div className="sched-list-card">
          <div className="sched-list-table-wrap">
            <table className="sched-list-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tuần</th>
                  <th>Tên template</th>
                  <th>Trạng thái</th>
                  <th>Loại</th>
                  <th>Ngày đăng</th>
                  <th className="sched-col-actions">Hoạt động</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(row => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{weekRangeLabel(row.weekStartDate)}</td>
                    <td>{row.sourceTemplateName?.trim() || "—"}</td>
                    <td>
                      <span className={`sched-status-pill status-${row.status.toLowerCase()}`}>
                        <span className="sched-status-dot" aria-hidden />
                        {SCHEDULE_STATUS_LABELS[row.status]}
                      </span>
                    </td>
                    <td>
                      <span className={`sched-type-pill type-${row.generationType.toLowerCase()}`}>
                        {GENERATION_TYPE_LABELS[row.generationType]}
                      </span>
                    </td>
                    <td>{publishedDateText(row.publishedAt)}</td>
                    <td className="sched-col-actions">
                      <div className="sched-row-actions">
                        {row.status === "DRAFT" && (
                          <>
                            <button
                              type="button"
                              className="tpl-icon-btn"
                              title="Sửa"
                              disabled={busy}
                              onClick={() => onEdit(row)}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              className="tpl-icon-btn"
                              title="Đăng"
                              disabled={busy}
                              onClick={() => onPublish(row)}
                            >
                              <Upload size={16} />
                            </button>
                            <button
                              type="button"
                              className="tpl-icon-btn tpl-icon-danger"
                              title="Xóa nháp"
                              disabled={busy}
                              onClick={() => onDelete(row)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                        {row.status === "PUBLISHED" && (
                          <button
                            type="button"
                            className="tpl-icon-btn"
                            title="Sửa"
                            disabled={busy}
                            onClick={() => onEdit(row)}
                          >
                            <Pencil size={16} />
                          </button>
                        )}
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
              Trang {safePage} / {totalPages} ({schedules.length} mục)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
