"use client";

import { useEffect, useState } from "react";
import type { AppWindowState, SessionUser, Subsystem } from "@/types/domain";
import { subsystems } from "@/data/subsystems";
import { SubsystemIcons, subsystemIconKey } from "./icons";
import { AppWindow } from "./AppWindow";
import { StartMenu } from "./StartMenu";
import { Taskbar } from "./Taskbar";
import { WinKhu } from "@/components/windows/WinKhu";

const WIN_REGISTRY: Record<string, React.ComponentType> = {
  WinKhu,
};

const fmtClock = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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
    const w: AppWindowState = {
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
    setWindows([...windows, w]);
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

  const desktopIcons = subsystems.filter(s => s.desktop);

  return (
    <div className="desktop">
      <div className="desktop-icons">
        {desktopIcons.map(s => {
          const Icon = SubsystemIcons[subsystemIconKey[s.id] ?? "fn"];
          const isOpen = windows.some(w => w.id === s.id);
          return (
            <button
              key={s.id}
              className={`desktop-icon${isOpen ? " active" : ""}`}
              onClick={() => launch(s)}
            >
              <span className="ico"><Icon /></span>
              <span className="label">{s.ten}</span>
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
          <div className="session-row"><span className="k">Người dùng</span><span>{user.username}</span></div>
          <div className="session-row"><span className="k">Vai trò</span><span>{user.role}</span></div>
        </div>
        <div className="widget">
          <h4>Cảnh báo tồn kho</h4>
          <div className="alert-item"><span className="name">Bia Heineken</span><span className="val warn">12 chai</span></div>
          <div className="alert-item"><span className="name">Bánh Flan</span><span className="val warn">3 cái</span></div>
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
                  <div className="em-title">{w.def.ten}</div>
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
        user={{ name: user.username, role: user.role }}
        clock={clock}
      />
    </div>
  );
}
