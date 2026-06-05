"use client";

import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

interface TBProps {
  icon?: LucideIcon;
  onClick?: () => void;
  kind?: "default" | "primary" | "danger";
  children: React.ReactNode;
  disabled?: boolean;
}

export function TB({ icon: Icon, onClick, kind = "default", children, disabled }: TBProps) {
  return (
    <button
      className={clsx("tb-btn", kind === "primary" && "primary", kind === "danger" && "danger")}
      onClick={onClick}
      disabled={disabled}
    >
      {Icon ? <Icon /> : null}
      {children}
    </button>
  );
}

interface ToolbarProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
}

export function WinToolbar({ left, right }: ToolbarProps) {
  return (
    <div className="win-toolbar">
      {left}
      {right ? <div className="tb-right">{right}</div> : null}
    </div>
  );
}
