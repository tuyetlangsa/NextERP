"use client";

interface Props {
  left?: React.ReactNode;
  right?: React.ReactNode;
}

export function StatusBar({ left, right }: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "4px 12px",
        background: "var(--window-chrome)",
        borderTop: "1px solid var(--border)",
        fontSize: 11,
        color: "var(--fg-muted)",
        gap: 16,
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "center", flex: 1 }}>{left}</div>
      <div>{right}</div>
    </div>
  );
}
