"use client";

import clsx from "clsx";
import type { AppWindowState } from "@/types/domain";
import { SubsystemIcons, subsystemIconKey } from "./icons";

interface Props {
  windows: AppWindowState[];
  activeId: string | null;
  startOpen: boolean;
  onStartToggle: () => void;
  onFocus: (id: string) => void;
  onMin: (id: string) => void;
  user: { username: string; roleCode: string };
  clock: Date;
}

const fmtClock = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

export function Taskbar({ windows, activeId, startOpen, onStartToggle, onFocus, onMin, user, clock }: Props) {
  return (
    <div className="taskbar">
      <button className={clsx("start-btn", startOpen && "open")} onClick={onStartToggle}>
        <span className="dots"><span /><span /><span /><span /></span>
        Bắt đầu
      </button>
      <div className="task-divider" />
      <div className="taskbar-tabs">
        {windows.map(w => {
          const Icon = SubsystemIcons[subsystemIconKey[w.def.id] ?? "generic"];
          const active = activeId === w.id && !w.minimized;
          return (
            <button
              key={w.id}
              className={clsx("task-tab", active && "active")}
              onClick={() => (w.minimized || activeId !== w.id ? onFocus(w.id) : onMin(w.id))}
            >
              {!w.minimized && <span className="dot" />}
              <Icon />
              <span>{w.def.label}</span>
            </button>
          );
        })}
      </div>
      <div className="taskbar-right">
        <span className="user-chip">
          <span className="av">{user.username.charAt(0).toUpperCase()}</span>
          <span>{user.username} · {user.roleCode}</span>
        </span>
        <span className="clock-mini">{fmtClock(clock)}</span>
      </div>
    </div>
  );
}
