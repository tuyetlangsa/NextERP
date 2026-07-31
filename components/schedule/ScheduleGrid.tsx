"use client";

import { useMemo, useState } from "react";
import { shortTime, weekDays } from "@/lib/schedule/dates";
import { normalizeShiftLookups } from "@/lib/schedule/normalizeShifts";
import type { ScheduleAssignmentRow } from "@/types/api/schedule";
import type { ShiftLookupItem } from "@/types/api/restaurant";

interface Props {
  weekStartDate: string;
  assignments: ScheduleAssignmentRow[];
  shifts: ShiftLookupItem[];
  readOnly?: boolean;
  emptyHint?: string;
  /** Open shift-assign modal for a day × shift cell. */
  onEditCell?: (shiftId: number, workDate: string, slots: ScheduleAssignmentRow[]) => void;
}

interface ShiftGroup {
  shiftId: number;
  shiftName: string;
  beginTime: string;
  endTime: string;
}

interface RolePill {
  roleId: number;
  roleName: string;
  count: number;
}

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

function rolePills(slots: ScheduleAssignmentRow[]): RolePill[] {
  const map = new Map<number, RolePill>();
  for (const s of slots) {
    const cur = map.get(s.roleId);
    if (cur) cur.count += 1;
    else map.set(s.roleId, { roleId: s.roleId, roleName: s.roleName, count: 1 });
  }
  return [...map.values()];
}

export function ScheduleGrid({
  weekStartDate,
  assignments,
  shifts,
  readOnly,
  emptyHint,
  onEditCell,
}: Props) {
  const days = useMemo(() => weekDays(weekStartDate), [weekStartDate]);
  const rows = useMemo(() => shiftGroups(assignments, shifts), [assignments, shifts]);
  const [hoverKey, setHoverKey] = useState<string | null>(null);

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
                <span className="sched-dom">{String(d.dayNum).padStart(2, "0")}</span>
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
                const key = `${shift.shiftId}|${d.iso}`;
                const slots = cells.get(key) ?? [];
                const pills = rolePills(slots);
                const isHover = hoverKey === key && slots.length > 0 && !readOnly;

                return (
                  <td
                    key={key}
                    className={`sched-cell${isHover ? " is-hover" : ""}`}
                    onMouseEnter={() => setHoverKey(key)}
                    onMouseLeave={() => setHoverKey(prev => (prev === key ? null : prev))}
                  >
                    {slots.length === 0 ? (
                      <span className="sched-empty">—</span>
                    ) : (
                      <>
                        <div className={`sched-cell-pills${isHover ? " is-dimmed" : ""}`}>
                          {pills.map(p => (
                            <span key={p.roleId} className="sched-role-pill">
                              {p.roleName}: {p.count}
                            </span>
                          ))}
                        </div>
                        {isHover && (
                          <div className="sched-cell-actions">
                            <button
                              type="button"
                              className="sched-cell-edit"
                              onClick={() => onEditCell?.(shift.shiftId, d.iso, slots)}
                            >
                              Sửa
                            </button>
                          </div>
                        )}
                      </>
                    )}
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
