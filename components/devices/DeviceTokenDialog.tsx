"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

interface Props {
  open: boolean;
  title: string;
  token: string;
  onClose: () => void;
}

/**
 * One-time device-token reveal, shared by PosTerminalPanel and CustomerDisplayPanel.
 * The backend only ever returns `deviceToken` on the Register response — there is no
 * "show token again" endpoint, hence the explicit warning to save it now.
 */
export function DeviceTokenDialog({ open, title, token, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard API unavailable (permissions/context) — token is still selectable by hand.
    }
  };

  return (
    <>
      <div className="tpl-modal-backdrop" role="presentation" onClick={onClose}>
        <div
          className="tpl-modal tpl-modal-confirm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="device-token-title"
          onClick={e => e.stopPropagation()}
        >
          <div className="tpl-modal-head">
            <h3 id="device-token-title">{title}</h3>
            <button type="button" className="tpl-icon-btn" onClick={onClose} aria-label="Đóng">
              <X size={18} />
            </button>
          </div>
          <div className="device-token-value">{token}</div>
          <p className="tpl-modal-sub device-token-warning">
            Hãy lưu lại mã trước khi đóng — mã sẽ không hiển thị lại.
          </p>
          <div className="tpl-modal-foot">
            <div className="tpl-modal-foot-right" style={{ marginLeft: "auto" }}>
              <button type="button" className="tpl-btn tpl-btn-secondary" onClick={onClose}>
                Đóng
              </button>
              <button type="button" className="tpl-btn tpl-btn-primary" onClick={() => void handleCopy()}>
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>
      {copied && (
        <div className="device-toast" role="status">
          <Check size={16} />
          <span>Đã sao chép thành công mã</span>
          <button type="button" onClick={() => setCopied(false)} aria-label="Đóng thông báo">
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );
}
