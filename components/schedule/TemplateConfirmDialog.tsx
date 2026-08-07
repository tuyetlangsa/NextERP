"use client";

import { X } from "lucide-react";

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function TemplateConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div className="tpl-modal-backdrop" role="presentation" onClick={busy ? undefined : onCancel}>
      <div
        className="tpl-modal tpl-modal-confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tpl-confirm-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="tpl-modal-head">
          <h3 id="tpl-confirm-title">{title}</h3>
          <button
            type="button"
            className="tpl-icon-btn"
            onClick={onCancel}
            disabled={busy}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>
        <p className="tpl-modal-sub">{message}</p>
        <div className="tpl-modal-foot">
          <div className="tpl-modal-foot-right" style={{ marginLeft: "auto" }}>
            <button
              type="button"
              className="tpl-btn tpl-btn-secondary"
              onClick={onCancel}
              disabled={busy}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              className="tpl-btn tpl-btn-primary"
              onClick={onConfirm}
              disabled={busy}
            >
              {busy ? "Đang xử lý..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
