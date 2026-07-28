"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ColumnDirective,
  ColumnsDirective,
  Filter,
  Group,
  GridComponent,
  Inject,
  Page,
  Sort,
  type GroupSettingsModel,
} from "@syncfusion/ej2-react-grids";
import { ensureSyncfusionLicense } from "@/lib/syncfusion-license";
import { WinToolbar, TB } from "@/components/ui/WinToolbar";
import { DetailPanel, Field } from "@/components/ui/DetailPanel";
import { StatusBar } from "@/components/ui/StatusBar";
import { LoadingBar, OfflineBar, ErrorBar } from "@/components/ui/ResourceBars";
import { ChromeIcons } from "@/components/desktop/icons";
import { areaServiceChargesApi } from "@/lib/api/restaurant";
import type { ServiceChargeUpdate } from "@/lib/api/restaurant";
import { useResource } from "@/lib/http/useResource";
import { formatApiError } from "@/lib/http/formatError";
import type { AreaServiceCharge } from "@/types/api/restaurant";

ensureSyncfusionLicense();

interface Draft {
  serviceChargePercent: number;
  serviceChargeVatPercent: number;
}

function validate(draft: Draft): string | null {
  if (!Number.isFinite(draft.serviceChargePercent) || draft.serviceChargePercent < 0 || draft.serviceChargePercent > 100)
    return "Phí phục vụ (%) phải trong khoảng 0–100.";
  if (!Number.isFinite(draft.serviceChargeVatPercent) || draft.serviceChargeVatPercent < 0 || draft.serviceChargeVatPercent > 100)
    return "VAT của phí phục vụ (%) phải trong khoảng 0–100.";
  return null;
}

export function WinServiceCharge() {
  const rows = useResource(() => areaServiceChargesApi.list(), { deps: [] });
  const list = useMemo(() => rows.data ?? [], [rows.data]);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sel = list.find(a => a.areaId === selectedId) ?? null;

  const initSelectedRef = useRef(false);
  useEffect(() => {
    if (!initSelectedRef.current && list.length > 0) {
      initSelectedRef.current = true;
      const first = list[0];
      setSelectedId(first.areaId);
      setDraft({
        serviceChargePercent: first.serviceChargePercent,
        serviceChargeVatPercent: first.serviceChargeVatPercent,
      });
    }
  }, [list]);

  const groupSettings: GroupSettingsModel = {
    columns: ["counterName"],
    showDropArea: false,
  };

  const handleRowSelected = (args: { data: AreaServiceCharge | AreaServiceCharge[] }) => {
    const row = Array.isArray(args.data) ? args.data[0] : args.data;
    if (row?.areaId === undefined || row.areaId === selectedId) return;
    setSelectedId(row.areaId);
    setDraft({
      serviceChargePercent: row.serviceChargePercent,
      serviceChargeVatPercent: row.serviceChargeVatPercent,
    });
    setErrorMsg(null);
  };

  const handleSave = async () => {
    if (!draft || !sel) return;
    const validation = validate(draft);
    if (validation) {
      setErrorMsg(validation);
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    const body: ServiceChargeUpdate = {
      serviceChargePercent: draft.serviceChargePercent,
      serviceChargeVatPercent: draft.serviceChargeVatPercent,
    };
    const res = await areaServiceChargesApi.update(sel.areaId, body);
    if (res.isSuccess) {
      await rows.reload();
    } else {
      setErrorMsg(formatApiError(res));
    }
    setSaving(false);
  };

  return (
    <>
      <WinToolbar
        left={
          <>
            <TB icon={ChromeIcons.Save} onClick={handleSave} kind="primary" disabled={!sel || saving}>
              Lưu
            </TB>
            <div className="tb-divider" />
            <TB icon={ChromeIcons.Refresh} onClick={() => rows.reload()}>Làm mới</TB>
          </>
        }
        right={<TB icon={ChromeIcons.Help}>Trợ giúp</TB>}
      />

      <div className="win-body">
        <DetailPanel
          title="Phí phục vụ theo khu"
          collapsed={collapsed}
          onToggle={() => setCollapsed(c => !c)}
        >
          {draft && sel ? (
            <>
              <Field label="Quầy"><input value={sel.counterName} disabled /></Field>
              <Field label="Khu"><input value={sel.areaName} disabled /></Field>
              <Field label="Phí phục vụ (%)" required>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={draft.serviceChargePercent}
                  onChange={e => setDraft({ ...draft, serviceChargePercent: Number(e.target.value) })}
                />
              </Field>
              <Field label="VAT của phí phục vụ (%)" required>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={draft.serviceChargeVatPercent}
                  onChange={e => setDraft({ ...draft, serviceChargeVatPercent: Number(e.target.value) })}
                />
              </Field>
              {errorMsg && (
                <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 8, whiteSpace: "pre-wrap" }}>
                  {errorMsg}
                </div>
              )}
              <div style={{ marginTop: 16, padding: 10, background: "#f4f4f5", borderRadius: 4, fontSize: 11, color: "var(--fg-muted)" }}>
                <div>• Phí phục vụ được tính trên tổng dòng (trước giảm giá); VAT tính riêng trên số tiền phí.</div>
                <div>• Chỉ áp cho phiếu mở MỚI — phiếu đang mở giữ nguyên phí đã chốt lúc mở.</div>
                <div>• Đặt 0 để tắt phí phục vụ cho khu.</div>
              </div>
            </>
          ) : (
            <div style={{ color: "var(--fg-muted)", fontSize: 12, padding: 12 }}>
              Chọn một khu từ danh sách để chỉnh phí phục vụ.
            </div>
          )}
        </DetailPanel>

        <div className="data-list">
          <div className="grid-filterbar">
            <strong style={{ fontSize: 13 }}>Phí phục vụ theo khu</strong>
          </div>
          {rows.loading && <LoadingBar text="Đang tải khu..." />}
          {rows.isOffline && <OfflineBar onRetry={() => rows.reload()} />}
          {rows.isApiError && <ErrorBar text={rows.error ?? ""} onRetry={() => rows.reload()} />}
          <GridComponent
            dataSource={list}
            allowSorting
            allowPaging
            allowGrouping
            groupSettings={groupSettings}
            pageSettings={{ pageSize: 20 }}
            rowSelected={handleRowSelected}
            selectedRowIndex={selectedId !== null ? list.findIndex(a => a.areaId === selectedId) : -1}
            height="100%"
          >
            <ColumnsDirective>
              <ColumnDirective field="counterName" headerText="Quầy" width="150" />
              <ColumnDirective field="areaName" headerText="Khu" width="180" />
              <ColumnDirective field="serviceChargePercent" headerText="Phí PV (%)" width="120" textAlign="Right" format="N2" />
              <ColumnDirective field="serviceChargeVatPercent" headerText="VAT phí (%)" width="120" textAlign="Right" format="N2" />
              <ColumnDirective field="isActive" headerText="Kích hoạt" width="110" displayAsCheckBox />
            </ColumnsDirective>
            <Inject services={[Page, Sort, Filter, Group]} />
          </GridComponent>
        </div>
      </div>

      <StatusBar
        left={
          <>
            <span>{list.length} khu</span>
            <span>·</span>
            <span>{list.filter(a => a.serviceChargePercent > 0).length} khu có phí phục vụ</span>
            {rows.isOffline && <><span>·</span><span style={{ color: "var(--warning)" }}>offline</span></>}
          </>
        }
        right={<span>Master data — phí phục vụ snapshot vào phiếu lúc mở</span>}
      />
    </>
  );
}
