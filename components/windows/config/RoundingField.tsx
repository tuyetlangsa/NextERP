interface RoundingFieldProps {
  keyCode: string;
  digits: number;
  disabled: boolean;
  onChange: (digits: number) => void;
}

export function RoundingField({ keyCode, digits, disabled, onChange }: RoundingFieldProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 0" }}>
      <div style={{ flex: "0 0 280px", fontSize: 13, fontWeight: 500, fontFamily: "monospace" }}>
        {keyCode}
      </div>
      <input
        type="number"
        value={digits}
        disabled={disabled}
        min={0}
        max={4}
        step={1}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        style={{ width: 80, padding: "4px 8px", fontSize: 13, border: "1px solid var(--border)", borderRadius: 4 }}
      />
      <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>số thập phân</span>
    </div>
  );
}
