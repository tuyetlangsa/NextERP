"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import type { BomLine, BomMaterialLookup } from "@/types/api/inventory";

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

/** Strip trailing zeros so 150.0000 reads as "150", 0.001 stays "0.001". */
function formatQty(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  return parseFloat(n.toFixed(8)).toString();
}

export function ItemBomTab({ itemId }: Props) {
  const bomLines = useResource(() => bomLinesApi.list(itemId), {
    fallback: mockBomLines.filter(b => b.sellableItemId === itemId),
    deps: [itemId],
  });

  // Spec §4: this lookup already returns only IsStockable=true && HasRecipe=false
  // items, each carrying its base Uom.
  const materials = useResource(() => bomMaterialsLookupApi.list(), { deps: [] });

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const initRef = useRef(false);

  const list = useMemo<BomLine[]>(() => bomLines.data ?? [], [bomLines.data]);
  const materialList = useMemo<BomMaterialLookup[]>(
    () => materials.data ?? [],
    [materials.data]
  );

  const sel = list.find(b => b.id === selectedId) ?? null;

  // Hide this item (self-loop) and materials already in the recipe — the unique
  // index is (SellableItemId, MaterialItemId), so a second line for the same
  // material is rejected regardless of its Uom.
  const selectableMaterials = useMemo(() => {
    const used = new Set(list.map(b => b.materialItemId));
    return materialList.filter(
      m => m.itemId !== itemId && (!used.has(m.itemId) || sel?.materialItemId === m.itemId)
    );
  }, [materialList, list, itemId, sel?.materialItemId]);

  // Uom choices follow the chosen material: its base plus every active
  // conversion. Only meaningful while creating — a saved line cannot change Uom.
  const draftMaterialId = draft?.materialItemId ?? 0;
  const selectedMaterial = useMemo(
    () => materialList.find(m => m.itemId === draftMaterialId) ?? null,
    [materialList, draftMaterialId]
  );
  // `enabled` rather than a fake empty response: a saved line shows its Uom in a
  // disabled input and never reads this list, so there is nothing to fetch.
  const materialConversions = useResource(
    () => itemUomConversionsApi.list(draftMaterialId, { isActive: true }),
    { deps: [draftMaterialId, sel?.id ?? 0], enabled: draftMaterialId > 0 && !sel }
  );

  const uomOptions = useMemo<UomOption[]>(() => {
    if (!selectedMaterial) return [];
    const base: UomOption = {
      uomId: selectedMaterial.baseUomId,
      label: `${selectedMaterial.baseUomCode} — ${selectedMaterial.baseUomName} (cơ bản)`,
    };
    // Drop a conversion that points at the base unit itself. Such rows exist in
    // older data (the API only started refusing them on 2026-08-09) and they are
    // inert server-side — UomConverter short-circuits on the base before reading
    // the table — but here they collided with the base entry on the same key.
    const convs = (materialConversions.data ?? [])
      .filter(c => c.uomId !== selectedMaterial.baseUomId)
      .map(c => ({
        uomId: c.uomId,
        label: `${c.uomCode} — ${c.uomName} (1 = ${formatQty(c.factorToBase)} ${selectedMaterial.baseUomCode})`,
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

  // While creating, keep the Uom valid for the chosen material: snap to its base
  // whenever the current pick is not on offer (material switch / async load).
  useEffect(() => {
    if (sel || !selectedMaterial || !draft) return;
    if (!uomOptions.some(o => o.uomId === draft.uomId)) {
      setDraft(d => (d ? { ...d, uomId: selectedMaterial.baseUomId } : d));
    }
  }, [sel, selectedMaterial, uomOptions, draft]);

  const handleRowSelected = useCallback(
    (args: { data: BomLine | BomLine[] }) => {
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
    },
    [selectedId]
  );

  const handleCreate = () => {
    const firstMat = selectableMaterials[0];
    if (!firstMat) {
      setErrorMsg("Không còn nguyên liệu quản kho nào để thêm.");
      return;
    }
    setSelectedId(null);
    setDraft({
      materialItemId: firstMat.itemId,
      quantity: 1,
      uomId: firstMat.baseUomId,
      isActive: true,
    });
    setErrorMsg(null);
  };

  const handleSave = async () => {
    if (!draft) return;
    if (draft.materialItemId === itemId) {
      setErrorMsg("Nguyên liệu không thể trùng với món bán.");
      return;
    }
    if (draft.quantity <= 0) {
      setErrorMsg("Số lượng phải lớn hơn 0.");
      return;
    }
    if (!draft.uomId) {
      setErrorMsg("Vui lòng chọn đơn vị tính.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    // Update takes the whole line, not a patch: the handler compares the
    // materialItemId and uomId it receives against the stored ones and refuses
    // the write if they differ, so they are echoed back unchanged.
    const res = sel
      ? await bomLinesApi.update(itemId, sel.id, {
          materialItemId: sel.materialItemId,
          quantity: draft.quantity,
          uomId: sel.uomId,
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
    if (!window.confirm(`Xoá nguyên liệu "${sel.materialItemCode} — ${sel.materialItemName}"?`)) {
      return;
    }
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

  const listDisplay = useMemo(
    () =>
      list.map(b => ({
        ...b,
        materialDisplay: `${b.materialItemCode} — ${b.materialItemName}`,
        quantityDisplay: `${formatQty(b.quantity)} ${b.uomCode}`,
      })),
    [list]
  );

  const btnBase: React.CSSProperties = {
    padding: "4px 10px",
    fontSize: 12,
    borderRadius: 4,
    cursor: "pointer",
  };

  return (
    <div style={{ display: "flex", height: "100%", minHeight: 0 }}>
      {/* Form on the left, list on the right — the master-detail split the other
          ERP windows use. Stacking them vertically inside this already-short
          pane left the grid with only a couple of visible rows. */}
      <div
        style={{
          width: 340,
          flexShrink: 0,
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          background: "var(--panel-bg)",
        }}
      >
        {/* Actions as a compact strip at the top rather than a padded bar at the
            bottom: this pane is short, and the taller footer was what pushed the
            last form fields out of view. */}
        <div
          style={{
            display: "flex",
            gap: 6,
            padding: "6px 8px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={handleCreate}
            disabled={saving}
            style={{ ...btnBase, border: "1px solid var(--border-strong)", background: "#fff" }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <ChromeIcons.Plus /> Thêm
            </span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!draft || saving}
            style={{ ...btnBase, border: 0, background: "var(--accent)", color: "#fff" }}
          >
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!sel || saving}
            style={{ ...btnBase, border: 0, background: "var(--danger)", color: "#fff" }}
          >
            Xoá
          </button>
        </div>

        <div className="bom-form" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "8px 12px" }}>
          {draft ? (
            <>
              <Field label="Nguyên liệu" required>
                {sel ? (
                  <input value={`${sel.materialItemCode} — ${sel.materialItemName}`} disabled />
                ) : (
                  <select
                    value={draft.materialItemId}
                    onChange={e => {
                      const id = Number(e.target.value);
                      const m = materialList.find(x => x.itemId === id);
                      setDraft({
                        ...draft,
                        materialItemId: id,
                        uomId: m ? m.baseUomId : draft.uomId,
                      });
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

              {/* Side by side: they read as one value ("150 g") and the pane is
                  short enough that a stacked row each does not fit. */}
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ width: 110, flexShrink: 0 }}>
                  <Field label="Số lượng" required>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={draft.quantity}
                      onChange={e => setDraft({ ...draft, quantity: Number(e.target.value) })}
                    />
                  </Field>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
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
                </div>
              </div>

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

              {sel && (
                <div style={{ marginTop: 8, fontSize: 11, color: "var(--fg-muted)" }}>
                  Nguyên liệu và đơn vị không sửa được — xoá rồi thêm lại.
                </div>
              )}

              {errorMsg && (
                <div
                  style={{
                    color: "var(--danger)",
                    fontSize: 12,
                    marginTop: 8,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {errorMsg}
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
              Chọn một nguyên liệu trong danh sách để sửa, hoặc bấm <strong>Thêm</strong> để khai
              nguyên liệu mới.
              {errorMsg && (
                <div style={{ color: "var(--danger)", marginTop: 8, whiteSpace: "pre-wrap" }}>
                  {errorMsg}
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      <div className="data-list" style={{ flex: 1, minWidth: 0 }}>
        <GridComponent
          // Keyed on row count too, not just itemId: Syncfusion binds once at
          // mount, so a response landing after that would leave the list empty.
          key={`bom-${itemId}-${list.length}`}
          dataSource={listDisplay}
          allowSorting
          allowPaging
          pageSettings={{ pageSize: 20 }}
          rowSelected={handleRowSelected}
          selectedRowIndex={selectedId !== null ? list.findIndex(b => b.id === selectedId) : -1}
          height="100%"
        >
          <ColumnsDirective>
            <ColumnDirective field="materialDisplay" headerText="Nguyên liệu" width="260" />
            <ColumnDirective
              field="quantityDisplay"
              headerText="Định lượng"
              width="130"
              textAlign="Right"
            />
            <ColumnDirective field="uomName" headerText="Đơn vị" width="120" />
            <ColumnDirective field="isActive" headerText="Kích hoạt" width="100" displayAsCheckBox />
          </ColumnsDirective>
          <Inject services={[Page, Sort]} />
        </GridComponent>
      </div>
    </div>
  );
}
