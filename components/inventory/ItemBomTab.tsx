"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Edit,
  GridComponent,
  Inject,
  Page,
  Sort,
  Toolbar,
  type ColumnModel,
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

/**
 * The whole column definition lives at module scope, and the grid is handed it
 * as one stable `columns` array rather than as <ColumnDirective> children.
 *
 * Why: the Edit module merges the built-in editor — its create/read/write —
 * into `column.edit` once, at init. Anything React re-applies afterwards
 * overwrites that merged object with the bare `{ params }` literal, and the next
 * edit throws "col.edit.create is not a function" (or `.read`, depending on
 * which one it reaches first). Passing the same array identity on every render
 * means React never re-applies, so the merge survives.
 *
 * The consequence is that the columns cannot close over component state, so the
 * per-item data they need lives in LOOKUPS below and is refreshed imperatively.
 */
const LOOKUPS = {
  materialLabel: new Map<number, string>(),
  uomLabel: new Map<number, string>(),
  /** materialItemId → the Uoms its quantity may be expressed in. */
  uomOptions: new Map<number, UomOption[]>(),
  materialOptions: [] as { itemId: number; label: string }[],
};

const materialText = (_f: string, data: object) => {
  const id = (data as Row).materialItemId;
  if (!id) return "";
  return LOOKUPS.materialLabel.get(id)
    ?? LOOKUPS.materialOptions.find(o => o.itemId === id)?.label
    ?? "";
};

const uomText = (_f: string, data: object) => {
  const row = data as Row;
  if (!row.uomId) return "";
  const known = LOOKUPS.uomLabel.get(row.uomId);
  if (known) return known;
  const opt = LOOKUPS.uomOptions.get(row.materialItemId)?.find(o => o.uomId === row.uomId);
  return opt ? opt.label.split(" — ")[0] : "";
};

const MATERIAL_EDIT = {
  params: {
    dataSource: [] as { itemId: number; label: string }[],
    fields: { text: "label", value: "itemId" },
    allowFiltering: true,
    popupHeight: "220px",
  },
};
const QUANTITY_EDIT = { params: { min: 0, step: 0.1, decimals: 4, format: "n4" } };
const UOM_EDIT = {
  params: {
    dataSource: [] as UomOption[],
    fields: { text: "label", value: "uomId" },
    popupHeight: "220px",
  },
};

const BOM_COLUMNS: ColumnModel[] = [
  { field: "id", headerText: "ID", width: "60", isPrimaryKey: true, visible: false },
  {
    field: "materialItemId", headerText: "Nguyên liệu", width: "240",
    editType: "dropdownedit", valueAccessor: materialText, edit: MATERIAL_EDIT,
  },
  {
    field: "quantity", headerText: "SL", width: "100", format: "N4", textAlign: "Right",
    editType: "numericedit", edit: QUANTITY_EDIT,
  },
  {
    field: "uomId", headerText: "Uom", width: "150",
    editType: "dropdownedit", valueAccessor: uomText, edit: UOM_EDIT,
  },
  { field: "isActive", headerText: "Active", width: "90", editType: "booleanedit", displayAsCheckBox: true },
];

const PAGE_SETTINGS = { pageSize: 10 };

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

  // LOOKUPS feeds the module-level valueAccessors, which cannot close over
  // state. Written in an effect, never during render: touching these objects
  // while rendering is what made React re-apply the column props and wipe the
  // merged editors.
  useEffect(() => {
    LOOKUPS.materialLabel.clear();
    LOOKUPS.uomLabel.clear();
    for (const b of list) {
      LOOKUPS.materialLabel.set(b.materialItemId, `${b.materialItemCode} — ${b.materialItemName}`);
      LOOKUPS.uomLabel.set(b.uomId, b.uomCode);
    }
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

  useEffect(() => { LOOKUPS.materialOptions = materialOptions; }, [materialOptions]);

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
      if (materialId <= 0 || LOOKUPS.uomOptions.has(materialId)) return;
      const m = materialById.get(materialId);
      if (!m) return;
      // Seed with the base immediately; a slow fetch then only adds to it.
      LOOKUPS.uomOptions.set(materialId, baseUomOption(materialId));
      const res = await itemUomConversionsApi.list(materialId, { isActive: true });
      if (!res.isSuccess || !res.data) return;
      LOOKUPS.uomOptions.set(materialId, [
        ...baseUomOption(materialId),
        ...res.data.map(c => ({
          uomId: c.uomId,
          label: `${c.uomCode} — ${c.uomName} (1 = ${c.factorToBase} ${m.baseUomCode})`,
        })),
      ]);
    },
    [materialById, baseUomOption]
  );

  // ── Edit wiring ───────────────────────────────────────────────────────────
  type CellArgs = {
    columnName?: string;
    rowData?: Row;
    cancel?: boolean;
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

    // Both lists are filled here, never during render. Touching one of these
    // config objects while rendering makes the React wrapper see a changed prop
    // and re-apply it over the merged editor, which drops the built-in `create`
    // and makes the next Add throw. Mutating them from the grid's own event
    // happens outside React's reconciliation, so the merge survives.
    if (col === "materialItemId") {
      MATERIAL_EDIT.params.dataSource = materialOptions;
    }
    if (col === "uomId") {
      const materialId = args.rowData?.materialItemId ?? 0;
      UOM_EDIT.params.dataSource = LOOKUPS.uomOptions.get(materialId) ?? baseUomOption(materialId);
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

    // Fall back to the material's own base unit. handleCellSaved normally fills
    // this in the moment a material is picked, but that depends on the grid
    // firing cellSaved for that particular cell; a row committed some other way
    // would otherwise fail validation on a unit the user never had to choose.
    for (const r of added) {
      if (!r.uomId && r.materialItemId) {
        const base = materialById.get(r.materialItemId)?.baseUomId;
        if (base) r.uomId = base;
      }
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
        materialItemId: r.materialItemId,
        quantity: r.quantity,
        uomId: r.uomId,
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
    /* Flex column filling the host pane: the hint, buttons and errors keep their
       height and the grid takes the rest, so it shrinks with the window instead
       of holding a fixed height that runs off a short screen. */
    <div
      style={{
        padding: 12,
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ fontSize: 11, color: "var(--fg-muted)", marginBottom: 8, flexShrink: 0 }}>
        Nguyên liệu cần cho 1 đơn vị món bán. Chỉ chọn hàng quản kho, không có công thức riêng.
        Bấm <strong>Thêm</strong> trên lưới để chèn dòng mới, sửa trực tiếp trong ô, rồi bấm{" "}
        <strong>Lưu</strong>. Nguyên liệu và đơn vị chỉ đặt được lúc thêm mới.
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexShrink: 0 }}>
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
        <div style={{ color: "var(--danger)", fontSize: 12, marginBottom: 8, whiteSpace: "pre-wrap", flexShrink: 0 }}>
          {errorMsg}
        </div>
      )}

      {/* A floor, not 0: this tab lands in panes as short as ~86px (the recipe
          window splits its height with the dish list), and there the grid's
          height="100%" left the data area at literally zero rows. The pane
          above scrolls, so overshooting it is fine; collapsing is not. */}
      <div style={{ flex: 1, minHeight: 240 }}>
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
        pageSettings={PAGE_SETTINGS}
        columns={BOM_COLUMNS}
        height="100%"
      >
        <Inject services={[Page, Sort, Edit, Toolbar]} />
      </GridComponent>
      </div>
    </div>
  );
}
