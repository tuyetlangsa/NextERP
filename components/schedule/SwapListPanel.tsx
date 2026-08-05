"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  X,
} from "lucide-react";
import {
  SWAP_STATUS_LABELS,
  type SwapRequestRow,
  type SwapStatus,
} from "@/types/api/schedule";
import styles from "./SwapListPanel.module.css";

const PAGE_SIZE = 10;

type StatusFilter = SwapStatus | "ALL";
type ReviewerFilter = "ALL" | "ME";
type DateSort = "none" | "asc" | "desc";
type OpenFilter = "role" | "status" | "reviewer" | null;

interface Props {
  swaps: SwapRequestRow[];
  /** Current logged-in staff account id — dùng filter "Tôi đã xử lý". */
  currentStaffAccountId?: number | null;
  busy?: boolean;
  onOpen: (row: SwapRequestRow) => void;
  onApprove: (row: SwapRequestRow) => void;
  onReject: (row: SwapRequestRow) => void;
}

function createdDateText(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN");
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

export function SwapListPanel({
  swaps,
  currentStaffAccountId,
  busy,
  onOpen,
  onApprove,
  onReject,
}: Props) {
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [reviewerFilter, setReviewerFilter] = useState<ReviewerFilter>("ALL");
  const [dateSort, setDateSort] = useState<DateSort>("none");
  const [openFilter, setOpenFilter] = useState<OpenFilter>(null);
  const headRef = useRef<HTMLTableSectionElement>(null);

  const roleOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of swaps) {
      const name = s.requesterRoleName?.trim();
      if (name) set.add(name);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "vi"));
  }, [swaps]);

  const rows = useMemo(() => {
    let list = swaps.filter(row => {
      if (roleFilter !== "ALL") {
        const role = row.requesterRoleName?.trim() || "";
        if (role !== roleFilter) return false;
      }
      if (statusFilter !== "ALL" && row.status !== statusFilter) return false;
      if (reviewerFilter === "ME") {
        if (
          currentStaffAccountId == null ||
          row.reviewedByStaffAccountId !== currentStaffAccountId
        ) {
          return false;
        }
      }
      return true;
    });

    if (dateSort !== "none") {
      list = [...list].sort((a, b) => {
        const ta = new Date(a.createdAt).getTime();
        const tb = new Date(b.createdAt).getTime();
        const av = Number.isNaN(ta) ? 0 : ta;
        const bv = Number.isNaN(tb) ? 0 : tb;
        return dateSort === "asc" ? av - bv : bv - av;
      });
    }

    return list;
  }, [swaps, roleFilter, statusFilter, reviewerFilter, currentStaffAccountId, dateSort]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, safePage]);

  useEffect(() => {
    setPage(1);
  }, [roleFilter, statusFilter, reviewerFilter, dateSort, swaps]);

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

  const cycleDateSort = () => {
    setDateSort(prev => (prev === "none" ? "asc" : prev === "asc" ? "desc" : "none"));
    setOpenFilter(null);
  };

  const DateSortIcon =
    dateSort === "asc" ? ArrowUp : dateSort === "desc" ? ArrowDown : ArrowUpDown;

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <h3 className={styles.title}>Danh sách đơn</h3>
      </div>

      <div className="sched-list-card">
        <div className="sched-list-table-wrap">
          <table className="sched-list-table swap-list-table">
            <thead ref={headRef}>
              <tr>
                <th>Tên nhân viên</th>
                <th>
                  <ColumnFilter
                    label="Vai trò"
                    active={roleFilter !== "ALL"}
                    open={openFilter === "role"}
                    onToggle={() => toggle("role")}
                  >
                    <button
                      type="button"
                      className={`${styles.colFilterOption}${roleFilter === "ALL" ? ` ${styles.colFilterOptionActive}` : ""}`}
                      onClick={() => {
                        setRoleFilter("ALL");
                        setOpenFilter(null);
                      }}
                    >
                      Tất cả
                    </button>
                    {roleOptions.map(role => (
                      <button
                        key={role}
                        type="button"
                        className={`${styles.colFilterOption}${roleFilter === role ? ` ${styles.colFilterOptionActive}` : ""}`}
                        onClick={() => {
                          setRoleFilter(role);
                          setOpenFilter(null);
                        }}
                      >
                        {role}
                      </button>
                    ))}
                    {roleOptions.length === 0 && (
                      <div className={styles.colFilterEmpty}>Không có dữ liệu</div>
                    )}
                  </ColumnFilter>
                </th>
                <th>
                  <ColumnFilter
                    label="Xử lý bởi"
                    active={reviewerFilter !== "ALL"}
                    open={openFilter === "reviewer"}
                    onToggle={() => toggle("reviewer")}
                  >
                    <button
                      type="button"
                      className={`${styles.colFilterOption}${reviewerFilter === "ALL" ? ` ${styles.colFilterOptionActive}` : ""}`}
                      onClick={() => {
                        setReviewerFilter("ALL");
                        setOpenFilter(null);
                      }}
                    >
                      Tất cả
                    </button>
                    <button
                      type="button"
                      className={`${styles.colFilterOption}${reviewerFilter === "ME" ? ` ${styles.colFilterOptionActive}` : ""}`}
                      disabled={currentStaffAccountId == null}
                      onClick={() => {
                        setReviewerFilter("ME");
                        setOpenFilter(null);
                      }}
                    >
                      Tôi đã xử lý
                    </button>
                  </ColumnFilter>
                </th>
                <th>
                  <button
                    type="button"
                    className={`${styles.colFilterBtn}${dateSort !== "none" ? ` ${styles.colFilterBtnActive}` : ""}`}
                    aria-label="Sắp xếp ngày gửi"
                    title={
                      dateSort === "asc"
                        ? "Đang tăng dần — bấm để giảm dần"
                        : dateSort === "desc"
                          ? "Đang giảm dần — bấm để bỏ sắp xếp"
                          : "Bấm để sắp xếp tăng dần"
                    }
                    onClick={e => {
                      e.stopPropagation();
                      cycleDateSort();
                    }}
                  >
                    <span>Ngày gửi</span>
                    <DateSortIcon size={14} aria-hidden />
                  </button>
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
                    {(Object.keys(SWAP_STATUS_LABELS) as SwapStatus[]).map(s => (
                      <button
                        key={s}
                        type="button"
                        className={`${styles.colFilterOption}${statusFilter === s ? ` ${styles.colFilterOptionActive}` : ""}`}
                        onClick={() => {
                          setStatusFilter(s);
                          setOpenFilter(null);
                        }}
                      >
                        {SWAP_STATUS_LABELS[s]}
                      </button>
                    ))}
                  </ColumnFilter>
                </th>
                <th className="sched-col-actions">Hoạt động</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyCell}>
                    {swaps.length === 0
                      ? "Chưa có dữ liệu đơn đổi ca."
                      : "Không có đơn khớp bộ lọc."}
                  </td>
                </tr>
              ) : (
                paged.map(row => (
                  <tr
                    key={row.id}
                    className="swap-row-clickable"
                    onClick={() => onOpen(row)}
                  >
                    <td>{row.requesterName}</td>
                    <td>{row.requesterRoleName || "—"}</td>
                    <td>{row.reviewedByStaffAccountName?.trim() || ""}</td>
                    <td>{createdDateText(row.createdAt)}</td>
                    <td>
                      <span className={`sched-status-pill swap-status-${row.status.toLowerCase()}`}>
                        <span className="sched-status-dot" aria-hidden />
                        {SWAP_STATUS_LABELS[row.status]}
                      </span>
                    </td>
                    <td className="sched-col-actions" onClick={e => e.stopPropagation()}>
                      {row.status === "PENDING" ? (
                        <div className="swap-row-actions">
                          <button
                            type="button"
                            className="tpl-icon-btn swap-act-approve"
                            title="Duyệt"
                            disabled={busy}
                            onClick={() => onApprove(row)}
                          >
                            <Check size={16} />
                          </button>
                          <span className="swap-act-divider" aria-hidden />
                          <button
                            type="button"
                            className="tpl-icon-btn swap-act-reject"
                            title="Từ chối"
                            disabled={busy}
                            onClick={() => onReject(row)}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : null}
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
