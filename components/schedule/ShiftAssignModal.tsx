"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Search, User, X } from "lucide-react";
import { scheduleApi } from "@/lib/api/schedule";
import { formatApiError } from "@/lib/http/formatError";
import { formatDateLong, shortTime } from "@/lib/schedule/dates";
import type { StaffAccountRow } from "@/types/api/access";
import type { ScheduleAssignmentRow } from "@/types/api/schedule";
import type { ShiftLookupItem } from "@/types/api/restaurant";

interface DraftSlot {
  id: number;
  roleId: number;
  roleName: string;
  staffAccountId: number | null;
  staffFullName: string | null;
  version: number;
  warning: string | null;
  dirty: boolean;
  /** FE-only slot chưa có trên server — tạo khi bấm Lưu. */
  isNew?: boolean;
}

interface Props {
  open: boolean;
  scheduleId: number;
  shiftId: number;
  workDate: string;
  slots: ScheduleAssignmentRow[];
  shifts: ShiftLookupItem[];
  busy?: boolean;
  onClose: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function parsePreviewWarning(data: {
  hasWarnings?: boolean;
  HasWarnings?: boolean;
  warnings?: { message?: string; Message?: string }[];
  Warnings?: { message?: string; Message?: string }[];
}): string | null {
  const has = data.hasWarnings === true || data.HasWarnings === true;
  if (!has) return null;
  const list = data.warnings ?? data.Warnings ?? [];
  if (list.length > 0) {
    return list.map(w => w.message ?? w.Message ?? "").filter(Boolean).join(" · ");
  }
  return "Vượt quá số giờ cho phép";
}

export function ShiftAssignModal({
  open,
  scheduleId,
  shiftId,
  workDate,
  slots,
  shifts,
  busy: parentBusy,
  onClose,
  onSaved,
  onError,
}: Props) {
  const [draft, setDraft] = useState<DraftSlot[]>([]);
  const [saving, setSaving] = useState(false);
  const [openRoleId, setOpenRoleId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<StaffAccountRow[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const tempIdRef = useRef(-1);

  const shift = shifts.find(s => s.id === shiftId);
  const title = useMemo(() => {
    const shiftLabel = shift?.name ?? slots[0]?.shiftName ?? `Ca #${shiftId}`;
    const time = shift
      ? ` (${shortTime(shift.beginTime)} - ${shortTime(shift.endTime)})`
      : "";
    return `${shiftLabel}${time} — ${formatDateLong(workDate)}`;
  }, [shift, slots, shiftId, workDate]);

  useEffect(() => {
    if (!open) return;
    tempIdRef.current = -1;
    setDraft(
      slots.map(s => ({
        id: s.id,
        roleId: s.roleId,
        roleName: s.roleName,
        staffAccountId: s.staffAccountId,
        staffFullName: s.staffFullName,
        version: s.version,
        warning: null,
        dirty: false,
        isNew: false,
      })),
    );
    setOpenRoleId(null);
    setSearch("");
    setCandidates([]);
  }, [open, slots]);

  const roles = useMemo(() => {
    const order: number[] = [];
    const map = new Map<number, { roleId: number; roleName: string; slots: DraftSlot[] }>();
    for (const s of draft) {
      let g = map.get(s.roleId);
      if (!g) {
        g = { roleId: s.roleId, roleName: s.roleName, slots: [] };
        map.set(s.roleId, g);
        order.push(s.roleId);
      }
      g.slots.push(s);
    }
    return order.map(id => map.get(id)!);
  }, [draft]);

  const loadCandidates = useCallback(async (roleId: number) => {
    setLoadingCandidates(true);
    const res = await scheduleApi.listStaffCandidates(roleId);
    setLoadingCandidates(false);
    if (res.isSuccess) {
      setCandidates(res.data.items.filter(s => s.isActive && !s.isLocked));
    } else {
      setCandidates([]);
      onError(formatApiError(res));
    }
  }, [onError]);

  const openAdd = async (roleId: number) => {
    if (openRoleId === roleId) {
      setOpenRoleId(null);
      setSearch("");
      return;
    }
    setOpenRoleId(roleId);
    setSearch("");
    await loadCandidates(roleId);
  };

  const assignedIds = useMemo(
    () => new Set(draft.filter(d => d.staffAccountId != null).map(d => d.staffAccountId!)),
    [draft],
  );

  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidates
      .filter(c => !assignedIds.has(c.id))
      .filter(c => !q || c.fullName.toLowerCase().includes(q) || c.username.toLowerCase().includes(q));
  }, [candidates, assignedIds, search]);

  const assignStaff = async (roleId: number, staff: StaffAccountRow) => {
    const empty = draft.find(d => d.roleId === roleId && d.staffAccountId == null && !d.isNew);
    const previewId =
      empty?.id
      ?? draft.find(d => d.roleId === roleId && d.id > 0)?.id
      ?? slots.find(s => s.roleId === roleId)?.id
      ?? null;

    let warning: string | null = null;
    if (previewId != null) {
      const preview = await scheduleApi.previewAssignment(previewId, staff.id);
      if (preview.isSuccess) {
        warning = parsePreviewWarning(preview.data as Parameters<typeof parsePreviewWarning>[0]);
      }
    }

    if (empty) {
      setDraft(prev =>
        prev.map(d =>
          d.id === empty.id
            ? {
                ...d,
                staffAccountId: staff.id,
                staffFullName: staff.fullName,
                warning,
                dirty: true,
              }
            : d,
        ),
      );
    } else {
      const roleName =
        draft.find(d => d.roleId === roleId)?.roleName
        ?? slots.find(s => s.roleId === roleId)?.roleName
        ?? `Role #${roleId}`;
      const newId = tempIdRef.current--;
      setDraft(prev => [
        ...prev,
        {
          id: newId,
          roleId,
          roleName,
          staffAccountId: staff.id,
          staffFullName: staff.fullName,
          version: 0,
          warning,
          dirty: true,
          isNew: true,
        },
      ]);
    }

    setOpenRoleId(null);
    setSearch("");
  };

  const clearStaff = (slotId: number) => {
    setDraft(prev => {
      const target = prev.find(d => d.id === slotId);
      if (!target) return prev;
      // Slot mới chưa lưu: bỏ hẳn khỏi draft.
      if (target.isNew) return prev.filter(d => d.id !== slotId);
      return prev.map(d =>
        d.id === slotId
          ? {
              ...d,
              staffAccountId: null,
              staffFullName: null,
              warning: null,
              dirty: true,
            }
          : d,
      );
    });
  };

  const handleSave = async () => {
    const toUpdate = draft.filter(d => d.dirty && !d.isNew && d.id > 0);
    const toCreate = draft.filter(d => d.isNew && d.staffAccountId != null);

    if (toUpdate.length === 0 && toCreate.length === 0) {
      onClose();
      return;
    }

    setSaving(true);

    if (toUpdate.length > 0) {
      const res = await scheduleApi.editAssignmentsBatch(
        scheduleId,
        toUpdate.map(d => ({
          assignmentId: d.id,
          staffAccountId: d.staffAccountId,
          expectedVersion: d.version,
        })),
      );
      if (!res.isSuccess) {
        setSaving(false);
        onError(formatApiError(res));
        return;
      }
    }

    for (const slot of toCreate) {
      const res = await scheduleApi.addAssignment(scheduleId, {
        workDate,
        shiftId,
        roleId: slot.roleId,
        staffAccountId: slot.staffAccountId,
      });
      if (!res.isSuccess) {
        setSaving(false);
        onError(formatApiError(res));
        return;
      }
    }

    setSaving(false);
    onSaved();
    onClose();
  };

  if (!open) return null;

  const disabled = saving || parentBusy;

  return (
    <div className="tpl-modal-backdrop" role="presentation" onClick={disabled ? undefined : onClose}>
      <div
        className="sched-assign-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sched-assign-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="tpl-modal-head">
          <h3 id="sched-assign-title">{title}</h3>
          <button type="button" className="tpl-icon-btn" onClick={onClose} disabled={disabled} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <div className="sched-assign-cols">
          {roles.map(role => {
            const filled = role.slots.filter(s => s.staffAccountId != null);
            return (
              <div key={role.roleId} className="sched-assign-col">
                <div className="sched-assign-col-head">
                  {role.roleName}: {filled.length}
                </div>
                <div className="sched-assign-list">
                  {filled.map(slot => (
                    <div
                      key={slot.id}
                      className={`sched-assign-card${slot.warning ? " has-warn" : ""}`}
                    >
                      <span className="sched-avatar" aria-hidden>
                        {slot.staffFullName ? initials(slot.staffFullName) : <User size={14} />}
                      </span>
                      <div className="sched-assign-card-body">
                        <div className={`sched-assign-name${slot.warning ? " is-warn" : ""}`}>
                          {slot.staffFullName}
                        </div>
                        {slot.warning && (
                          <div className="sched-assign-warn">{slot.warning}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        className="tpl-icon-btn"
                        title="Bỏ gán"
                        disabled={disabled}
                        onClick={() => clearStaff(slot.id)}
                      >
                        <Minus size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="sched-assign-add-wrap">
                  <button
                    type="button"
                    className="sched-assign-add"
                    disabled={disabled}
                    onClick={() => void openAdd(role.roleId)}
                  >
                    <Plus size={14} />
                    Thêm nhân viên
                  </button>
                  {openRoleId === role.roleId && (
                    <div className="sched-assign-dropdown">
                      <div className="sched-assign-search">
                        <Search size={14} aria-hidden />
                        <input
                          type="search"
                          placeholder="Tìm nhân viên..."
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <ul>
                        {loadingCandidates && <li className="sched-assign-empty">Đang tải...</li>}
                        {!loadingCandidates && filteredCandidates.length === 0 && (
                          <li className="sched-assign-empty">Không có nhân viên phù hợp</li>
                        )}
                        {filteredCandidates.map(c => (
                          <li key={c.id}>
                            <button type="button" onClick={() => void assignStaff(role.roleId, c)}>
                              <span className="sched-avatar sm" aria-hidden>
                                {initials(c.fullName)}
                              </span>
                              <span>{c.fullName}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="tpl-modal-foot">
          <div className="tpl-modal-foot-right" style={{ marginLeft: "auto" }}>
            <button type="button" className="tpl-btn tpl-btn-secondary" onClick={onClose} disabled={disabled}>
              Hủy
            </button>
            <button type="button" className="tpl-btn tpl-btn-primary" onClick={() => void handleSave()} disabled={disabled}>
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
