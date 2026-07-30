"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { shortTime } from "@/lib/schedule/dates";
import { normalizeShiftLookups } from "@/lib/schedule/normalizeShifts";
import {
  cellHasContent,
  cellKey,
  expandCellRoles,
  type TemplateRoleQty,
} from "@/lib/schedule/templateCells";
import type { RoleRow } from "@/types/api/access";
import type { ShiftLookupItem } from "@/types/api/restaurant";

const DOW_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;

interface Props {
  /** Rows = active shifts from GET /api/lookups/shifts */
  shifts: ShiftLookupItem[];
  roles: RoleRow[];
  cells: Map<string, TemplateRoleQty[]>;
  duplicateMode: boolean;
  sourceKey: string | null;
  targetKeys: Set<string>;
  onEmptyClick: (dayOfWeek: number, shiftId: number) => void;
  onEdit: (dayOfWeek: number, shiftId: number) => void;
  onStartDuplicate: (dayOfWeek: number, shiftId: number) => void;
  onToggleTarget: (dayOfWeek: number, shiftId: number) => void;
}

function roleName(roles: RoleRow[], roleId: number): string {
  return roles.find(r => r.id === roleId)?.name ?? `Role #${roleId}`;
}

export function TemplateWeekGrid({
  shifts,
  roles,
  cells,
  duplicateMode,
  sourceKey,
  targetKeys,
  onEmptyClick,
  onEdit,
  onStartDuplicate,
  onToggleTarget,
}: Props) {
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  const sortedShifts = useMemo(() => normalizeShiftLookups(shifts), [shifts]);

  if (sortedShifts.length === 0) {
    return (
      <div className="tpl-grid-empty">
        Chưa có ca làm việc — hãy tạo ca trong Danh sách ca trước.
      </div>
    );
  }

  return (
    <div className="tpl-grid-wrap">
      <table className="tpl-grid">
        <thead>
          <tr>
            <th className="tpl-grid-corner" />
            {DOW_LABELS.map(label => (
              <th key={label} className="tpl-grid-day">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedShifts.map(shift => (
            <tr key={shift.id}>
              <td className="tpl-grid-shift">
                <div className="tpl-shift-name">{shift.name}</div>
                <div className="tpl-shift-time">
                  {shortTime(shift.beginTime)} - {shortTime(shift.endTime)}
                </div>
              </td>
              {DOW_LABELS.map((_, i) => {
                const dayOfWeek = i + 1;
                const key = cellKey(dayOfWeek, shift.id);
                const cellRoles = cells.get(key);
                const filled = cellHasContent(cellRoles);
                const isSource = sourceKey === key;
                const isTarget = targetKeys.has(key);
                const isHover = hoverKey === key && filled && !duplicateMode;

                let cellClass = "tpl-grid-cell";
                if (isSource) cellClass += " is-source";
                else if (isTarget) cellClass += " is-target";
                else if (isHover) cellClass += " is-hover";

                return (
                  <td
                    key={key}
                    className={cellClass}
                    onMouseEnter={() => setHoverKey(key)}
                    onMouseLeave={() => setHoverKey(prev => (prev === key ? null : prev))}
                    onClick={() => {
                      if (duplicateMode) {
                        if (!isSource) onToggleTarget(dayOfWeek, shift.id);
                        return;
                      }
                      if (!filled) onEmptyClick(dayOfWeek, shift.id);
                    }}
                  >
                    {!filled && (
                      <button
                        type="button"
                        className="tpl-cell-empty"
                        disabled={duplicateMode && isSource}
                        onClick={e => {
                          e.stopPropagation();
                          if (duplicateMode) {
                            if (!isSource) onToggleTarget(dayOfWeek, shift.id);
                            return;
                          }
                          onEmptyClick(dayOfWeek, shift.id);
                        }}
                      >
                        <span>Trống</span>
                        <span className="tpl-cell-plus" aria-hidden>
                          <Plus size={12} />
                        </span>
                      </button>
                    )}

                    {filled && (
                      <>
                        <div className={`tpl-cell-pills${isHover ? " is-dimmed" : ""}`}>
                          {expandCellRoles(cellRoles, roles).map(r => (
                            <span key={r.roleId} className="tpl-pill">
                              {roleName(roles, r.roleId)}: {r.requiredCount}
                            </span>
                          ))}
                        </div>
                        {isHover && (
                          <div className="tpl-cell-actions">
                            <button
                              type="button"
                              className="tpl-cell-action"
                              onClick={e => {
                                e.stopPropagation();
                                onEdit(dayOfWeek, shift.id);
                              }}
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              className="tpl-cell-action"
                              onClick={e => {
                                e.stopPropagation();
                                onStartDuplicate(dayOfWeek, shift.id);
                              }}
                            >
                              Nhân bản
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
