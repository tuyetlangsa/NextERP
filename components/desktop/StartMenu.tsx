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

const groupIconKey = (id: SubsystemGroup | "all") =>
  id === "all" ? "generic"
  : id === "layout" ? "floorplan"
  : id === "menu" ? "items"
  : id === "pricing" ? "pricing"
  : id === "system" ? "config"
  : "reports" as const;

export function StartMenu({ open, onClose, onLaunch }: Props) {
  const [group, setGroup] = useState<SubsystemGroup | "all">("all");
  const [query, setQuery] = useState("");
  if (!open) return null;

  const items = subsystems.filter(s =>
    (group === "all" || s.group === group) &&
    (!query || s.label.toLowerCase().includes(query.toLowerCase()))
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
            const Icon = SubsystemIcons[groupIconKey(g.id)];
            return (
              <button key={g.id} className={clsx("group-btn", group === g.id && "active")} onClick={() => setGroup(g.id)}>
                <Icon /> {g.label}
              </button>
            );
          })}
        </div>
        <div className="right">
          <div className="search">
            <input placeholder="Tìm kiếm module..." value={query} onChange={e => setQuery(e.target.value)} autoFocus />
          </div>
          <div className="items">
            {items.map(s => {
              const Icon = SubsystemIcons[subsystemIconKey[s.id] ?? "generic"];
              return (
                <button key={s.id} className="item" onClick={() => { onLaunch(s); onClose(); }}>
                  <span className="ico"><Icon /></span>
                  <span className="meta">
                    <span className="t">{s.label}</span>
                    <span className="s">{s.description}</span>
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
