"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import type { AppWindowState } from "@/types/domain";
import { ChromeIcons, SubsystemIcons, subsystemIconKey } from "./icons";

interface Props {
  w: AppWindowState;
  z: number;
  onClose: () => void;
  onMin: () => void;
  onMax: () => void;
  onFocus: () => void;
  children: React.ReactNode;
}

export function AppWindow({ w, z, onClose, onMin, onMax, onFocus, children }: Props) {
  const [pos, setPos] = useState(w.pos);
  const [size] = useState(w.size);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => { setPos(w.pos); }, [w.pos]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (w.maximized) return;
    onFocus();
    dragRef.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y };
  };

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const d = dragRef.current;
      setPos({ x: d.ox + (e.clientX - d.x), y: Math.max(0, d.oy + (e.clientY - d.y)) });
    };
    const up = () => { dragRef.current = null; };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  if (w.minimized) return null;

  const style: React.CSSProperties = w.maximized
    ? { left: 0, top: 0, width: "100%", height: "calc(100% - 40px)", zIndex: z }
    : { left: pos.x, top: pos.y, width: size.width, height: size.height, zIndex: z };

  const Icon = SubsystemIcons[subsystemIconKey[w.def.id] ?? "generic"];

  return (
    <div className={clsx("win", w.maximized && "maximized")} style={style} onMouseDown={onFocus}>
      <div className="win-titlebar" onMouseDown={onMouseDown} onDoubleClick={onMax}>
        <span className="title-icon"><Icon /></span>
        <span className="title">{w.def.label}</span>
        <div className="win-controls">
          <button className="win-ctrl" onClick={onMin} title="Thu nhỏ"><ChromeIcons.Min /></button>
          <button className="win-ctrl" onClick={onMax} title={w.maximized ? "Khôi phục" : "Phóng to"}>
            {w.maximized ? <ChromeIcons.Restore /> : <ChromeIcons.Max />}
          </button>
          <button className="win-ctrl close" onClick={onClose} title="Đóng"><ChromeIcons.Close /></button>
        </div>
      </div>
      {children}
    </div>
  );
}
