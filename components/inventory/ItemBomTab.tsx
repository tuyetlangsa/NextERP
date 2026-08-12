"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  ColumnDirective,
  ColumnsDirective,
  Edit,
  GridComponent,
  Inject,
  Page,
  Sort,
  Toolbar,
  type EditSettingsModel,
} from "@syncfusion/ej2-react-grids";
import {
  bomLinesApi,
  bomMaterialsLookupApi,
  itemUomConversionsApi,
} from "@/lib/api/inventory";
import { useResource } from "@/lib/http/useResource";
import { formatApiError } from "@/lib/http/formatError";
import { mockBomLines } from "@/data/mock";
import type { BomLine, BomMaterialLookup } from "@/types/api/inventory";

/** One grid row. `id` is 0 for a row the user just added and has not saved. */
type Row = {
  id: number;
  materialItemId: number;
  quantity: number;
  uomId: number;
  isActive: boolean;
};

type UomOption = { uomId: number; label: string };

const EDIT_SETTINGS: EditSettingsModel = {
  allowAdding: true,
  allowEditing: true,
  allowDeleting: true,
  mode: "Batch",
  newRowPosition: "Top",
};

interface Props {
  itemId: number;
}

export function ItemBomTab({ itemId }: Props) {
  const bomLines = useResource(() => bomLinesApi.list(itemId), {
    fallback: mockBomLines.filter(b => b.sellableItemId === itemId),
    deps: [itemId],
  });

  // Spec §4: this lookup already returns only IsStockable=true && HasRecipe=false
  // items, each carrying its base Uom.
  const materials = useResource(() => bomMaterialsLookupApi.list(), { deps: [] });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const gridRef = useRef<GridComponent | null>(null);

  /**
   * materialItemId → the Uoms its quantity may be expressed in (its base plus each
   * active conversion). Filled on demand: a saved row cannot change its Uom, so the
   * only material whose options are ever needed is the one just picked on a new row.
   * A ref, not state — the dropdown reads it during the grid's own edit event, and a
   * re-render there would tear down the editor being created.
   */
  const uomCache = useRef(new Map<number, UomOption[]>());

  const list = useMemo<BomLine[]>(() => bomLines.data ?? [], [bomLines.data]);
  const materialList = useMemo<BomMaterialLookup[]>(
    () => materials.data ?? [],
    [materials.data]
  );

  const materialById = useMemo(() => {
    const m = new Map<number, BomMaterialLookup>();
    for (const x of materialList) m.set(x.itemId, x);
    return m;
  }, [materialList]);

  const rows = useMemo<Row[]>(
    () =>
      list.map(b => ({
        id: b.id,
        materialItemId: b.materialItemId,
        quantity: b.quantity,
        uomId: b.uomId,
        isActive: b.isActive,
      })),
    [list]
  );

  /** Uom labels for rows already saved, whose material may not be in the lookup. */
  const savedUomLabel = useMemo(() => {
    const m = new Map<number, string>();
    for (const b of list) m.set(b.uomId, b.uomCode);
    return m;
  }, [list]);

  const savedMaterialLabel = useMemo(() => {
    const m = new Map<number, string>();
    for (const b of list) m.set(b.materialItemId, `${b.materialItemCode} — ${b.materialItemName}`);
    return m;
  }, [list]);

  // Exclude this item (self-loop) and materials already on the recipe — the unique
  // index is (SellableItemId, MaterialItemId), so a second line for the same
  // material is rejected regardless of its Uom.
  const materialOptions = useMemo(
    () =>
      materialList
        .filter(m => m.itemId !== itemId)
        .map(m => ({ itemId: m.itemId, label: `${m.code} — ${m.name}` })),
    [materialList, itemId]
  );

  const baseUomOption = useCallback(
    (materialId: number): UomOption[] => {
      const m = materialById.get(materialId);
      return m
        ? [{ uomId: m.baseUomId, label: `${m.baseUomCode} — ${m.baseUomName} (cơ bản)` }]
        : [];
    },
    [materialById]
  );

  /** Warms the cache so the Uom dropdown has the conversions by the time it opens. */
  const loadUomOptions = useCallback(
    async (materialId: number) => {
      if (materialId <= 0 || uomCache.current.has(materialId)) return;
      const m = materialById.get(materialId);
      if (!m) return;
      // Seed with the base immediately; a slow fetch then only adds to it.
      uomCache.current.set(materialId, baseUomOption(materialId));
      const res = await itemUomConversionsApi.list(materialId, { isActive: true });
      if (!res.isSuccess || !res.data) return;
      uomCache.current.set(materialId, [
        ...baseUomOption(materialId),
        ...res.data.map(c => ({
          uomId: c.uomId,
          label: `${c.uomCode} — ${c.uomName} (1 = ${c.factorToBase} ${m.baseUomCode})`,
        })),
      ]);
    },
    [materialById, baseUomOption]
  );

  // ── Display ───────────────────────────────────────────────────────────────
  const materialText = (_f: string, data: object) => {
    const id = (data as Row).materialItemId;
    return savedMaterialLabel.get(id) ?? materialOptions.find(o => o.itemId === id)?.label ?? "";
  };

  const uomText = (_f: string, data: object) => {
    const row = data as Row;
    const cached = uomCache.current.get(row.materialItemId)?.find(o => o.uomId === row.uomId);
    return cached?.label.split(" — ")[0] ?? savedUomLabel.get(row.uomId) ?? "";
  };

  // ── Edit wiring ───────────────────────────────────────────────────────────
  type CellArgs = {
    columnName?: string;
    rowData?: Row;
    cancel?: boolean;
    column?: { edit?: { params?: Record<string, unknown> } };
    value?: unknown;
    cell?: HTMLElement;
  };

  /**
   * Material and Uom are fixed once a line exists — UpdateBomLine accepts only
   * quantity and isActive, so letting either be typed over would show an edit the
   * save silently drops. Changing them means deleting the line and adding it back.
   */
  const handleCellEdit = (args: CellArgs) => {
    const isSaved = (args.rowData?.id ?? 0) > 0;
    const col = args.columnName;

    if (isSaved && (col === "materialItemId" || col === "uomId")) {
      args.cancel = true;
      return;
    }

    if (col === "uomId" && args.column?.edit?.params) {
      const materialId = args.rowData?.materialItemId ?? 0;
      const options = uomCache.current.get(materialId) ?? baseUomOption(materialId);
      // The editor is constructed after this event, so it picks up the swap.
      args.column.edit.params.dataSource = options;
    }
  };

  /** Picking a material resets the Uom to its base and fetches its conversions. */
  const handleCellSaved = (args: CellArgs) => {
    if (args.columnName !== "materialItemId") return;
    const materialId = Number(args.value ?? 0);
    if (materialId <= 0) return;
    void loadUomOptions(materialId);

    const m = materialById.get(materialId);
    const grid = gridRef.current;
    if (!m || !grid) return;

    // The row index comes from the cell that was just edited, not from
    // selectedRowIndex — in batch mode the selection can sit on a different row,
    // and writing the Uom into the wrong line would be silent and wrong. If the
    // index cannot be resolved, leave it: validation still refuses uomId = 0.
    const tr = args.cell?.closest("tr");
    const rowIndex = tr instanceof HTMLTableRowElement ? tr.rowIndex - 1 : -1;
    if (rowIndex >= 0) {
      grid.updateCell(rowIndex, "uomId", m.baseUomId);
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const validate = (added: Row[], changed: Row[], survivingIds: Set<number>): string | null => {
    for (const r of changed) {
      if (r.quantity <= 0) return "Số lượng phải lớn hơn 0.";
    }
    const used = new Set<number>();
    for (const b of list) {
      if (survivingIds.has(b.id)) used.add(b.materialItemId);
    }
    for (const r of added) {
      if (!r.materialItemId) return "Vui lòng chọn nguyên liệu cho dòng mới.";
      if (r.materialItemId === itemId) return "Nguyên liệu không thể trùng với món bán.";
      if (r.quantity <= 0) return "Số lượng phải lớn hơn 0.";
      if (!r.uomId) return "Vui lòng chọn đơn vị tính.";
      if (used.has(r.materialItemId)) {
        const label = materialOptions.find(o => o.itemId === r.materialItemId)?.label ?? "";
        return `Nguyên liệu "${label}" đã có trong công thức. Mỗi nguyên liệu chỉ được khai một dòng.`;
      }
      used.add(r.materialItemId);
    }
    return null;
  };

  const handleSave = async () => {
    const grid = gridRef.current;
    if (!grid) return;

    // Commits the cell still under the cursor, so a value typed but not tabbed
    // out of is not lost when the user goes straight to Lưu.
    grid.endEdit();

    const changes = grid.getBatchChanges() as {
      addedRecords?: Row[];
      changedRecords?: Row[];
      deletedRecords?: Row[];
    };
    const added = changes.addedRecords ?? [];
    const changed = (changes.changedRecords ?? []).filter(r => r.id > 0);
    const deleted = (changes.deletedRecords ?? []).filter(r => r.id > 0);

    if (added.length === 0 && changed.length === 0 && deleted.length === 0) {
      setErrorMsg("Chưa có thay đổi nào để lưu.");
      return;
    }

    const deletedIds = new Set(deleted.map(r => r.id));
    const surviving = new Set(list.map(b => b.id).filter(id => !deletedIds.has(id)));
    const invalid = validate(added, changed, surviving);
    if (invalid) {
      setErrorMsg(invalid);
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    const failures: string[] = [];

    // Deletes first: frees a material so the same save can re-add it on a new line.
    for (const r of deleted) {
      const res = await bomLinesApi.remove(itemId, r.id);
      if (!res.isSuccess) failures.push(formatApiError(res));
    }
    for (const r of changed) {
      const res = await bomLinesApi.update(itemId, r.id, {
        quantity: r.quantity,
        isActive: r.isActive,
      });
      if (!res.isSuccess) failures.push(formatApiError(res));
    }
    for (const r of added) {
      const res = await bomLinesApi.create(itemId, {
        materialItemId: r.materialItemId,
        quantity: r.quantity,
        uomId: r.uomId,
        isActive: r.isActive ?? true,
      });
      if (!res.isSuccess) failures.push(formatApiError(res));
    }

    await bomLines.reload();
    setSaving(false);
    setErrorMsg(failures.length > 0 ? failures.join("\n") : null);
  };

  /** Marks the selected row deleted in the batch; Lưu is what actually removes it. */
  const handleDelete = () => {
    const grid = gridRef.current;
    if (!grid) return;
    if (grid.selectedRowIndex < 0) {
      setErrorMsg("Chọn một dòng nguyên liệu để xoá.");
      return;
    }
    setErrorMsg(null);
    grid.deleteRecord();
  };

  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontSize: 11, color: "var(--fg-muted)", marginBottom: 8 }}>
        Nguyên liệu cần cho 1 đơn vị món bán. Chỉ chọn hàng quản kho, không có công thức riêng.
        Bấm <strong>Thêm</strong> trên lưới để chèn dòng mới, sửa trực tiếp trong ô, rồi bấm{" "}
        <strong>Lưu</strong>. Nguyên liệu và đơn vị chỉ đặt được lúc thêm mới.
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          style={{ padding: "6px 12px", fontSize: 12, border: 0, borderRadius: 4, background: "var(--accent)", color: "#fff" }}
        >
          {saving ? "Đang lưu..." : "Lưu"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={saving}
          style={{ padding: "6px 12px", fontSize: 12, border: 0, borderRadius: 4, background: "var(--danger)", color: "#fff" }}
        >
          Xoá
        </button>
      </div>

      {errorMsg && (
        <div style={{ color: "var(--danger)", fontSize: 12, marginBottom: 8, whiteSpace: "pre-wrap" }}>
          {errorMsg}
        </div>
      )}

      <GridComponent
        key={`bom-${itemId}-${rows.length}`}
        ref={(g: GridComponent | null) => { gridRef.current = g; }}
        dataSource={rows}
        editSettings={EDIT_SETTINGS}
        toolbar={["Add"]}
        cellEdit={handleCellEdit}
        cellSaved={handleCellSaved}
        allowSorting
        allowPaging
        pageSettings={{ pageSize: 10 }}
        height={260}
      >
        <ColumnsDirective>
          <ColumnDirective field="id" headerText="ID" width="60" isPrimaryKey={true} visible={false} />
          <ColumnDirective
            field="materialItemId"
            headerText="Nguyên liệu"
            width="240"
            editType="dropdownedit"
            valueAccessor={materialText}
            edit={{
              params: {
                dataSource: materialOptions,
                fields: { text: "label", value: "itemId" },
                allowFiltering: true,
                popupHeight: "220px",
              },
            }}
          />
          <ColumnDirective
            field="quantity"
            headerText="SL"
            width="100"
            format="N4"
            textAlign="Right"
            editType="numericedit"
            edit={{ params: { min: 0, step: 0.1, decimals: 4, format: "n4" } }}
          />
          <ColumnDirective
            field="uomId"
            headerText="Uom"
            width="150"
            editType="dropdownedit"
            valueAccessor={uomText}
            edit={{
              params: {
                dataSource: [] as UomOption[],
                fields: { text: "label", value: "uomId" },
                popupHeight: "220px",
              },
            }}
          />
          <ColumnDirective
            field="isActive"
            headerText="Active"
            width="90"
            editType="booleanedit"
            displayAsCheckBox
          />
        </ColumnsDirective>
        <Inject services={[Page, Sort, Edit, Toolbar]} />
      </GridComponent>
    </div>
  );
}
