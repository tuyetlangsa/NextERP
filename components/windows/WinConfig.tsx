"use client";

import { useMemo, useState } from "react";
import { WinToolbar, TB } from "@/components/ui/WinToolbar";
import { StatusBar } from "@/components/ui/StatusBar";
import { LoadingBar, OfflineBar, ErrorBar } from "@/components/ui/ResourceBars";
import { ChromeIcons } from "@/components/desktop/icons";
import { configValuesApi, roundingConfigsApi } from "@/lib/api/configuration";
import { useResource } from "@/lib/http/useResource";
import { useConfigDirty } from "@/components/windows/config/useConfigDirty";
import { ConfigField } from "@/components/windows/config/ConfigField";
import { RoundingField } from "@/components/windows/config/RoundingField";
import { ConfigGroupAccordion } from "@/components/windows/config/ConfigGroupAccordion";
import { formatApiError } from "@/lib/http/formatError";
import type { ConfigGroup, ConfigValueItem } from "@/types/api/configuration";

const GROUP_ORDER: { key: ConfigGroup; label: string }[] = [
  { key: "RestaurantProfile", label: "Thông tin nhà hàng" },
  { key: "Reservation",       label: "Đặt bàn" },
  { key: "Kitchen",           label: "Bếp (KDS & ATC)" },
  { key: "CustomerDisplay",   label: "Màn hình khách & QR" },
  { key: "Printing",          label: "In ấn" },
  { key: "TableLock",         label: "Lock bàn" },
  { key: "Pagination",        label: "Phân trang" },
  { key: "Transfer",          label: "Chuyển bàn" },
  { key: "EInvoice",          label: "Hóa đơn điện tử" },
  { key: "Scheduling",        label: "Lịch làm việc" },
  { key: "Email",             label: "Email (SMTP)" },
  { key: "AiLockSuggestion",  label: "Gợi ý khoá món (AI)" },
];

export function WinConfig() {
  // ── Fetch data ──
  const cfg = useResource(() => configValuesApi.list(), { fallback: [] });
  const rnd = useResource(() => roundingConfigsApi.list(), { fallback: [] });

  // ── ConfigValue dirty state ──
  const cfgInitial = useMemo(() => {
    const m = new Map<string, string>();
    (cfg.data ?? []).forEach((r: ConfigValueItem) => m.set(r.code, r.value ?? ""));
    return m;
  }, [cfg.data]);

  const cfgDirty = useConfigDirty(cfgInitial);

  // ── RoundingConfig dirty state ──
  const rndInitial = useMemo(() => {
    const m = new Map<string, string>();
    (rnd.data ?? []).forEach((r) => m.set(r.keyCode, String(r.digits)));
    return m;
  }, [rnd.data]);

  const rndDirty = useConfigDirty(rndInitial);

  // ── Saving state ──
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Group configs by group ──
  const grouped = useMemo(() => {
    const map = new Map<ConfigGroup, ConfigValueItem[]>();
    (cfg.data ?? []).forEach((item) => {
      const arr = map.get(item.group) ?? [];
      arr.push(item);
      map.set(item.group, arr);
    });
    return map;
  }, [cfg.data]);

  // ── Save handler ──
  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const cfgChanges = cfgDirty.getChanges();
      if (cfgChanges.size > 0) {
        const res = await configValuesApi.batchUpdate({
          changes: Array.from(cfgChanges.entries()).map(([code, value]) => ({ code, value })),
        });
        if (!res.isSuccess) {
          setErrorMsg(formatApiError(res));
          setSaving(false);
          return;
        }
      }

      const rndChanges = rndDirty.getChanges();
      if (rndChanges.size > 0) {
        const res = await roundingConfigsApi.batchUpdate({
          changes: Array.from(rndChanges.entries()).map(([keyCode, digits]) => ({
            keyCode,
            digits: parseInt(digits, 10),
          })),
        });
        if (!res.isSuccess) {
          setErrorMsg(formatApiError(res));
          setSaving(false);
          return;
        }
      }

      cfgDirty.commit();
      rndDirty.commit();
      setSuccessMsg("Đã lưu cấu hình thành công.");
    } catch {
      setErrorMsg("Không thể kết nối máy chủ.");
    } finally {
      setSaving(false);
    }
  };

  const isDirty = cfgDirty.isDirty || rndDirty.isDirty;
  const totalCount = (cfg.data?.length ?? 0) + (rnd.data?.length ?? 0);

  // ── Loading / Offline / Error ──
  if (cfg.loading || rnd.loading) return <LoadingBar text="Đang tải cấu hình..." />;
  if (cfg.isOffline || rnd.isOffline) return <OfflineBar onRetry={() => { cfg.reload(); rnd.reload(); }} />;
  if (cfg.error || rnd.error) return <ErrorBar text={cfg.error ?? rnd.error ?? ""} onRetry={() => { cfg.reload(); rnd.reload(); }} />;

  return (
    <>
      <WinToolbar
        left={
          <>
            <TB icon={ChromeIcons.Save} kind="primary" disabled={!isDirty || saving} onClick={handleSave}>
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </TB>
            <div className="tb-divider" />
            <TB icon={ChromeIcons.Refresh} onClick={() => { cfg.reload(); rnd.reload(); }}>Làm mới</TB>
            {isDirty && (
              <span style={{ fontSize: 12, color: "var(--warning)", marginLeft: 8 }}>● Chưa lưu</span>
            )}
          </>
        }
      />

      <div className="win-body" style={{ flex: 1, overflow: "auto", padding: "0" }}>
        {GROUP_ORDER.map((g) => {
          const items = grouped.get(g.key) ?? [];
          if (items.length === 0) return null;
          const groupHasDirty = items.some((item) => cfgDirty.dirtyKeys.has(item.code));
          return (
            <ConfigGroupAccordion
              key={g.key}
              title={g.label}
              count={items.length}
              hasDirty={groupHasDirty}
            >
              {items.map((item) => (
                <ConfigField
                  key={item.code}
                  code={item.code}
                  label={item.code}
                  description={item.description}
                  valueType={item.valueType}
                  value={cfgDirty.current.get(item.code) ?? ""}
                  disabled={false}
                  onChange={(v) => cfgDirty.setValue(item.code, v)}
                />
              ))}
            </ConfigGroupAccordion>
          );
        })}

        {(rnd.data?.length ?? 0) > 0 && (
          <ConfigGroupAccordion
            title="Làm tròn (RoundingConfig)"
            count={rnd.data!.length}
            hasDirty={rndDirty.dirtyKeys.size > 0}
          >
            {rnd.data!.map((item) => (
              <RoundingField
                key={item.keyCode}
                keyCode={item.keyCode}
                digits={parseInt(rndDirty.current.get(item.keyCode) ?? "0", 10)}
                disabled={false}
                onChange={(d) => rndDirty.setValue(item.keyCode, String(d))}
              />
            ))}
          </ConfigGroupAccordion>
        )}
      </div>

      <StatusBar
        left={
          <>
            {successMsg && <span style={{ color: "var(--success)" }}>{successMsg}</span>}
            {errorMsg && <span style={{ color: "var(--error)" }}>{errorMsg}</span>}
            {!successMsg && !errorMsg && <span>{totalCount} cấu hình</span>}
          </>
        }
      />
    </>
  );
}
