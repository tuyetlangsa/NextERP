"use client";

import { CalendarPlus, LayoutGrid, ArrowLeftRight } from "lucide-react";

export type ScheduleMainTab = "schedules" | "templates" | "swaps";

const TABS: { id: ScheduleMainTab; label: string; Icon: typeof CalendarPlus }[] = [
  { id: "schedules", label: "Lịch", Icon: CalendarPlus },
  { id: "templates", label: "Template", Icon: LayoutGrid },
  { id: "swaps", label: "Đơn đổi ca", Icon: ArrowLeftRight },
];

interface Props {
  active: ScheduleMainTab;
  onChange: (tab: ScheduleMainTab) => void;
}

/** Shared tab bar — same chrome as old Template `cc-tabs`, used for all 3 schedule tabs. */
export function ScheduleTabs({ active, onChange }: Props) {
  return (
    <div className="cc-tabs sched-main-tabs" role="tablist" aria-label="Lịch làm việc">
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
