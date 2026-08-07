"use client";

import { ArrowLeft, Check, X } from "lucide-react";
import { formatDateLong, shortTime } from "@/lib/schedule/dates";
import type { SwapRequestRow } from "@/types/api/schedule";
import styles from "./SwapDetailPanel.module.css";

interface Props {
  swap: SwapRequestRow;
  busy?: boolean;
  onBack: () => void;
  onApprove: () => void;
  onReject: () => void;
}

function workDateText(value: string | undefined | null): string {
  if (!value) return "—";
  const iso = value.length >= 10 ? value.slice(0, 10) : value;
  try {
    return formatDateLong(iso);
  } catch {
    return iso;
  }
}

function shiftTimeText(
  shiftName: string | undefined | null,
  begin: string | undefined | null,
  end: string | undefined | null,
): string {
  const name = shiftName?.trim() || "Ca";
  const b = shortTime(begin);
  const e = shortTime(end);
  if (b && e) return `${name}: ${b} - ${e}`;
  return name;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
    </div>
  );
}

export function SwapDetailPanel({ swap, busy, onBack, onApprove, onReject }: Props) {
  const pending = swap.status === "PENDING";
  const reason = swap.reason?.trim() || "—";
  const reviewedBy = swap.reviewedByStaffAccountName?.trim() || "—";

  return (
    <div className={styles.panel}>
      <button type="button" className={styles.back} onClick={onBack} disabled={busy}>
        <ArrowLeft size={18} />
        <span>Chi tiết đơn</span>
      </button>

      <div className={styles.card}>
        <h3 className={styles.title}>Đơn xin đổi ca làm</h3>

        <div className={styles.cols}>
          <section className={styles.col}>
            <h4 className={styles.colTitle}>Ca đang nhận</h4>
            <DetailRow label="Nhân viên" value={swap.requesterName || "—"} />
            <DetailRow label="Ngày tháng" value={workDateText(swap.requesterWorkDate)} />
            <DetailRow
              label="Thời gian"
              value={shiftTimeText(
                swap.requesterShiftName,
                swap.requesterBeginTime,
                swap.requesterEndTime,
              )}
            />
          </section>

          <div className={styles.divider} aria-hidden />

          <section className={styles.col}>
            <h4 className={styles.colTitle}>Ca muốn đổi</h4>
            <DetailRow label="Nhân viên thay thế" value={swap.targetName || "—"} />
            <DetailRow label="Ngày tháng" value={workDateText(swap.targetWorkDate)} />
            <DetailRow
              label="Thời gian"
              value={shiftTimeText(swap.targetShiftName, swap.targetBeginTime, swap.targetEndTime)}
            />
          </section>
        </div>

        <div className={styles.reason}>
          <span className={styles.reasonLabel}>Lý do:</span>
          {reason}
        </div>
        <div className={styles.reviewedBy}>
          <span className={styles.reasonLabel}>Xử lý bởi:</span>
          {reviewedBy}
        </div>
      </div>

      {pending && (
        <div className={styles.foot}>
          <button
            type="button"
            className={styles.btnReject}
            disabled={busy}
            onClick={onReject}
          >
            <X size={16} />
            Từ chối
          </button>
          <button
            type="button"
            className={styles.btnApprove}
            disabled={busy}
            onClick={onApprove}
          >
            <Check size={16} />
            Duyệt
          </button>
        </div>
      )}
    </div>
  );
}
