import { useState, type ReactNode } from "react";

interface ConfigGroupAccordionProps {
  title: string;
  count: number;
  hasDirty: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function ConfigGroupAccordion({
  title,
  count,
  hasDirty,
  defaultOpen = false,
  children,
}: ConfigGroupAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "10px 14px",
          background: open ? "var(--bg-hover)" : "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span
          style={{
            fontSize: 12,
            transition: "transform 0.15s",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          ▶
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{title}</span>
        {hasDirty && (
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--warning)",
            }}
          />
        )}
        <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>
          {count} mục
        </span>
      </button>
      {open && (
        <div style={{ padding: "4px 14px 12px 36px", display: "flex", flexDirection: "column" }}>{children}</div>
      )}
    </div>
  );
}
