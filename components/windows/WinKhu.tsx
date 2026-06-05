"use client";

import { useMemo, useState } from "react";
import {
  ColumnDirective,
  ColumnsDirective,
  GridComponent,
  Inject,
  Page,
  Sort,
  Filter,
  type SortSettingsModel,
} from "@syncfusion/ej2-react-grids";
import { ensureSyncfusionLicense } from "@/lib/syncfusion-license";
import { WinToolbar, TB } from "@/components/ui/WinToolbar";
import { DetailPanel, Field } from "@/components/ui/DetailPanel";
import { ChromeIcons } from "@/components/desktop/icons";
import { mockAreas, mockCounters } from "@/data/mock";
import type { Area } from "@/types/domain";

ensureSyncfusionLicense();

export function WinKhu() {
  const [list, setList] = useState<Area[]>(mockAreas);
  const [selId, setSelId] = useState<string>(mockAreas[0].id);
  const [collapsed, setCollapsed] = useState(false);
  const [draft, setDraft] = useState<Area | null>(mockAreas[0]);

  const sel = list.find(a => a.id === selId);

  const counterMap = useMemo(
    () => Object.fromEntries(mockCounters.map(c => [c.id, c])),
    []
  );

  const dataView = useMemo(
    () => list.map(a => ({
      ...a,
      quayName: counterMap[a.quay]?.ten ?? "",
    })),
    [list, counterMap]
  );

  const sortSettings: SortSettingsModel = { columns: [{ field: "thu_tu", direction: "Ascending" }] };

  const onRowSelected = (args: { data: Area | Area[] }) => {
    const row = Array.isArray(args.data) ? args.data[0] : args.data;
    if (row?.id) {
      setSelId(row.id);
      setDraft(list.find(a => a.id === row.id) ?? null);
    }
  };

  const save = () => {
    if (!draft) return;
    setList(list.map(a => (a.id === draft.id ? draft : a)));
  };

  const create = () => {
    const id = "KV" + String(list.length + 1).padStart(2, "0");
    const n: Area = {
      id,
      quay: "Q01",
      ten: "Khu mới",
      mo_ta: "",
      khu_cha: null,
      co_so_do: false,
      so_so_do: 0,
      thu_tu: list.length + 1,
      quy_mo: 0,
      kich_hoat: true,
      nhom_menu: [],
    };
    setList([...list, n]);
    setSelId(id);
    setDraft(n);
  };

  const del = () => {
    if (!sel) return;
    setList(list.filter(a => a.id !== sel.id));
    setDraft(null);
  };

  return (
    <>
      <WinToolbar
        left={
          <>
            <TB icon={ChromeIcons.Plus} onClick={create}>Tạo mới</TB>
            <TB icon={ChromeIcons.Save} onClick={save} kind="primary">Lưu</TB>
            <TB icon={ChromeIcons.Trash} onClick={del} kind="danger">Xoá</TB>
            <div className="tb-divider" />
            <TB icon={ChromeIcons.Refresh}>Làm mới</TB>
            <TB icon={ChromeIcons.Export}>Xuất dữ liệu</TB>
          </>
        }
        right={<TB icon={ChromeIcons.Help}>Trợ giúp</TB>}
      />

      <div className="win-body">
        <DetailPanel
          title="Thông tin chi tiết"
          collapsed={collapsed}
          onToggle={() => setCollapsed(c => !c)}
        >
          {draft && (
            <>
              <Field label="Tên Khu" required>
                <input value={draft.ten} onChange={e => setDraft({ ...draft, ten: e.target.value })} />
              </Field>
              <Field label="Tên (EN)">
                <input value={draft.ten1 ?? ""} onChange={e => setDraft({ ...draft, ten1: e.target.value })} />
              </Field>
              <Field label="Mô tả">
                <textarea
                  rows={3}
                  value={draft.mo_ta ?? ""}
                  onChange={e => setDraft({ ...draft, mo_ta: e.target.value })}
                />
              </Field>
              <Field label="Quầy" required>
                <select value={draft.quay} onChange={e => setDraft({ ...draft, quay: e.target.value })}>
                  {mockCounters.map(c => <option key={c.id} value={c.id}>{c.ten}</option>)}
                </select>
              </Field>
              <Field label="Quy mô (số khách)">
                <input
                  type="number"
                  min={0}
                  value={draft.quy_mo}
                  onChange={e => setDraft({ ...draft, quy_mo: Number(e.target.value) })}
                />
              </Field>
              <Field label="Thứ tự hiển thị">
                <input
                  type="number"
                  min={0}
                  value={draft.thu_tu}
                  onChange={e => setDraft({ ...draft, thu_tu: Number(e.target.value) })}
                />
              </Field>
              <Field label="Kích hoạt">
                <input
                  type="checkbox"
                  checked={draft.kich_hoat}
                  onChange={e => setDraft({ ...draft, kich_hoat: e.target.checked })}
                />
              </Field>
            </>
          )}
        </DetailPanel>

        <div className="data-list">
          <GridComponent
            dataSource={dataView}
            allowSorting
            allowPaging
            allowFiltering
            pageSettings={{ pageSize: 20 }}
            sortSettings={sortSettings}
            rowSelected={onRowSelected}
            selectedRowIndex={list.findIndex(a => a.id === selId)}
            height="100%"
          >
            <ColumnsDirective>
              <ColumnDirective field="id" headerText="Mã" width="80" />
              <ColumnDirective field="ten" headerText="Tên" width="160" />
              <ColumnDirective field="ten1" headerText="Tên (EN)" width="130" />
              <ColumnDirective field="mo_ta" headerText="Mô tả" width="200" />
              <ColumnDirective field="quayName" headerText="Quầy" width="140" />
              <ColumnDirective field="quy_mo" headerText="Quy mô" width="90" textAlign="Right" />
              <ColumnDirective field="thu_tu" headerText="Thứ tự" width="80" textAlign="Right" />
              <ColumnDirective field="kich_hoat" headerText="Kích hoạt" width="100" displayAsCheckBox />
            </ColumnsDirective>
            <Inject services={[Page, Sort, Filter]} />
          </GridComponent>
        </div>
      </div>
    </>
  );
}
