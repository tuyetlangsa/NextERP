import type { ConfigValueType } from "@/types/api/configuration";

interface ConfigFieldProps {
  code: string;
  label: string;
  description: string | null;
  valueType: ConfigValueType;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}

/** Human-readable label from code. Falls back to code itself. */
export function configLabel(code: string): string {
  const map: Record<string, string> = {
    "restaurant.name": "Tên nhà hàng",
    "restaurant.address": "Địa chỉ",
    "restaurant.tax_code": "Mã số thuế",
    "restaurant.phone": "Số điện thoại",
    "restaurant.vat_default_percent": "VAT mặc định (%)",
    "restaurant.service_charge_default_percent": "Service charge mặc định (%)",
    "reservation.pre_buffer_minutes": "Pre-buffer (phút)",
    "reservation.grace_period_minutes": "Grace period (phút)",
    "reservation.min_advance_minutes": "Đặt trước tối thiểu (phút)",
    "kitchen.late_threshold_minutes": "Ngưỡng trễ (phút)",
    "kitchen.atc.enabled": "Bật ATC",
    "kitchen.atc.k": "ATC K (lookahead)",
    "kitchen.atc.top_n": "ATC số gợi ý tối đa",
    "kitchen.atc.estimator.min_samples": "Mẫu tối thiểu",
    "kitchen.atc.estimator.window_days": "Cửa sổ lịch sử (ngày)",
    "kitchen.atc.estimator.outlier_cap_minutes": "Ngưỡng outlier (phút)",
    "kitchen.atc.estimator.refresh_minutes": "TTL cache (phút)",
    "kitchen.atc.near_due_minutes": "NEAR_DUE ngưỡng (phút)",
    "kitchen.atc.quick_minutes": "QUICK ngưỡng (phút)",
    "customer_display.idle_media_url": "URL media idle",
    "payment.qr_ttl_seconds": "QR TTL (giây)",
    "customer_display.paid_splash_seconds": "Splash thanh toán (giây)",
    "device.online_threshold_seconds": "Ngưỡng online (giây)",
    "printer.copies_default": "Số bản in mặc định",
    "print.auto_close_after_payment": "Auto close sau thanh toán",
    "table.lock_ttl_seconds": "Lock TTL (giây)",
    "pagination.max_page_size": "Trang tối đa",
    "transfer.use_target_area_service_charge": "Dùng SC khu đích",
    "einvoice.enabled": "Bật hóa đơn điện tử",
    "einvoice.minvoice_base_url": "MInvoice URL",
    "einvoice.username": "Tài khoản MInvoice",
    "einvoice.password": "Mật khẩu MInvoice",
    "einvoice.ma_dvcs": "Mã ĐVCN",
    "einvoice.invoice_series": "Ký hiệu hóa đơn",
    "einvoice.payment_method_name": "Hình thức TT",
    "einvoice.publish_delay_minutes": "Delay phát hành (phút)",
    "einvoice.max_retry": "Số lần retry",
    "einvoice.poll_interval_seconds": "Chu kỳ quét (giây)",
    "einvoice.taxlookup_quickmaster_url": "QuickMaster URL",
    "einvoice.taxlookup_api_key": "QuickMaster API key",
    "schedule.max_shifts_per_day": "Ca tối đa/ngày",
    "schedule.max_hours_per_week": "Giờ tối đa/tuần",
    "schedule.max_consecutive_work_days": "Ngày liên tiếp tối đa",
    "schedule.min_rest_hours_between_shifts": "Nghỉ tối thiểu (giờ)",
    "schedule.auto_generate_template_id": "Template auto-generate",
    "schedule.auto_generate_run_at": "Thời điểm auto tạo",
    "schedule.auto_publish_deadline": "Deadline auto publish",
    "schedule.published_edit_lead_time_hours": "Lead time sửa (giờ)",
    "schedule.swap_request_lead_time_hours": "Lead time swap (giờ)",
    "schedule.swap_escalation_lead_time_hours": "Lead time escalation (giờ)",
    "email.enabled": "Bật email",
    "email.smtp_host": "SMTP host",
    "email.smtp_port": "SMTP port",
    "email.smtp_username": "SMTP username",
    "email.smtp_password": "SMTP password",
    "email.enable_ssl": "Bật SSL",
    "email.from_address": "Địa chỉ gửi",
    "email.from_name": "Tên người gửi",
    "ai_lock_suggestion.enabled": "Bật gợi ý khoá món AI",
    "ai_lock_suggestion.check_interval_minutes": "Chu kỳ chạy (phút)",
    "ai_lock_suggestion.min_gain_amount": "Ngưỡng chênh lệch (VND)",
    "ai_lock_suggestion.supersede_change_percent": "Ngưỡng thay thế (%)",
    "ai_lock_suggestion.safety_ratio": "Van an toàn",
    "ai_lock_suggestion.last_run_at": "Lần chạy cuối",
  };
  return map[code] ?? code;
}

export function ConfigField({
  code,
  description,
  valueType,
  value,
  disabled,
  onChange,
}: ConfigFieldProps) {
  const label = configLabel(code);
  const isPassword = code.includes("password");

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
      <div style={{ flex: "0 0 220px", fontSize: 13, fontWeight: 500 }}>{label}</div>
      <div style={{ flex: "0 0 auto" }}>{inputEl}</div>
      {description && (
        <div style={{ flex: 1, fontSize: 11, color: "var(--fg-muted)", minWidth: 0 }}>{description}</div>
      )}
    </div>
  );
}
