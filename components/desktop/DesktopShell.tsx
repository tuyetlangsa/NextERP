"use client";

import { useEffect, useRef, useState } from "react";
import type { AppWindowState, SessionUser, Subsystem } from "@/types/domain";
import { subsystems } from "@/data/subsystems";
import { SubsystemIcons, subsystemIconKey } from "./icons";
import { AppWindow } from "./AppWindow";
import { StartMenu } from "./StartMenu";
import { Taskbar } from "./Taskbar";
import { WinCounter } from "@/components/windows/WinCounter";
import { WinArea } from "@/components/windows/WinArea";
import { WinAreaMenuCategory } from "@/components/windows/WinAreaMenuCategory";
import { WinTable } from "@/components/windows/WinTable";
import { WinUom } from "@/components/windows/WinUom";
import { WinItem } from "@/components/windows/WinItem";
import { WinPricing } from "@/components/windows/WinPricing";
import { WinChoice } from "@/components/windows/WinChoice";
import { WinSetMenu } from "@/components/windows/WinSetMenu";
import { WinDiscountPolicy } from "@/components/windows/WinDiscountPolicy";
import { WinKitchenStation } from "@/components/windows/WinKitchenStation";
import { WinCancellationReason } from "@/components/windows/WinCancellationReason";
import { WinShift } from "@/components/windows/WinShift";
import { WinStock } from "@/components/windows/WinStock";
import { WinStockMovement } from "@/components/windows/WinStockMovement";
import { WinUomConversion } from "@/components/windows/WinUomConversion";
import { WinStaffAccount } from "@/components/windows/WinStaffAccount";

const WIN_REGISTRY: Record<string, React.ComponentType> = {
  WinCounter,
  WinArea,
  WinAreaMenuCategory,
  WinTable,
  WinUom,
  WinItem,
  WinPricing,
  WinChoice,
  WinSetMenu,
  WinDiscountPolicy,
  WinKitchenStation,
  WinCancellationReason,
  WinShift,
  WinStock,
  WinStockMovement,
  WinUomConversion,
  WinStaffAccount,
};

const fmtClock = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const fmtDate = (d: Date) =>
  `${d.toLocaleDateString("vi-VN", { weekday: "long" })}, ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;

export function DesktopShell({ user }: { user: SessionUser }) {
  const [windows, setWindows] = useState<AppWindowState[]>([]);
  const [zMax, setZMax] = useState(100);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const launch = (def: Subsystem) => {
    if (!def.win) return;
    const existing = windows.find(w => w.id === def.id);
    if (existing) {
      setWindows(ws => ws.map(w => (w.id === def.id ? { ...w, minimized: false } : w)));
      focus(def.id);
      return;
    }
    const newZ = zMax + 1;
    setZMax(newZ);
    const offset = windows.length * 24;
    const next: AppWindowState = {
      id: def.id,
      def,
      pos: { x: 80 + offset, y: 50 + offset },
      size: {
        width: Math.min(window.innerWidth - 120, 1280),
        height: Math.min(window.innerHeight - 140, 760),
      },
      maximized: false,
      minimized: false,
      z: newZ,
    };
    setWindows([...windows, next]);
    setActiveId(def.id);
  };

  const focus = (id: string) => {
    const newZ = zMax + 1;
    setZMax(newZ);
    setWindows(ws => ws.map(w => (w.id === id ? { ...w, z: newZ, minimized: false } : w)));
    setActiveId(id);
  };
  const close = (id: string) => setWindows(ws => ws.filter(w => w.id !== id));
  const min = (id: string) => setWindows(ws => ws.map(w => (w.id === id ? { ...w, minimized: true } : w)));
  const max = (id: string) => setWindows(ws => ws.map(w => (w.id === id ? { ...w, maximized: !w.maximized } : w)));

  const launchRef = useRef(launch);
  launchRef.current = launch;

  useEffect(() => {
    const onOpenSubsystem = (e: Event) => {
      const detail = (e as CustomEvent<{ subsystemId: string }>).detail;
      const def = subsystems.find(s => s.id === detail?.subsystemId);
      if (def?.win) launchRef.current(def);
    };
    window.addEventListener("nextErp:openSubsystem", onOpenSubsystem);
    return () => window.removeEventListener("nextErp:openSubsystem", onOpenSubsystem);
  }, []);

  const desktopIcons = subsystems.filter(s => s.showOnDesktop);

  return (
    <div className="desktop">
      <div className="desktop-icons">
        {desktopIcons.map(s => {
          const Icon = SubsystemIcons[subsystemIconKey[s.id] ?? "generic"];
          const isOpen = windows.some(w => w.id === s.id);
          return (
            <button
              key={s.id}
              className={`desktop-icon${isOpen ? " active" : ""}`}
              onClick={() => launch(s)}
            >
              <span className="ico"><Icon /></span>
              <span className="label">{s.label}</span>
            </button>
          );
        })}
      </div>

      <div className="desktop-widgets">
        <div className="widget">
          <div className="clock">{fmtClock(clock)}</div>
          <div className="clock-date">{fmtDate(clock)}</div>
        </div>
        <div className="widget">
          <h4>Phiên làm việc</h4>
          <div className="session-row"><span className="k">Người dùng</span><span>{user.fullName || user.username}</span></div>
          <div className="session-row"><span className="k">Vai trò</span><span>{user.roleCode}</span></div>
        </div>
      </div>

      {windows.map(w => {
        const Comp = w.def.win ? WIN_REGISTRY[w.def.win] : undefined;
        return (
          <AppWindow
            key={w.id}
            w={w}
            z={w.z}
            onClose={() => close(w.id)}
            onMin={() => min(w.id)}
            onMax={() => max(w.id)}
            onFocus={() => focus(w.id)}
          >
            {Comp ? <Comp /> : (
              <div className="empty">
                <div>
                  <div className="em-title">{w.def.label}</div>
                  <div>Module này sẽ có ở giai đoạn 2 của lộ trình.</div>
                </div>
              </div>
            )}
          </AppWindow>
        );
      })}

      <StartMenu open={startOpen} onClose={() => setStartOpen(false)} onLaunch={launch} />

      <Taskbar
        windows={windows}
        activeId={activeId}
        startOpen={startOpen}
        onStartToggle={() => setStartOpen(o => !o)}
        onFocus={focus}
        onMin={min}
        user={{ username: user.username, roleCode: user.roleCode }}
        clock={clock}
      />
    </div>
  );
}
