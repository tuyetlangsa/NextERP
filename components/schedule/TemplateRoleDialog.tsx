"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { RoleRow } from "@/types/api/access";
import type { TemplateRoleQty } from "@/lib/schedule/templateCells";

interface Props {
  open: boolean;
  titleContext: string;
  roles: RoleRow[];
  initial: TemplateRoleQty[];
  onClose: () => void;
  onSave: (roles: TemplateRoleQty[]) => void;
  onClear: () => void;
}

export function TemplateRoleDialog({
  open,
  titleContext,
  roles,
  initial,
  onClose,
  onSave,
  onClear,
}: Props) {
  const [qty, setQty] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!open) return;
    const next: Record<number, string> = {};
    for (const role of roles) {
      const found = initial.find(r => r.roleId === role.id);
      next[role.id] = found ? String(found.requiredCount) : "0";
    }
    setQty(next);
  }, [open, roles, initial]);

  if (!open) return null;

  const handleSave = () => {
    const result: TemplateRoleQty[] = roles.map(role => ({
      roleId: role.id,
      requiredCount: Math.max(0, Math.floor(Number(qty[role.id]) || 0)),
    }));
    onSave(result);
  };

  return (
    <div className="tpl-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="tpl-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tpl-role-dialog-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="tpl-modal-head">
          <h3 id="tpl-role-dialog-title">Chọn vai trò</h3>
          <button type="button" className="tpl-icon-btn" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>
        <p className="tpl-modal-sub">{titleContext}</p>

        <div className="tpl-modal-fields">
          {roles.length === 0 && (
            <p className="tpl-muted">Chưa có vai trò — hãy tạo vai trò trong Quản lý tài khoản.</p>
          )}
          {roles.map(role => (
            <label key={role.id} className="tpl-field">
              <span className="tpl-field-label">{role.name}</span>
              <input
                type="number"
                min={0}
                step={1}
                className="tpl-input"
                placeholder="Nhập số lượng"
                value={qty[role.id] ?? "0"}
                onChange={e => setQty(prev => ({ ...prev, [role.id]: e.target.value }))}
              />
            </label>
          ))}
        </div>

        <div className="tpl-modal-foot">
          <button type="button" className="tpl-btn tpl-btn-ghost" onClick={onClear}>
            Xóa hết ô
          </button>
          <div className="tpl-modal-foot-right">
            <button type="button" className="tpl-btn tpl-btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button type="button" className="tpl-btn tpl-btn-primary" onClick={handleSave}>
              Lưu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
