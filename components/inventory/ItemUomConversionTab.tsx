"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ColumnDirective,
  ColumnsDirective,
  GridComponent,
  Inject,
  Page,
  Sort,
} from "@syncfusion/ej2-react-grids";
import { Field } from "@/components/ui/DetailPanel";
import { ChromeIcons } from "@/components/desktop/icons";
import { itemUomConversionsApi } from "@/lib/api/inventory";
import { useResource } from "@/lib/http/useResource";
import { formatApiError } from "@/lib/http/formatError";
import { mockItemUomConversions } from "@/data/mock";
import type { ItemUomConversion } from "@/types/api/inventory";
import type { Uom } from "@/types/api/menu";

type Draft = {
  id?: number;
  uomId: number;
  factorToBase: number;
  isActive: boolean;
};

interface Props {
  itemId: number;
  baseUomId: number;
  uomList: Uom[];
}

/** Strip trailing zeros so 12.000000 reads as "12", 0.001 stays "0.001". */
function formatQty(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  return parseFloat(n.toFixed(8)).toString();
}

function formatConversion(uomCode: string, factorToBase: number, baseUomCode: string): string {
  return `1 ${uomCode} = ${formatQty(factorToBase)} ${baseUomCode}`;
}

export function ItemUomConversionTab({ itemId, baseUomId, uomList }: Props) {
  // NOTE: the list endpoint also accepts `?isActive=`, but we intentionally
  // fetch the FULL list so `availableUoms` can dedupe against inactive rows too
  // (hiding an inactive conversion would let its UOM reappear in the create
  // dropdown and trigger a server `DuplicateUom`). The Active column conveys
  // status instead.
  const conversions = useResource(
    () => itemUomConversionsApi.list(itemId),
    { fallback: mockItemUomConversions.filter(c => c.itemId === itemId), deps: [itemId] }
  );

  const list = conversions.data ?? [];
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const initRef = useRef(false);

  const sel = list.find(c => c.id === selectedId) ?? null;

  const availableUoms = useMemo(() => {
    if (sel) return uomList.filter(u => u.id === sel.uomId);
    return uomList.filter(
      u => u.isActive && u.id !== baseUomId && !list.some(c => c.uomId === u.id)
    );
  }, [uomList, baseUomId, list, sel]);

  useEffect(() => {
    initRef.current = false;
    setSelectedId(null);
    setDraft(null);
    setErrorMsg(null);
  }, [itemId]);

  useEffect(() => {
    if (!initRef.current && list.length > 0) {
      initRef.current = true;
      const first = list[0];
      setSelectedId(first.id);
      setDraft({
        id: first.id,
        uomId: first.uomId,
        factorToBase: first.factorToBase,
        isActive: first.isActive,
      });
    }
  }, [list]);

  const handleRowSelected = (args: { data: ItemUomConversion | ItemUomConversion[] }) => {
    const row = Array.isArray(args.data) ? args.data[0] : args.data;
    if (!row?.id || row.id === selectedId) return;
    setSelectedId(row.id);
    setDraft({
      id: row.id,
      uomId: row.uomId,
      factorToBase: row.factorToBase,
      isActive: row.isActive,
    });
    setErrorMsg(null);
  };

  const handleCreate = () => {
    const firstUom = availableUoms[0];
    if (!firstUom) {
      setErrorMsg("Không còn đơn vị tính khả dụng để thêm.");
      return;
    }
    setSelectedId(null);
    setDraft({ uomId: firstUom.id, factorToBase: 1, isActive: true });
    setErrorMsg(null);
  };

  const handleSave = async () => {
    if (!draft) return;
    if (draft.factorToBase <= 0) {
      setErrorMsg("Hệ số quy đổi phải lớn hơn 0.");
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    const res = sel
      ? await itemUomConversionsApi.update(itemId, sel.id, {
          factorToBase: draft.factorToBase,
          isActive: draft.isActive,
        })
      : await itemUomConversionsApi.create(itemId, {
          uomId: draft.uomId,
          factorToBase: draft.factorToBase,
          isActive: draft.isActive,
        });

    if (res.isSuccess) {
      await conversions.reload();
      setSelectedId(res.data.id);
      setDraft({
        id: res.data.id,
        uomId: res.data.uomId,
        factorToBase: res.data.factorToBase,
        isActive: res.data.isActive,
      });
    } else {
      setErrorMsg(formatApiError(res));
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!sel) return;
    const uomLabel = `${sel.uomCode} — ${sel.uomName}`;
    if (!window.confirm(`Xoá quy đổi "${uomLabel}"?`)) return;
    setSaving(true);
    setErrorMsg(null);
    const res = await itemUomConversionsApi.remove(itemId, sel.id);
    if (res.isSuccess) {
      initRef.current = false;
      await conversions.reload();
      setSelectedId(null);
      setDraft(null);
    } else {
      setErrorMsg(formatApiError(res));
    }
    setSaving(false);
  };

  const baseUom = uomList.find(u => u.id === baseUomId);
  const baseUomCode = baseUom?.code ?? "ĐVT gốc";

  const draftUom = useMemo(() => {
    if (sel) return { code: sel.uomCode, name: sel.uomName };
    const u = uomList.find(x => x.id === draft?.uomId);
    return u ? { code: u.code, name: u.name } : null;
  }, [sel, draft?.uomId, uomList]);

  const listDisplay = useMemo(
    () =>
      list.map(c => ({
        ...c,
        conversionDisplay: formatConversion(c.uomCode, c.factorToBase, baseUomCode),
      })),
    [list, baseUomCode]
  );

  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontSize: 11, color: "var(--fg-muted)", marginBottom: 8 }}>
        Nhập quy đổi theo dạng: <strong>1 [đơn vị này] = ? {baseUomCode}</strong>.
        ĐVT gốc ({baseUom ? baseUom.name : "—"}) không cần thêm dòng quy đổi.
      </div>

      {draft && (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 4,
            padding: 12,
            marginBottom: 12,
            background: "#fafafa",
          }}
        >
          <Field label="Đơn vị tính" required>
            {sel ? (
              <input
                value={`${sel.uomCode} — ${sel.uomName}`}
                disabled
              />
            ) : (
              <select
                value={draft.uomId}
                onChange={e => setDraft({ ...draft, uomId: Number(e.target.value) })}
              >
                {availableUoms.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.code} — {u.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Quy đổi ra ĐVT gốc" required>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, whiteSpace: "nowrap" }}>
                1 {draftUom?.code ?? "…"}
              </span>
              <span>=</span>
              <input
                type="number"
                min={0}
                step="any"
                value={draft.factorToBase}
                onChange={e => setDraft({ ...draft, factorToBase: Number(e.target.value) })}
                style={{ width: 100 }}
              />
              <span style={{ fontSize: 13, whiteSpace: "nowrap" }}>{baseUomCode}</span>
            </div>
            {draftUom && draft.factorToBase > 0 && (
              <div style={{ marginTop: 6, fontSize: 12, color: "var(--accent)", fontWeight: 500 }}>
                → {formatConversion(draftUom.code, draft.factorToBase, baseUomCode)}
              </div>
            )}
          </Field>
          <div className="field-checkbox">
            <label className="field-checkbox-label">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={e => setDraft({ ...draft, isActive: e.target.checked })}
              />
              Kích hoạt
            </label>
          </div>
          {errorMsg && (
            <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 8, whiteSpace: "pre-wrap" }}>
              {errorMsg}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving}
              style={{ padding: "6px 12px", fontSize: 12, border: "1px solid var(--border-strong)", borderRadius: 4, background: "#fff" }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <ChromeIcons.Plus /> Thêm
              </span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{ padding: "6px 12px", fontSize: 12, border: 0, borderRadius: 4, background: "var(--accent)", color: "#fff" }}
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={!sel || saving}
              style={{ padding: "6px 12px", fontSize: 12, border: 0, borderRadius: 4, background: "var(--danger)", color: "#fff" }}
            >
              Xoá
            </button>
          </div>
        </div>
      )}

      {!draft && (
        <button
          type="button"
          onClick={handleCreate}
          style={{ marginBottom: 12, padding: "6px 12px", fontSize: 12, border: "1px solid var(--border-strong)", borderRadius: 4, background: "#fff" }}
        >
          Thêm quy đổi đầu tiên
        </button>
      )}

      <GridComponent
        dataSource={listDisplay}
        allowSorting
        allowPaging
        pageSettings={{ pageSize: 10 }}
        rowSelected={handleRowSelected}
        selectedRowIndex={selectedId !== null ? list.findIndex(c => c.id === selectedId) : -1}
        height={220}
      >
        <ColumnsDirective>
          <ColumnDirective field="conversionDisplay" headerText="Quy đổi" width="220" />
          <ColumnDirective field="uomName" headerText="Tên ĐVT" width="120" />
          <ColumnDirective field="isActive" headerText="Kích hoạt" width="90" displayAsCheckBox />
        </ColumnsDirective>
        <Inject services={[Page, Sort]} />
      </GridComponent>
    </div>
  );
}
