"use client";

import { LayoutGrid, Cpu, Monitor } from "lucide-react";

export type PosModuleTab = "table" | "pos-terminal" | "customer-display";

const TABS: { id: PosModuleTab; label: string; Icon: typeof LayoutGrid }[] = [
  { id: "table", label: "Bàn", Icon: LayoutGrid },
  { id: "pos-terminal", label: "Máy POS bán hàng", Icon: Cpu },
  { id: "customer-display", label: "Màn hình khách", Icon: Monitor },
];

interface Props {
  active: PosModuleTab;
  onChange: (tab: PosModuleTab) => void;
}

/** Shared tab bar for the "Bàn / Phòng / Máy" window — same chrome as `ScheduleTabs`. */
export function PosModuleTabs({ active, onChange }: Props) {
  return (
    <div className="cc-tabs sched-main-tabs" role="tablist" aria-label="Bàn / Phòng / Máy">
      {TABS.map(({ id, label, Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            className={`cc-tab${isActive ? " active" : ""}`}
            aria-selected={isActive}
            onClick={() => onChange(id)}
          >
            <Icon size={14} strokeWidth={isActive ? 2.25 : 1.75} aria-hidden />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
