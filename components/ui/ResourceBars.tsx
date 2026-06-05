"use client";

/** Inline status strips shown above a Data List when a resource is loading or failed. */

export function LoadingBar({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: "6px 12px",
        background: "#eff6ff",
        fontSize: 12,
        color: "var(--info)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {text}
    </div>
  );
}

export function OfflineBar({ onRetry }: { onRetry: () => void }) {
  return (
    <BarShell color="var(--warning)" bg="#fef3c7" onRetry={onRetry}>
      Máy chủ đang offline — đang hiển thị dữ liệu mock.
    </BarShell>
  );
}

export function ErrorBar({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <BarShell color="var(--danger)" bg="#fee2e2" onRetry={onRetry}>
      {text}
    </BarShell>
  );
}

function BarShell({
  bg,
  color,
  onRetry,
  children,
}: {
  bg: string;
  color: string;
  onRetry?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "6px 12px",
        background: bg,
        fontSize: 12,
        color,
        borderBottom: "1px solid var(--border)",
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      <span>{children}</span>
      {onRetry && (
        <button onClick={onRetry} style={{ fontSize: 11, background: "transparent", border: "none", textDecoration: "underline", color }}>
          Thử lại
        </button>
      )}
    </div>
  );
}
