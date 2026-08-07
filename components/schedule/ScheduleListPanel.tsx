"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { mondaysOverlappingMonth } from "@/components/schedule/ScheduleWeekPicker";
import { weekRangeLabel } from "@/lib/schedule/dates";
import {
  GENERATION_TYPE_LABELS,
  SCHEDULE_STATUS_LABELS,
  type ScheduleGenerationType,
  type ScheduleRow,
  type ScheduleStatus,
} from "@/types/api/schedule";
import styles from "./ScheduleListPanel.module.css";

const PAGE_SIZE = 10;
const MONTH_LABELS = Array.from({ length: 12 }, (_, i) => `Tháng ${i + 1}`);

type StatusFilter = ScheduleStatus | "ALL";
type TypeFilter = ScheduleGenerationType | "ALL";
type TemplateFilter = string; // "ALL" | template name
type SortKey = "week" | "published";
type SortDir = "asc" | "desc";
type OpenFilter = "template" | "status" | "type" | null;
type MonthPanelMode = "months" | "years" | null;

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

function publishedTime(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

function ColumnFilter({
  label,
  active,
  open,
  onToggle,
  children,
}: {
  label: string;
  active: boolean;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className={styles.colFilterWrap}>
      <button
        type="button"
        className={`${styles.colFilterBtn}${active ? ` ${styles.colFilterBtnActive}` : ""}`}
        aria-expanded={open}
        aria-label={`Lọc ${label}`}
        onClick={e => {
          e.stopPropagation();
          onToggle();
        }}
      >
        <span>{label}</span>
        <Filter size={14} aria-hidden />
      </button>
      {open && (
        <div className={styles.colFilterMenu} role="menu" onClick={e => e.stopPropagation()}>
          {children}
        </div>
      )}
    </div>
  );
}

function MonthYearPicker({
  year,
  month,
  onChange,
  disabled,
}: {
  year: number;
  month: number;
  onChange: (next: { year: number; month: number }) => void;
  disabled?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<MonthPanelMode>(null);
  const [viewYear, setViewYear] = useState(year);
  const [viewMonth, setViewMonth] = useState(month);

  useEffect(() => {
    if (!open) return;
    setViewYear(year);
    setViewMonth(month);
    setMode(null);
  }, [open, year, month]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => y - 5 + i);
  }, []);

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setMode(null);
  };

  const commit = (y: number, m: number) => {
    onChange({ year: y, month: m });
    setOpen(false);
  };

  return (
    <div className={styles.monthPicker} ref={rootRef}>
      <button
        type="button"
        className={styles.monthTrigger}
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <span>
          {MONTH_LABELS[month]} / {year}
        </span>
        <ChevronDown size={16} />
      </button>

      {open && (
        <div className={styles.monthPanel}>
          <div className={styles.monthNav}>
            <button
              type="button"
              className={styles.monthNavBtn}
              onClick={() => setViewYear(y => y - 1)}
              aria-label="Năm trước"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              type="button"
              className={styles.monthNavBtn}
              onClick={() => shiftMonth(-1)}
              aria-label="Tháng trước"
            >
              <ChevronLeft size={16} />
            </button>

            <div className={styles.monthNavCenter}>
              <button
                type="button"
                className={`${styles.monthNavSelect}${mode === "months" ? ` ${styles.monthNavSelectOpen}` : ""}`}
                onClick={() => setMode(m => (m === "months" ? null : "months"))}
              >
                <span>{MONTH_LABELS[viewMonth]}</span>
                <ChevronDown size={14} />
              </button>
              <button
                type="button"
                className={`${styles.monthNavSelect}${mode === "years" ? ` ${styles.monthNavSelectOpen}` : ""}`}
                onClick={() => setMode(m => (m === "years" ? null : "years"))}
              >
                <span>{viewYear}</span>
                <ChevronDown size={14} />
              </button>
            </div>

            <button
              type="button"
              className={styles.monthNavBtn}
              onClick={() => shiftMonth(1)}
              aria-label="Tháng sau"
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              className={styles.monthNavBtn}
              onClick={() => setViewYear(y => y + 1)}
              aria-label="Năm sau"
            >
              <ChevronsRight size={16} />
            </button>
          </div>

          {mode === "months" && (
            <div className={styles.monthGrid}>
              {MONTH_LABELS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  className={`${styles.monthCell}${i === viewMonth ? ` ${styles.monthCellSelected}` : ""}`}
                  onClick={() => {
                    setViewMonth(i);
                    setMode(null);
                    commit(viewYear, i);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {mode === "years" && (
            <div className={styles.yearGrid}>
              {yearOptions.map(y => (
                <button
                  key={y}
                  type="button"
                  className={`${styles.monthCell}${y === viewYear ? ` ${styles.monthCellSelected}` : ""}`}
                  onClick={() => {
                    setViewYear(y);
                    setMode(null);
                    commit(y, viewMonth);
                  }}
                >
                  {y}
                </button>
              ))}
            </div>
          )}

          {mode === null && (
            <div className={styles.monthGrid}>
              {MONTH_LABELS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  className={`${styles.monthCell}${i === viewMonth && viewYear === year ? ` ${styles.monthCellSelected}` : ""}`}
                  onClick={() => commit(viewYear, i)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ScheduleListPanel({
  schedules,
  busy,
  onCreate,
  onEdit,
  onPublish,
  onDelete,
}: Props) {
  const [filterYear, setFilterYear] = useState(() => new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState(() => new Date().getMonth());
  const [page, setPage] = useState(1);
  const [templateFilter, setTemplateFilter] = useState<TemplateFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("week");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [openFilter, setOpenFilter] = useState<OpenFilter>(null);
  const headRef = useRef<HTMLTableSectionElement>(null);

  const monthWeekStarts = useMemo(
    () => new Set(mondaysOverlappingMonth(filterYear, filterMonth)),
    [filterYear, filterMonth],
  );

  const monthSchedules = useMemo(
    () => schedules.filter(row => monthWeekStarts.has(row.weekStartDate)),
    [schedules, monthWeekStarts],
  );

  const templateOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of monthSchedules) {
      const name = row.sourceTemplateName?.trim();
      if (name) set.add(name);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "vi"));
  }, [monthSchedules]);

  const rows = useMemo(() => {
    let list = monthSchedules.filter(row => {
      if (templateFilter !== "ALL") {
        const name = row.sourceTemplateName?.trim() || "";
        if (name !== templateFilter) return false;
      }
      if (statusFilter !== "ALL" && row.status !== statusFilter) return false;
      if (typeFilter !== "ALL" && row.generationType !== typeFilter) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sortKey === "published") {
        const ta = publishedTime(a.publishedAt);
        const tb = publishedTime(b.publishedAt);
        if (ta == null && tb == null) {
          // tie-break by week
        } else if (ta == null) return 1;
        else if (tb == null) return -1;
        else if (ta !== tb) return sortDir === "asc" ? ta - tb : tb - ta;
      } else {
        const cmp = a.weekStartDate.localeCompare(b.weekStartDate);
        if (cmp !== 0) return sortDir === "asc" ? cmp : -cmp;
      }

      // Stable secondary: week asc then id
      const weekCmp = a.weekStartDate.localeCompare(b.weekStartDate);
      if (weekCmp !== 0) return weekCmp;
      return a.id - b.id;
    });

    return list;
  }, [monthSchedules, templateFilter, statusFilter, typeFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, safePage]);

  useEffect(() => {
    setPage(1);
  }, [filterYear, filterMonth, templateFilter, statusFilter, typeFilter, sortKey, sortDir, schedules]);

  useEffect(() => {
    if (!openFilter) return;
    const onDoc = (e: MouseEvent) => {
      const el = headRef.current;
      if (el && !el.contains(e.target as Node)) setOpenFilter(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenFilter(null);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [openFilter]);

  const toggle = (key: OpenFilter) => {
    setOpenFilter(prev => (prev === key ? null : key));
  };

  const cycleWeekSort = () => {
    setOpenFilter(null);
    if (sortKey !== "week") {
      setSortKey("week");
      setSortDir("asc");
      return;
    }
    setSortDir(d => (d === "asc" ? "desc" : "asc"));
  };

  const cyclePublishedSort = () => {
    setOpenFilter(null);
    if (sortKey !== "published") {
      setSortKey("published");
      setSortDir("asc");
      return;
    }
    if (sortDir === "asc") {
      setSortDir("desc");
      return;
    }
    // back to default week asc
    setSortKey("week");
    setSortDir("asc");
  };

  const WeekSortIcon =
    sortKey === "week" ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  const PublishedSortIcon =
    sortKey === "published" ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <div className="sched-panel">
      <button type="button" className="tpl-create-btn" onClick={onCreate} disabled={busy}>
        <Plus size={16} />
        Tạo lịch mới
      </button>

      <div className="tpl-list-head">
        <h3 className="tpl-list-title">Danh sách lịch</h3>
        <MonthYearPicker
          year={filterYear}
          month={filterMonth}
          disabled={busy}
          onChange={({ year, month }) => {
            setFilterYear(year);
            setFilterMonth(month);
          }}
        />
      </div>

      <div className="sched-list-card">
        <div className="sched-list-table-wrap">
          <table className="sched-list-table">
            <thead ref={headRef}>
              <tr>
                <th>ID</th>
                <th>
                  <button
                    type="button"
                    className={`${styles.colFilterBtn}${sortKey === "week" ? ` ${styles.colFilterBtnActive}` : ""}`}
                    aria-label="Sắp xếp tuần"
                    title={
                      sortKey === "week" && sortDir === "asc"
                        ? "Đang tăng dần — bấm để giảm dần"
                        : sortKey === "week"
                          ? "Đang giảm dần — bấm để tăng dần"
                          : "Bấm để sắp xếp theo tuần tăng dần"
                    }
                    onClick={e => {
                      e.stopPropagation();
                      cycleWeekSort();
                    }}
                  >
                    <span>Tuần</span>
                    <WeekSortIcon size={14} aria-hidden />
                  </button>
                </th>
                <th>
                  <ColumnFilter
                    label="Mẫu template"
                    active={templateFilter !== "ALL"}
                    open={openFilter === "template"}
                    onToggle={() => toggle("template")}
                  >
                    <button
                      type="button"
                      className={`${styles.colFilterOption}${templateFilter === "ALL" ? ` ${styles.colFilterOptionActive}` : ""}`}
                      onClick={() => {
                        setTemplateFilter("ALL");
                        setOpenFilter(null);
                      }}
                    >
                      Tất cả
                    </button>
                    {templateOptions.length === 0 ? (
                      <div className={styles.colFilterEmpty}>Không có template</div>
                    ) : (
                      templateOptions.map(name => (
                        <button
                          key={name}
                          type="button"
                          className={`${styles.colFilterOption}${templateFilter === name ? ` ${styles.colFilterOptionActive}` : ""}`}
                          onClick={() => {
                            setTemplateFilter(name);
                            setOpenFilter(null);
                          }}
                        >
                          {name}
                        </button>
                      ))
                    )}
                  </ColumnFilter>
                </th>
                <th>
                  <ColumnFilter
                    label="Trạng thái"
                    active={statusFilter !== "ALL"}
                    open={openFilter === "status"}
                    onToggle={() => toggle("status")}
                  >
                    <button
                      type="button"
                      className={`${styles.colFilterOption}${statusFilter === "ALL" ? ` ${styles.colFilterOptionActive}` : ""}`}
                      onClick={() => {
                        setStatusFilter("ALL");
                        setOpenFilter(null);
                      }}
                    >
                      Tất cả
                    </button>
                    {(["DRAFT", "PUBLISHED"] as ScheduleStatus[]).map(s => (
                      <button
                        key={s}
                        type="button"
                        className={`${styles.colFilterOption}${statusFilter === s ? ` ${styles.colFilterOptionActive}` : ""}`}
                        onClick={() => {
                          setStatusFilter(s);
                          setOpenFilter(null);
                        }}
                      >
                        {SCHEDULE_STATUS_LABELS[s]}
                      </button>
                    ))}
                  </ColumnFilter>
                </th>
                <th>
                  <ColumnFilter
                    label="Loại"
                    active={typeFilter !== "ALL"}
                    open={openFilter === "type"}
                    onToggle={() => toggle("type")}
                  >
                    <button
                      type="button"
                      className={`${styles.colFilterOption}${typeFilter === "ALL" ? ` ${styles.colFilterOptionActive}` : ""}`}
                      onClick={() => {
                        setTypeFilter("ALL");
                        setOpenFilter(null);
                      }}
                    >
                      Tất cả
                    </button>
                    {(["MANUAL", "AUTO"] as ScheduleGenerationType[]).map(t => (
                      <button
                        key={t}
                        type="button"
                        className={`${styles.colFilterOption}${typeFilter === t ? ` ${styles.colFilterOptionActive}` : ""}`}
                        onClick={() => {
                          setTypeFilter(t);
                          setOpenFilter(null);
                        }}
                      >
                        {GENERATION_TYPE_LABELS[t]}
                      </button>
                    ))}
                  </ColumnFilter>
                </th>
                <th>
                  <button
                    type="button"
                    className={`${styles.colFilterBtn}${sortKey === "published" ? ` ${styles.colFilterBtnActive}` : ""}`}
                    aria-label="Sắp xếp ngày đăng"
                    title={
                      sortKey === "published" && sortDir === "asc"
                        ? "Đang tăng dần — bấm để giảm dần"
                        : sortKey === "published"
                          ? "Đang giảm dần — bấm để về sắp xếp theo tuần"
                          : "Bấm để sắp xếp theo ngày đăng tăng dần"
                    }
                    onClick={e => {
                      e.stopPropagation();
                      cyclePublishedSort();
                    }}
                  >
                    <span>Ngày đăng</span>
                    <PublishedSortIcon size={14} aria-hidden />
                  </button>
                </th>
                <th className="sched-col-actions">Hoạt động</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyCell}>
                    {schedules.length === 0
                      ? 'Chưa có dữ liệu lịch — bấm "Tạo lịch mới" để bắt đầu.'
                      : monthSchedules.length === 0
                        ? "Không có lịch trong tháng đã chọn."
                        : "Không có lịch khớp bộ lọc."}
                  </td>
                </tr>
              ) : (
                paged.map(row => (
                  <tr
                    key={row.id}
                    className="sched-row-clickable"
                    onClick={() => onEdit(row)}
                  >
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
                    <td className="sched-col-actions" onClick={e => e.stopPropagation()}>
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
                ))
              )}
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
            Trang {safePage} / {totalPages} ({rows.length} mục)
          </div>
        </div>
      </div>
    </div>
  );
}
