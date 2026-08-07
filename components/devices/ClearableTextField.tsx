"use client";

import { X } from "lucide-react";

interface Props {
  label: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
}

/** `.tpl-field` text input with an inline "×" clear button, matching the Figma inputs. */
export function ClearableTextField({ label, value, placeholder, required, disabled, onChange }: Props) {
  return (
    <label className="tpl-field">
      <span className="tpl-field-label">
        {label} {required && <span className="required" aria-hidden>*</span>}
      </span>
      <div className="tpl-input-wrap">
        <input
          className="tpl-input"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
        />
        {value && !disabled && (
          <button
            type="button"
            className="tpl-input-clear"
            onClick={() => onChange("")}
            aria-label={`Xoá ${label}`}
          >
            <X size={14} />
          </button>
        )}
      </div>
    </label>
  );
}
