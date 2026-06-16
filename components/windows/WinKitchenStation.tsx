"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ColumnDirective,
  ColumnsDirective,
  Filter,
  GridComponent,
  Inject,
  Page,
  Sort,
  type SortSettingsModel,
} from "@syncfusion/ej2-react-grids";
import { ensureSyncfusionLicense } from "@/lib/syncfusion-license";
import { WinToolbar, TB } from "@/components/ui/WinToolbar";
import { DetailPanel, Field } from "@/components/ui/DetailPanel";
import { StatusBar } from "@/components/ui/StatusBar";
import { LoadingBar, OfflineBar, ErrorBar } from "@/components/ui/ResourceBars";
import { ChromeIcons } from "@/components/desktop/icons";
import { kitchenStationsApi } from "@/lib/api/masterData";
import { useResource } from "@/lib/http/useResource";
import { formatApiError } from "@/lib/http/formatError";
import { mockKitchenStations } from "@/data/mock";
import type { KitchenStation, KitchenStationUpsert } from "@/types/api/masterData";

ensureSyncfusionLicense();

type ActiveFilter = "ALL" | "ACTIVE" | "INACTIVE";
type Draft = Partial<KitchenStation> & {
  code: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
};

function validateKitchenStation(draft: Draft): string | null {
  const code = draft.code.trim();
  if (!code) return "Mã bếp con là bắt buộc.";
  if (code.length > 20) return "Mã tối đa 20 ký tự.";
  const name = draft.name.trim();
  if (!name) return "Tên bếp con là bắt buộc.";
  if (name.length > 50) return "Tên tối đa 50 ký tự.";
  const desc = draft.description?.trim();
  if (desc && desc.length > 200) return "Mô tả tối đa 200 ký tự.";
  return null;
}

export function WinKitchenStation() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("ALL");
  const listQuery = useMemo(() => {
    const q: { search?: string; isActive?: boolean } = {};
    if (search.trim()) q.search = search.trim();
    if (activeFilter === "ACTIVE") q.isActive = true;
    if (activeFilter === "INACTIVE") q.isActive = false;
    return q;
  }, [search, activeFilter]);

  const stations = useResource(() => kitchenStationsApi.list(listQuery), {
    fallback: mockKitchenStations,
    deps: [listQuery.search, listQuery.isActive],
  });

  const list = stations.data ?? [];
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sel = list.find(s => s.id === selectedId) ?? null;

  const initSelectedRef = useRef(false);
  useEffect(() => {
    if (!initSelectedRef.current && list.length > 0) {
      initSelectedRef.current = true;
      setSelectedId(list[0].id);
      setDraft({ ...list[0] });
    }
  }, [list]);

  const sortSettings: SortSettingsModel = {
    columns: [{ field: "displayOrder", direction: "Ascending" }],
  };

  const handleRowSelected = (args: { data: KitchenStation | KitchenStation[] }) => {
    const row = Array.isArray(args.data) ? args.data[0] : args.data;
    if (row?.id === undefined || row.id === selectedId) return;
    setSelectedId(row.id);
    setDraft({ ...row });
    setErrorMsg(null);
  };

  const handleCreate = () => {
    setSelectedId(null);
    setDraft({
      code: "",
      name: "",
      description: null,
      displayOrder: list.length > 0 ? Math.max(...list.map(s => s.displayOrder)) + 1 : 1,
      isActive: true,
    });
    setErrorMsg(null);
  };

  const handleSave = async () => {
    if (!draft) return;
    const validation = validateKitchenStation(draft);
    if (validation) {
      setErrorMsg(validation);
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    const body: KitchenStationUpsert = {
      code: draft.code.trim(),
      name: draft.name.trim(),
      description: draft.description?.trim() || null,
      displayOrder: Number(draft.displayOrder ?? 0),
      isActive: draft.isActive,
    };
    const res = sel
      ? await kitchenStationsApi.update(sel.id, body)
      : await kitchenStationsApi.create(body);

    if (res.isSuccess) {
      await stations.reload();
      setSelectedId(res.data.id);
      setDraft({ ...res.data });
    } else {
      setErrorMsg(formatApiError(res));
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!sel) return;
    if (!window.confirm(`Xoá bếp con "${sel.code} — ${sel.name}"?`)) return;
    setSaving(true);
    setErrorMsg(null);
    const res = await kitchenStationsApi.remove(sel.id);
    if (res.isSuccess) {
      initSelectedRef.current = false;
      await stations.reload();
      setSelectedId(null);
      setDraft(null);
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
            <TB icon={ChromeIcons.Plus} onClick={handleCreate}>Tạo mới</TB>
            <TB icon={ChromeIcons.Save} onClick={handleSave} kind="primary" disabled={!draft || saving}>
              Lưu
            </TB>
            <TB icon={ChromeIcons.Trash} onClick={handleDelete} kind="danger" disabled={!sel || saving}>
              Xoá
            </TB>
            <div className="tb-divider" />
            <TB icon={ChromeIcons.Refresh} onClick={() => stations.reload()}>Làm mới</TB>
          </>
        }
        right={<TB icon={ChromeIcons.Help}>Trợ giúp</TB>}
      />

      <div className="win-body">
        <DetailPanel
          title="Thông tin bếp con"
          collapsed={collapsed}
          onToggle={() => setCollapsed(c => !c)}
        >
          {draft ? (
            <>
              {sel && <Field label="ID"><input value={String(sel.id)} disabled /></Field>}
              <Field label="Code" required>
                <input
                  value={draft.code}
                  onChange={e => setDraft({ ...draft, code: e.target.value })}
                  placeholder="vd: BAR, BEP_CHINH"
                />
              </Field>
              <Field label="Tên hiển thị" required>
                <input
                  value={draft.name}
                  onChange={e => setDraft({ ...draft, name: e.target.value })}
                  placeholder="vd: Bar & Pha chế"
                />
              </Field>
              <Field label="Mô tả">
                <textarea
                  rows={3}
                  value={draft.description ?? ""}
                  onChange={e => setDraft({ ...draft, description: e.target.value || null })}
                />
              </Field>
              <Field label="Thứ tự hiển thị">
                <input
                  type="number"
                  value={draft.displayOrder}
                  onChange={e => setDraft({ ...draft, displayOrder: Number(e.target.value) })}
                />
              </Field>
              <Field label="Kích hoạt">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={e => setDraft({ ...draft, isActive: e.target.checked })}
                />
              </Field>
              {errorMsg && (
                <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 8, whiteSpace: "pre-wrap" }}>
                  {errorMsg}
                </div>
              )}
              <div style={{ marginTop: 16, padding: 10, background: "#f4f4f5", borderRadius: 4, fontSize: 11, color: "var(--fg-muted)" }}>
                <div>• Code duy nhất, tối đa 20 ký tự.</div>
                <div>• Không xoá được nếu đang có món tham chiếu — hãy tắt Kích hoạt.</div>
              </div>
            </>
          ) : (
            <div style={{ color: "var(--fg-muted)", fontSize: 12, padding: 12 }}>
              Chọn một bếp con từ danh sách, hoặc bấm Tạo mới.
            </div>
          )}
        </DetailPanel>

        <div className="data-list">
          <div className="grid-filterbar">
            <strong style={{ fontSize: 13 }}>Danh sách bếp con</strong>
            <div className="tb-divider" />
            <div className="filter-group">
              <label>Tìm:</label>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Mã / tên..."
              />
            </div>
            <div className="filter-group">
              <label>Kích hoạt:</label>
              <select
                value={activeFilter}
                onChange={e => setActiveFilter(e.target.value as ActiveFilter)}
              >
                <option value="ALL">Tất cả</option>
                <option value="ACTIVE">Đang dùng</option>
                <option value="INACTIVE">Tạm tắt</option>
              </select>
            </div>
          </div>
          {stations.loading && <LoadingBar text="Đang tải bếp con..." />}
          {stations.isOffline && <OfflineBar onRetry={() => stations.reload()} />}
          {stations.isApiError && <ErrorBar text={stations.error ?? ""} onRetry={() => stations.reload()} />}
          <GridComponent
            dataSource={list}
            allowSorting
            allowPaging
            allowFiltering
            filterSettings={{ type: "Menu" }}
            pageSettings={{ pageSize: 20 }}
            sortSettings={sortSettings}
            rowSelected={handleRowSelected}
            selectedRowIndex={selectedId !== null ? list.findIndex(s => s.id === selectedId) : -1}
            height="100%"
          >
            <ColumnsDirective>
              <ColumnDirective field="code" headerText="Code" width="120" />
              <ColumnDirective field="name" headerText="Tên" width="200" />
              <ColumnDirective field="displayOrder" headerText="Thứ tự" width="90" textAlign="Right" />
              <ColumnDirective field="isActive" headerText="Kích hoạt" width="110" displayAsCheckBox />
            </ColumnsDirective>
            <Inject services={[Page, Sort, Filter]} />
          </GridComponent>
        </div>
      </div>

      <StatusBar
        left={
          <>
            <span>{list.length} bếp con</span>
            <span>·</span>
            <span>{list.filter(s => s.isActive).length} đang hoạt động</span>
            {stations.isOffline && <><span>·</span><span style={{ color: "var(--warning)" }}>offline (mock)</span></>}
          </>
        }
        right={<span>Master data — gán bếp cho món hàng</span>}
      />
    </>
  );
}
