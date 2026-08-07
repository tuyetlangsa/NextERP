"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import {
  endOfWeek,
  formatIsoDate,
  parseIsoDate,
  startOfWeek,
  weekRangeLabel,
  weekRangeShort,
} from "@/lib/schedule/dates";
import styles from "./ScheduleWeekPicker.module.css";

type PanelMode = "weeks" | "months" | "years";

interface Props {
  value: string | null;
  /** Earliest selectable Monday (ISO). Weeks before this show an error. */
  minWeek?: string;
  disabled?: boolean;
  placeholder?: string;
  onChange: (weekStartIso: string) => void;
}

const MONTH_LABELS = Array.from({ length: 12 }, (_, i) => `Tháng ${i + 1}`);
const PAST_WEEK_MSG = "Không chọn được tuần trong quá khứ. Chỉ chọn từ tuần sau trở đi.";

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

/** Mondays of Mon–Sun weeks that overlap the calendar month. */
export function mondaysOverlappingMonth(year: number, monthIndex: number): string[] {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  let mon = startOfWeek(first);
  const out: string[] = [];
  for (let i = 0; i < 8; i++) {
    const sun = endOfWeek(mon);
    if (sun >= first && mon <= last) out.push(formatIsoDate(mon));
    if (mon > last) break;
    mon = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 7);
  }
  return out;
}

export function ScheduleWeekPicker({
  value,
  minWeek,
  disabled,
  placeholder = "Chọn ngày tháng",
  onChange,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PanelMode>("weeks");
  const [error, setError] = useState<string | null>(null);

  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());

  useEffect(() => {
    if (!open) return;
    const base = value ? parseIsoDate(value) : minWeek ? parseIsoDate(minWeek) : new Date();
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setMode("weeks");
  }, [open, value, minWeek]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const weeks = useMemo(
    () => mondaysOverlappingMonth(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => y - 1 + i);
  }, []);

  const goMonth = (delta: number) => {
    const next = shiftMonth(viewYear, viewMonth, delta);
    setViewYear(next.year);
    setViewMonth(next.month);
    setMode("weeks");
  };

  const goYear = (delta: number) => {
    setViewYear(y => y + delta);
    setMode("weeks");
  };

  const pickWeek = (w: string) => {
    if (minWeek != null && w < minWeek) {
      setError(PAST_WEEK_MSG);
      return;
    }
    setError(null);
    onChange(w);
    setOpen(false);
  };

  return (
    <div className={styles.picker} ref={rootRef}>
      <button
        type="button"
        className={`${styles.trigger}${value ? "" : ` ${styles.triggerPlaceholder}`}`}
        disabled={disabled}
        onClick={() => {
          setOpen(o => !o);
          setError(null);
        }}
        aria-expanded={open}
      >
        <span>{value ? weekRangeLabel(value) : placeholder}</span>
        <ChevronDown size={16} />
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.nav}>
            <button type="button" className={styles.navBtn} onClick={() => goYear(-1)} aria-label="Năm trước">
              <ChevronsLeft size={16} />
            </button>
            <button type="button" className={styles.navBtn} onClick={() => goMonth(-1)} aria-label="Tháng trước">
              <ChevronLeft size={16} />
            </button>

            <div className={styles.navCenter}>
              <button
                type="button"
                className={`${styles.navSelect}${mode === "months" ? ` ${styles.navSelectOpen}` : ""}`}
                onClick={() => setMode(m => (m === "months" ? "weeks" : "months"))}
              >
                <span>{MONTH_LABELS[viewMonth]}</span>
                <ChevronDown size={14} />
              </button>
              <button
                type="button"
                className={`${styles.navSelect}${mode === "years" ? ` ${styles.navSelectOpen}` : ""}`}
                onClick={() => setMode(m => (m === "years" ? "weeks" : "years"))}
              >
                <span>{viewYear}</span>
                <ChevronDown size={14} />
              </button>
            </div>

            <button type="button" className={styles.navBtn} onClick={() => goMonth(1)} aria-label="Tháng sau">
              <ChevronRight size={16} />
            </button>
            <button type="button" className={styles.navBtn} onClick={() => goYear(1)} aria-label="Năm sau">
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
                    setMode("weeks");
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
                    setMode("weeks");
                  }}
                >
                  {y}
                </button>
              ))}
            </div>
          )}

          {mode === "weeks" && (
            <ul className={styles.weekList}>
              {weeks.length === 0 && (
                <li className={styles.weekEmpty}>Không có tuần trong tháng này</li>
              )}
              {weeks.map(w => {
                const tooEarly = minWeek != null && w < minWeek;
                return (
                  <li key={w}>
                    <button
                      type="button"
                      className={[
                        styles.weekItem,
                        w === value ? styles.weekItemSelected : "",
                        tooEarly ? styles.weekItemPast : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => pickWeek(w)}
                    >
                      {weekRangeShort(w)}
                      {tooEarly ? " · không khả dụng" : ""}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}
