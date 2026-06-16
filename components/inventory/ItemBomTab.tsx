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
import {
  bomLinesApi,
  bomMaterialsLookupApi,
  itemUomConversionsApi,
} from "@/lib/api/inventory";
import { useResource } from "@/lib/http/useResource";
import { formatApiError } from "@/lib/http/formatError";
import { mockBomLines } from "@/data/mock";
import type { BaseResponse } from "@/lib/http/types";
import type {
  BomLine,
  BomMaterialLookup,
  ItemUomConversion,
} from "@/types/api/inventory";

const EMPTY_CONVERSIONS: BaseResponse<ItemUomConversion[]> = {
  isSuccess: true,
  message: "",
  data: [],
  type: null,
  title: null,
  status: null,
  detail: null,
  extensions: null,
  statusCode: 200,
};

type Draft = {
  id?: number;
  materialItemId: number;
  quantity: number;
  uomId: number;
  isActive: boolean;
};

type UomOption = { uomId: number; label: string };

interface Props {
  itemId: number;
}

export function ItemBomTab({ itemId }: Props) {
  const bomLines = useResource(
    () => bomLinesApi.list(itemId),
    { fallback: mockBomLines.filter(b => b.sellableItemId === itemId), deps: [itemId] }
  );

  // Spec §4: material picker uses the dedicated lookup which already returns only
  // IsStockable=true && HasRecipe=false items, each carrying its base Uom.
  const materials = useResource(() => bomMaterialsLookupApi.list(), { deps: [] });

  const list = bomLines.data ?? [];
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const initRef = useRef(false);

  const sel = list.find(b => b.id === selectedId) ?? null;
  const materialList = useMemo<BomMaterialLookup[]>(
    () => materials.data ?? [],
    [materials.data]
  );

  // Hide this item (self-loop) and materials already in the recipe (avoid 409
  // DuplicateMaterial), except the one bound to the row being edited.
  const selectableMaterials = useMemo(() => {
    const used = new Set(list.map(b => b.materialItemId));
    return materialList.filter(
      m =>
        m.itemId !== itemId &&
        (!used.has(m.itemId) || sel?.materialItemId === m.itemId)
    );
  }, [materialList, list, itemId, sel?.materialItemId]);

  // Uom dropdown (create only): base Uom of the chosen material + its active
  // conversions. Spec §4: quantity must be expressed in a Uom that converts to
  // the material's base.
  const draftMaterialId = draft?.materialItemId ?? 0;
  const selectedMaterial = useMemo(
    () => materialList.find(m => m.itemId === draftMaterialId) ?? null,
    [materialList, draftMaterialId]
  );
  const materialConversions = useResource(
    () =>
      draftMaterialId > 0 && !sel
        ? itemUomConversionsApi.list(draftMaterialId, { isActive: true })
        : Promise.resolve(EMPTY_CONVERSIONS),
    { deps: [draftMaterialId, sel?.id ?? 0] }
  );

  const uomOptions = useMemo<UomOption[]>(() => {
    if (!selectedMaterial) return [];
    const base: UomOption = {
      uomId: selectedMaterial.baseUomId,
      label: `${selectedMaterial.baseUomCode} — ${selectedMaterial.baseUomName} (cơ bản)`,
    };
    const convs = (materialConversions.data ?? []).map(c => ({
      uomId: c.uomId,
      label: `${c.uomCode} — ${c.uomName} (1 = ${c.factorToBase} ${selectedMaterial.baseUomCode})`,
    }));
    return [base, ...convs];
  }, [selectedMaterial, materialConversions.data]);

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
        materialItemId: first.materialItemId,
        quantity: first.quantity,
        uomId: first.uomId,
        isActive: first.isActive,
      });
    }
  }, [list]);

  // When creating, keep the Uom valid for the selected material: snap to its base
  // Uom whenever the current choice isn't offered (material switch / async load).
  useEffect(() => {
    if (sel || !selectedMaterial || !draft) return;
    if (!uomOptions.some(o => o.uomId === draft.uomId)) {
      setDraft(d => (d ? { ...d, uomId: selectedMaterial.baseUomId } : d));
    }
  }, [sel, selectedMaterial, uomOptions, draft]);

  const handleRowSelected = (args: { data: BomLine | BomLine[] }) => {
    const row = Array.isArray(args.data) ? args.data[0] : args.data;
    if (!row?.id || row.id === selectedId) return;
    setSelectedId(row.id);
    setDraft({
      id: row.id,
      materialItemId: row.materialItemId,
      quantity: row.quantity,
      uomId: row.uomId,
      isActive: row.isActive,
    });
    setErrorMsg(null);
  };

  const handleCreate = () => {
    const firstMat = selectableMaterials[0];
    if (!firstMat) {
      setErrorMsg("Không còn nguyên liệu quản kho nào để thêm.");
      return;
    }
    setSelectedId(null);
    setDraft({
      materialItemId: firstMat.itemId,
      quantity: 0.1,
      uomId: firstMat.baseUomId,
      isActive: true,
    });
    setErrorMsg(null);
  };

  const validateDraft = (d: Draft): string | null => {
    if (d.materialItemId === itemId) return "Nguyên liệu không thể trùng với món bán.";
    if (d.quantity <= 0) return "Số lượng phải lớn hơn 0.";
    if (!d.uomId) return "Vui lòng chọn đơn vị tính.";
    return null;
  };

  const handleSave = async () => {
    if (!draft) return;
    const validation = validateDraft(draft);
    if (validation) {
      setErrorMsg(validation);
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    const res = sel
      ? await bomLinesApi.update(itemId, sel.id, {
          quantity: draft.quantity,
          isActive: draft.isActive,
        })
      : await bomLinesApi.create(itemId, {
          materialItemId: draft.materialItemId,
          quantity: draft.quantity,
          uomId: draft.uomId,
          isActive: draft.isActive,
        });

    if (res.isSuccess) {
      await bomLines.reload();
      setSelectedId(res.data.id);
      setDraft({
        id: res.data.id,
        materialItemId: res.data.materialItemId,
        quantity: res.data.quantity,
        uomId: res.data.uomId,
        isActive: res.data.isActive,
      });
    } else {
      setErrorMsg(formatApiError(res));
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!sel) return;
    if (!window.confirm(`Xoá nguyên liệu "${sel.materialItemCode} — ${sel.materialItemName}"?`)) return;
    setSaving(true);
    setErrorMsg(null);
    const res = await bomLinesApi.remove(itemId, sel.id);
    if (res.isSuccess) {
      initRef.current = false;
      await bomLines.reload();
      setSelectedId(null);
      setDraft(null);
    } else {
      setErrorMsg(formatApiError(res));
    }
    setSaving(false);
  };

  const formatMaterial = (row: BomLine) =>
    `${row.materialItemCode} — ${row.materialItemName}`;

  const listDisplay = list.map(b => ({
    ...b,
    materialDisplay: formatMaterial(b),
  }));

  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontSize: 11, color: "var(--fg-muted)", marginBottom: 8 }}>
        Nguyên liệu cần cho 1 đơn vị món bán. Chỉ chọn hàng quản kho, không có công thức riêng.
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
          <Field label="Nguyên liệu" required>
            {sel ? (
              <input value={formatMaterial(sel)} disabled />
            ) : (
              <select
                value={draft.materialItemId}
                onChange={e => {
                  const id = Number(e.target.value);
                  const m = materialList.find(x => x.itemId === id);
                  setDraft({ ...draft, materialItemId: id, uomId: m ? m.baseUomId : draft.uomId });
                }}
              >
                {selectableMaterials.map(m => (
                  <option key={m.itemId} value={m.itemId}>
                    {m.code} — {m.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Số lượng" required>
            <input
              type="number"
              min={0}
              step="any"
              value={draft.quantity}
              onChange={e => setDraft({ ...draft, quantity: Number(e.target.value) })}
            />
          </Field>
          <Field label="Đơn vị" required>
            {sel ? (
              <input value={`${sel.uomCode} — ${sel.uomName}`} disabled />
            ) : (
              <select
                value={draft.uomId}
                onChange={e => setDraft({ ...draft, uomId: Number(e.target.value) })}
              >
                {uomOptions.map(o => (
                  <option key={o.uomId} value={o.uomId}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}
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
          Thêm dòng công thức
        </button>
      )}

      <GridComponent
        dataSource={listDisplay}
        allowSorting
        allowPaging
        pageSettings={{ pageSize: 10 }}
        rowSelected={handleRowSelected}
        selectedRowIndex={selectedId !== null ? list.findIndex(b => b.id === selectedId) : -1}
        height={220}
      >
        <ColumnsDirective>
          <ColumnDirective field="materialDisplay" headerText="Nguyên liệu" width="220" />
          <ColumnDirective field="quantity" headerText="SL" width="90" format="N4" textAlign="Right" />
          <ColumnDirective field="uomCode" headerText="Uom" width="80" />
          <ColumnDirective field="isActive" headerText="Active" width="90" displayAsCheckBox />
        </ColumnsDirective>
        <Inject services={[Page, Sort]} />
      </GridComponent>
    </div>
  );
}
