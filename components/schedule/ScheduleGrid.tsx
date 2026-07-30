"use client";

import { useMemo } from "react";
import { shortTime, weekDays } from "@/lib/schedule/dates";
import { normalizeShiftLookups } from "@/lib/schedule/normalizeShifts";
import type { ScheduleAssignmentRow } from "@/types/api/schedule";
import type { ShiftLookupItem } from "@/types/api/restaurant";

interface Props {
  weekStartDate: string;
  assignments: ScheduleAssignmentRow[];
  /** Rows of the grid = active shifts from GET /api/lookups/shifts */
  shifts: ShiftLookupItem[];
  readOnly?: boolean;
  emptyHint?: string;
  busyAssignmentId?: number | null;
  onPickStaff?: (assignment: ScheduleAssignmentRow) => void;
  onClearStaff?: (assignment: ScheduleAssignmentRow) => void;
}

interface ShiftGroup {
  shiftId: number;
  shiftName: string;
  beginTime: string;
  endTime: string;
}

/** Hàng lưới = toàn bộ ca từ lookup; bổ sung ca chỉ có trong assignment (nếu thiếu). */
function shiftGroups(
  assignments: ScheduleAssignmentRow[],
  shifts: ShiftLookupItem[],
): ShiftGroup[] {
  const normalized = normalizeShiftLookups(shifts);
  const byId = new Map<number, ShiftGroup>();

  for (const s of normalized) {
    byId.set(s.id, {
      shiftId: s.id,
      shiftName: s.name,
      beginTime: shortTime(s.beginTime),
      endTime: shortTime(s.endTime),
    });
  }

  for (const a of assignments) {
    if (byId.has(a.shiftId)) continue;
    const lookup = normalized.find(s => s.id === a.shiftId);
    byId.set(a.shiftId, {
      shiftId: a.shiftId,
      shiftName: a.shiftName || lookup?.name || `Ca #${a.shiftId}`,
      beginTime: shortTime(lookup?.beginTime),
      endTime: shortTime(lookup?.endTime),
    });
  }

  return [...byId.values()].sort((x, y) => x.beginTime.localeCompare(y.beginTime));
}

export function ScheduleGrid({
  weekStartDate,
  assignments,
  shifts,
  readOnly,
  emptyHint,
  busyAssignmentId,
  onPickStaff,
  onClearStaff,
}: Props) {
  const days = useMemo(() => weekDays(weekStartDate), [weekStartDate]);
  const rows = useMemo(() => shiftGroups(assignments, shifts), [assignments, shifts]);

  const cells = useMemo(() => {
    const map = new Map<string, ScheduleAssignmentRow[]>();
    for (const a of assignments) {
      const key = `${a.shiftId}|${a.workDate}`;
      const list = map.get(key);
      if (list) list.push(a);
      else map.set(key, [a]);
    }
    return map;
  }, [assignments]);

  if (rows.length === 0) {
    return (
      <div className="sched-grid-empty">
        {emptyHint ??
          (shifts.length === 0
            ? "Chưa có ca làm việc — hãy tạo ca trong Danh sách ca."
            : "Lịch này chưa có ô phân công nào — kiểm tra lại các dòng của template.")}
      </div>
    );
  }

  return (
    <div className="sched-grid-wrap">
      <table className="sched-grid">
        <thead>
          <tr>
            <th className="sched-corner" />
            {days.map(d => (
              <th key={d.iso} className="sched-day-head">
                <span className="sched-dow">{d.label}</span>
                <span className="sched-dom">{d.dayNum}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(shift => (
            <tr key={shift.shiftId}>
              <td className="sched-shift-label">
                <div className="sched-shift-name">{shift.shiftName}</div>
                {shift.beginTime && (
                  <div className="sched-shift-time">
                    {shift.beginTime} - {shift.endTime}
                  </div>
                )}
              </td>
              {days.map(d => {
                const slots = cells.get(`${shift.shiftId}|${d.iso}`) ?? [];
                return (
                  <td key={`${shift.shiftId}-${d.iso}`} className="sched-cell">
                    {slots.length === 0 && <span className="sched-empty">—</span>}
                    {slots.map(slot => {
                      const busy = busyAssignmentId === slot.id;
                      return (
                        <div key={slot.id} className="sched-slot">
                          <span className="sched-slot-role">{slot.roleName}</span>
                          {slot.staffAccountId === null ? (
                            <button
                              type="button"
                              className="sched-slot-empty"
                              disabled={readOnly || busy}
                              onClick={() => onPickStaff?.(slot)}
                            >
                              {busy ? "Đang lưu..." : "Trống — thêm nhân viên"}
                            </button>
                          ) : (
                            <span className="sched-slot-staff">
                              <button
                                type="button"
                                className="sched-slot-name"
                                disabled={readOnly || busy}
                                onClick={() => onPickStaff?.(slot)}
                                title="Đổi nhân viên"
                              >
                                {slot.staffFullName}
                              </button>
                              {!readOnly && (
                                <button
                                  type="button"
                                  className="sched-slot-clear"
                                  disabled={busy}
                                  onClick={() => onClearStaff?.(slot)}
                                  title="Bỏ trống ô này"
                                >
                                  ×
                                </button>
                              )}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
