"use client";

import clsx from "clsx";
import type { AppWindowState } from "@/types/domain";
import { ChromeIcons, SubsystemIcons, subsystemIconKey } from "./icons";

interface Props {
  w: AppWindowState;
  z: number;
  onClose: () => void;
  onMin: () => void;
  onFocus: () => void;
  children: React.ReactNode;
}

/**
 *  Windows always fill the desktop. The floating mode this used to have — drag,
 *  restore, a per-window pixel size — meant every screen had to lay out correctly
 *  at any arbitrary size, which it did not: a window small enough hid its own
 *  content behind clipped panes. One size removes that whole class of bug, and
 *  nothing in an ERP screen benefits from being seen next to another.
 *
 *  Minimise stays: it is how the taskbar switches between open windows.
 */
export function AppWindow({ w, z, onClose, onMin, onFocus, children }: Props) {
  if (w.minimized) return null;

  return (
    <div
      className={clsx("win", "maximized")}
      style={{ left: 0, top: 0, width: "100%", height: "calc(100% - 40px)", zIndex: z }}
      onMouseDown={onFocus}
    >
      <div className="win-titlebar">
        <span className="title-icon">
          {(() => {
            const Icon = SubsystemIcons[subsystemIconKey[w.def.id] ?? "generic"];
            return <Icon />;
          })()}
        </span>
        <span className="title">{w.def.label}</span>
        <div className="win-controls">
          <button className="win-ctrl" onClick={onMin} title="Thu nhỏ">
            <ChromeIcons.Min />
          </button>
          <button className="win-ctrl close" onClick={onClose} title="Đóng">
            <ChromeIcons.Close />
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}
