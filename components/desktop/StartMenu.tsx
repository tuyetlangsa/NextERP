"use client";

import { useState } from "react";
import clsx from "clsx";
import type { Subsystem, SubsystemGroup } from "@/types/domain";
import { subsystems, subsystemGroups } from "@/data/subsystems";
import { SubsystemIcons, subsystemIconKey } from "./icons";

interface Props {
  open: boolean;
  onClose: () => void;
  onLaunch: (def: Subsystem) => void;
}

export function StartMenu({ open, onClose, onLaunch }: Props) {
  const [grp, setGrp] = useState<SubsystemGroup | "all">("all");
  const [q, setQ] = useState("");
  if (!open) return null;

  const items = subsystems.filter(s =>
    (grp === "all" || s.group === grp) &&
    (!q || s.ten.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 1099 }} onClick={onClose} />
      <div className="start-menu" onClick={e => e.stopPropagation()}>
        <div className="left">
          <div style={{ padding: "4px 16px 12px", color: "#71717a", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Module
          </div>
          {subsystemGroups.map(g => {
            const Icon = SubsystemIcons[g.id === "all" ? "fn" : (g.id === "mat-bang" ? "layout" : g.id === "thuc-don" ? "items" : g.id === "gia-km" ? "pricing" : g.id === "he-thong" ? "cog" : "report")];
            return (
              <button key={g.id} className={clsx("group-btn", grp === g.id && "active")} onClick={() => setGrp(g.id)}>
                <Icon /> {g.ten}
              </button>
            );
          })}
        </div>
        <div className="right">
          <div className="search">
            <input placeholder="Tìm kiếm module..." value={q} onChange={e => setQ(e.target.value)} autoFocus />
          </div>
          <div className="items">
            {items.map(s => {
              const Icon = SubsystemIcons[subsystemIconKey[s.id] ?? "fn"];
              return (
                <button key={s.id} className="item" onClick={() => { onLaunch(s); onClose(); }}>
                  <span className="ico"><Icon /></span>
                  <span className="meta">
                    <span className="t">{s.ten}</span>
                    <span className="s">{s.sub}</span>
                  </span>
                  {!s.win && <span style={{ fontSize: 11, color: "#71717a" }}>Sắp ra mắt</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
