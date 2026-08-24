import type { ConfigValueType } from "@/types/api/configuration";

interface ConfigFieldProps {
  code: string;
  description: string | null;
  valueType: ConfigValueType;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}

export function ConfigField({
  code,
  description,
  valueType,
  value,
  disabled,
  onChange,
}: ConfigFieldProps) {
  // Description (tiếng Việt, seed cùng ConfigValue) là nhãn duy nhất của field.
  // Fallback về code chỉ khi một row được thêm tay mà bỏ trống Description.
  const label = description ?? code;
  const isPassword = code.includes("password") || code.includes("api_key");

  const inputEl = (() => {
    switch (valueType) {
      case "BOOL":
        return (
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: disabled ? "default" : "pointer" }}>
            <input
              type="checkbox"
              checked={value === "true"}
              disabled={disabled}
              onChange={(e) => onChange(e.target.checked ? "true" : "false")}
            />
            <span style={{ fontSize: 13 }}>{value === "true" ? "Bật" : "Tắt"}</span>
          </label>
        );
      case "NUMBER":
        return (
          <input
            type="number"
            value={value}
            disabled={disabled}
            step="any"
            onChange={(e) => onChange(e.target.value)}
            style={{ width: 140, padding: "4px 8px", fontSize: 13, border: "1px solid var(--border)", borderRadius: 4 }}
          />
        );
      case "TIME":
        return (
          <input
            type="time"
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            style={{ width: 120, padding: "4px 8px", fontSize: 13, border: "1px solid var(--border)", borderRadius: 4 }}
          />
        );
      default: // TEXT
        return (
          <input
            type={isPassword ? "password" : "text"}
            value={value ?? ""}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            style={{ width: 260, padding: "4px 8px", fontSize: 13, border: "1px solid var(--border)", borderRadius: 4 }}
          />
        );
    }
  })();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 0" }}>
      <div
        title={code}
        style={{ flex: "0 0 420px", fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}
      >
        {label}
      </div>
      <div style={{ flex: "0 0 auto" }}>{inputEl}</div>
    </div>
  );
}
