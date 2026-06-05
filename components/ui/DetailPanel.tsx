"use client";

import clsx from "clsx";
import { ChromeIcons } from "@/components/desktop/icons";

interface Props {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export function DetailPanel({ title, collapsed, onToggle, children }: Props) {
  return (
    <div className={clsx("detail-panel", collapsed && "collapsed")}>
      <div className="detail-panel-header">
        {!collapsed && <span className="title">{title}</span>}
        <button className="collapse-btn" onClick={onToggle} title={collapsed ? "Mở rộng" : "Thu gọn"}>
          {collapsed ? <ChromeIcons.OpenLeft /> : <ChromeIcons.CollapseLeft />}
        </button>
      </div>
      {!collapsed && <div className="detail-panel-body">{children}</div>}
    </div>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

export function Field({ label, required, children }: FieldProps) {
  return (
    <div className="field">
      <label>
        {label}
        {required && <span className="required">*</span>}
      </label>
      {children}
    </div>
  );
}
