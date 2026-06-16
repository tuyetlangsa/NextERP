"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ColumnDirective,
  ColumnsDirective,
  Filter,
  GridComponent,
  Inject,
  Page,
  Sort,
} from "@syncfusion/ej2-react-grids";
import {
  TreeViewComponent,
  type FieldsSettingsModel,
} from "@syncfusion/ej2-react-navigations";
import { DialogComponent } from "@syncfusion/ej2-react-popups";
import { ensureSyncfusionLicense } from "@/lib/syncfusion-license";
import { WinToolbar, TB } from "@/components/ui/WinToolbar";
import { Field } from "@/components/ui/DetailPanel";
import { StatusBar } from "@/components/ui/StatusBar";
import { LoadingBar, OfflineBar, ErrorBar } from "@/components/ui/ResourceBars";
import { ChromeIcons } from "@/components/desktop/icons";
import {
  categoriesApi,
  itemsApi,
  uomsApi,
  type CategoryUpsert,
  type ItemCategoryInput,
  type ItemUpsert,
} from "@/lib/api/menu";
import { lookupsApi } from "@/lib/api/lookups";
import { useResource } from "@/lib/http/useResource";
import { uploadToCloudinary, isCloudinaryConfigured } from "@/lib/upload/cloudinary";
import { ItemUomConversionTab } from "@/components/inventory/ItemUomConversionTab";
import { ItemBomTab } from "@/components/inventory/ItemBomTab";
import type { Category, ItemListRow } from "@/types/api/menu";

ensureSyncfusionLicense();

type ItemDraft = {
  id?: number;
  code: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  baseUomId: number;
  vatPercent: number;
  isStockable: boolean;
  hasRecipe: boolean;
  lowStockThreshold: number | null;
  kitchenStationId: number | null;
  isActive: boolean;
  categories: ItemCategoryInput[];
};

type CategoryDraft = {
  id?: number;
  code: string;
  name: string;
  description: string | null;
  parentId: number | null;
  displayOrder: number;
  isActive: boolean;
};

function renderInfoTab(
  draft: ItemDraft,
  setDraft: (d: ItemDraft) => void,
  uomList: { id: number; code: string; name: string }[],
  stationList: { id: number; code: string; name: string }[],
  categoryList: Category[],
  mainCategoryId: number | null,
  setMainCategoryOnly: (id: number) => void,
) {
  return (
    <div style={{ padding: 12 }}>
      <Field label="Mã" required>
        <input value={draft.code} onChange={e => setDraft({ ...draft, code: e.target.value })} />
      </Field>
      <Field label="Tên" required>
        <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
      </Field>
      <Field label="Mô tả">
        <textarea
          rows={2}
          value={draft.description ?? ""}
          onChange={e => setDraft({ ...draft, description: e.target.value || null })}
        />
      </Field>
      <Field label="Nhóm chính" required>
        <select
          value={mainCategoryId ?? ""}
          onChange={e => e.target.value && setMainCategoryOnly(Number(e.target.value))}
        >
          <option value="" disabled>(Chọn nhóm chính)</option>
          {categoryList.map(c => (
            <option key={c.id} value={c.id}>
              {"— ".repeat(c.level)}
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="ĐVT" required>
        <select value={draft.baseUomId} onChange={e => setDraft({ ...draft, baseUomId: Number(e.target.value) })}>
          {uomList.map(u => (
            <option key={u.id} value={u.id}>
              {u.code} — {u.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="VAT %">
        <input
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={draft.vatPercent}
          onChange={e => setDraft({ ...draft, vatPercent: Number(e.target.value) })}
        />
      </Field>
      <Field label="Trạm bếp">
        <select
          value={draft.kitchenStationId ?? ""}
          onChange={e =>
            setDraft({ ...draft, kitchenStationId: e.target.value ? Number(e.target.value) : null })
          }
        >
          <option value="">(Không)</option>
          {stationList.map(s => (
            <option key={s.id} value={s.id}>
              {s.code} — {s.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Quản kho">
        <input
          type="checkbox"
          checked={draft.isStockable}
          onChange={e => setDraft({ ...draft, isStockable: e.target.checked })}
        />
      </Field>
      {draft.isStockable && (
        <Field label="Ngưỡng cảnh báo">
          <input
            type="number"
            min={0}
            value={draft.lowStockThreshold ?? ""}
            onChange={e =>
              setDraft({
                ...draft,
                lowStockThreshold: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </Field>
      )}
      <Field label="Có recipe">
        <input
          type="checkbox"
          checked={draft.hasRecipe}
          onChange={e => setDraft({ ...draft, hasRecipe: e.target.checked })}
        />
      </Field>
      <Field label="Kích hoạt">
        <input
          type="checkbox"
          checked={draft.isActive}
          onChange={e => setDraft({ ...draft, isActive: e.target.checked })}
        />
      </Field>
    </div>
  );
}

function renderImageTab(
  draft: ItemDraft,
  setDraft: (d: ItemDraft) => void,
  uploading: boolean,
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void,
) {
  return (
    <div style={{ padding: 12 }}>
      {draft.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={draft.imageUrl}
          alt="Item"
          style={{
            width: "100%",
            maxHeight: 240,
            objectFit: "contain",
            border: "1px solid var(--border)",
            borderRadius: 4,
            marginBottom: 8,
            background: "#fafafa",
          }}
        />
      ) : (
        <div
          style={{
            height: 240,
            marginBottom: 8,
            background: "#f4f4f5",
            border: "1px dashed var(--border-strong)",
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--fg-muted)",
            fontSize: 12,
          }}
        >
          Chưa có ảnh
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <label
          style={{
            cursor: isCloudinaryConfigured() ? "pointer" : "not-allowed",
            padding: "6px 12px",
            border: "1px solid var(--border-strong)",
            borderRadius: 4,
            fontSize: 12,
            background: "#fff",
            opacity: isCloudinaryConfigured() ? 1 : 0.5,
          }}
        >
          {uploading ? "Đang upload..." : "Chọn ảnh"}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={uploading || !isCloudinaryConfigured()}
            style={{ display: "none" }}
          />
        </label>
        {draft.imageUrl && (
          <button
            type="button"
            onClick={() => setDraft({ ...draft, imageUrl: null })}
            style={{
              padding: "6px 12px",
              border: "1px solid var(--border-strong)",
              borderRadius: 4,
              background: "#fff",
              fontSize: 12,
            }}
          >
            Xoá ảnh
          </button>
        )}
      </div>
      {!isCloudinaryConfigured() && (
        <div style={{ marginTop: 6, fontSize: 11, color: "var(--warning)" }}>
          Cloudinary chưa cấu hình — chỉ paste URL được.
        </div>
      )}
      <input
        style={{ marginTop: 8, width: "100%" }}
        placeholder="Hoặc paste URL ảnh..."
        value={draft.imageUrl ?? ""}
        onChange={e => setDraft({ ...draft, imageUrl: e.target.value || null })}
      />
    </div>
  );
}

function renderSubCategoryTab(
  draft: ItemDraft,
  categoryList: Category[],
  mainCategoryId: number | null,
  toggleSubCategory: (id: number) => void,
) {
  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontSize: 11, color: "var(--fg-muted)", marginBottom: 8 }}>
        Tick các nhóm phụ để Item xuất hiện trong danh sách khi lọc theo nhóm đó. Nhóm chính
        không hiện ở đây — đổi nhóm chính ở tab Thông tin.
      </div>
      <div
        style={{
          maxHeight: 360,
          overflowY: "auto",
          border: "1px solid var(--border)",
          borderRadius: 4,
          padding: 4,
          background: "#fff",
        }}
      >
        {categoryList
          .filter(c => c.id !== mainCategoryId)
          .map(c => {
            const checked = draft.categories.some(a => a.categoryId === c.id && !a.isMain);
            return (
              <label
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 4px",
                  paddingLeft: 4 + c.level * 14,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleSubCategory(c.id)}
                />
                <span>{c.name}</span>
              </label>
            );
          })}
      </div>
    </div>
  );
}

export function WinItem() {
  const categories = useResource(() => categoriesApi.list());
  const uoms = useResource(() => uomsApi.list());
  const kitchenStations = useResource(() => lookupsApi.getKitchenStations());

  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const PAGE_SIZE = 200;

  const items = useResource(
    () => itemsApi.list({
      pageNumber,
      pageSize: PAGE_SIZE,
      ...(categoryFilter ? { categoryId: categoryFilter } : {}),
    }),
    { deps: [categoryFilter, pageNumber] }
  );

  const itemList = items.data?.items ?? [];
  const totalCount = items.data?.totalCount ?? 0;
  const categoryList = categories.data ?? [];
  const uomList = uoms.data ?? [];
  const stationList = kitchenStations.data ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<ItemDraft | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catDraft, setCatDraft] = useState<CategoryDraft | null>(null);
  const [catEditingId, setCatEditingId] = useState<number | null>(null);
  const [catSaving, setCatSaving] = useState(false);
  const [catErrorMsg, setCatErrorMsg] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState("info");
  const [catParentPickerOpen, setCatParentPickerOpen] = useState(false);

  const categoryListDfs = useMemo(() => {
    const byParent = new Map<number | null, Category[]>();
    for (const c of categoryList) {
      const k = c.parentId ?? null;
      const arr = byParent.get(k);
      if (arr) arr.push(c);
      else byParent.set(k, [c]);
    }
    for (const arr of byParent.values()) {
      arr.sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
    }
    const out: Category[] = [];
    const walk = (parentId: number | null) => {
      for (const c of byParent.get(parentId) ?? []) {
        out.push(c);
        walk(c.id);
      }
    };
    walk(null);
    return out;
  }, [categoryList]);

  const treeData = useMemo(() => {
    type Node = { id: string; text: string; expanded?: boolean; child?: Node[] };
    const byParent = new Map<number | null, Category[]>();
    for (const c of categoryList) {
      const k = c.parentId ?? null;
      const arr = byParent.get(k);
      if (arr) arr.push(c);
      else byParent.set(k, [c]);
    }
    for (const arr of byParent.values()) {
      arr.sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
    }
    const build = (cat: Category): Node => {
      const kids = byParent.get(cat.id) ?? [];
      return {
        id: `c-${cat.id}`,
        text: cat.name,
        expanded: true,
        child: kids.map(build),
      };
    };
    const roots = (byParent.get(null) ?? []).map(build);
    return [
      {
        id: "all",
        text: "Tất cả Item",
        expanded: true,
        child: roots,
      },
    ] as unknown as { [key: string]: object }[];
  }, [categoryList]);

  // Memoize fields — inline object literal would make TreeView re-mount the
  // whole tree on every render (visible as flicker/reload).
  const treeFields: FieldsSettingsModel = useMemo(
    () => ({
      dataSource: treeData,
      id: "id",
      text: "text",
      child: "child" as never,
    }),
    [treeData]
  );

  // Stable nodeTemplate ref — passing a fresh arrow every render forces
  // Syncfusion to recompute every node template.
  const renderTreeNode = useCallback(
    (data: { text: string }) => (
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span className="ico">
          <ChromeIcons.Folder />
        </span>
        <span style={{ flex: 1 }}>{data.text}</span>
      </span>
    ),
    []
  );

  const handleTreeSelect = (args: { nodeData: { id: string | number } }) => {
    const raw = String(args.nodeData.id);
    setPageNumber(1);
    items.setData(null);
    if (raw === "all") {
      setCategoryFilter(null);
      return;
    }
    const id = Number(raw.replace(/^c-/, ""));
    setCategoryFilter(Number.isFinite(id) ? id : null);
  };

  const treeReady = !categories.loading;

  const closeDialog = () => {
    setDialogOpen(false);
    setDraft(null);
    setEditingId(null);
    setErrorMsg(null);
    setSelectedTab("info");
  };

  const openCreate = () => {
    const firstUom = uomList[0];
    if (!firstUom) {
      setErrorMsg("Chưa có Uom. Hãy tạo Uom trước.");
      return;
    }
    setDraft({
      code: "",
      name: "",
      description: null,
      imageUrl: null,
      baseUomId: firstUom.id,
      vatPercent: 0,
      isStockable: true,
      hasRecipe: false,
      lowStockThreshold: null,
      kitchenStationId: null,
      isActive: true,
      categories: categoryFilter ? [{ categoryId: categoryFilter, isMain: true }] : [],
    });
    setEditingId(null);
    setErrorMsg(null);
    setSelectedTab("info");
    setDialogOpen(true);
  };

  const openEdit = async (id: number) => {
    setEditingId(id);
    setErrorMsg(null);
    setSelectedTab("info");
    setDialogOpen(true);
    setDraft(null);
    const res = await itemsApi.get(id);
    if (res.isSuccess) {
      const d = res.data;
      setDraft({
        id: d.id,
        code: d.code,
        name: d.name,
        description: d.description,
        imageUrl: d.imageUrl,
        baseUomId: d.baseUomId,
        vatPercent: d.vatPercent,
        isStockable: d.isStockable,
        hasRecipe: d.hasRecipe,
        lowStockThreshold: d.lowStockThreshold,
        kitchenStationId: d.kitchenStationId,
        isActive: d.isActive,
        categories: d.categories.map(c => ({ categoryId: c.categoryId, isMain: c.isMain })),
      });
    } else {
      setErrorMsg(res.detail || res.title);
    }
  };

  const handleRowSelected = (args: { data: ItemListRow | ItemListRow[] }) => {
    const row = Array.isArray(args.data) ? args.data[0] : args.data;
    if (row?.id !== undefined && !dialogOpen) openEdit(row.id);
  };

  const handleSave = async () => {
    if (!draft) return;
    if (draft.categories.length === 0) {
      setErrorMsg("Item phải thuộc ít nhất 1 Category.");
      return;
    }
    if (!draft.categories.some(c => c.isMain)) {
      setErrorMsg("Phải chọn 1 Category làm Main.");
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    const body: ItemUpsert = {
      code: draft.code.trim(),
      name: draft.name.trim(),
      description: draft.description?.trim() || null,
      imageUrl: draft.imageUrl,
      baseUomId: draft.baseUomId,
      vatPercent: draft.vatPercent,
      isStockable: draft.isStockable,
      hasRecipe: draft.hasRecipe,
      lowStockThreshold: draft.isStockable ? draft.lowStockThreshold : null,
      kitchenStationId: draft.kitchenStationId,
      isActive: draft.isActive,
      categories: draft.categories,
    };
    const res = editingId
      ? await itemsApi.update(editingId, body)
      : await itemsApi.create(body);

    if (res.isSuccess) {
      items.setData(null);
      await items.reload();
      await categories.reload();
      closeDialog();
    } else {
      setErrorMsg(res.detail || res.title);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!editingId || !draft) return;
    if (!window.confirm(`Xoá Item "${draft.code} — ${draft.name}"?`)) return;
    setSaving(true);
    const res = await itemsApi.remove(editingId);
    if (res.isSuccess) {
      items.setData(null);
      await items.reload();
      await categories.reload();
      closeDialog();
    } else {
      setErrorMsg(res.detail || res.title);
    }
    setSaving(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !draft) return;
    setUploading(true);
    setErrorMsg(null);
    try {
      const result = await uploadToCloudinary(file);
      setDraft({ ...draft, imageUrl: result.url });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Upload thất bại");
    }
    setUploading(false);
    e.target.value = "";
  };

  const toggleCategory = (categoryId: number) => {
    if (!draft) return;
    const existing = draft.categories.find(c => c.categoryId === categoryId);
    let next: ItemCategoryInput[];
    if (existing) {
      next = draft.categories.filter(c => c.categoryId !== categoryId);
      if (existing.isMain && next.length > 0) next[0] = { ...next[0], isMain: true };
    } else {
      const isFirst = draft.categories.length === 0;
      next = [...draft.categories, { categoryId, isMain: isFirst }];
    }
    setDraft({ ...draft, categories: next });
  };

  const setMain = (categoryId: number) => {
    if (!draft) return;
    setDraft({
      ...draft,
      categories: draft.categories.map(c => ({ ...c, isMain: c.categoryId === categoryId })),
    });
  };

  const setMainCategoryOnly = (categoryId: number) => {
    if (!draft) return;
    const subs = draft.categories.filter(c => !c.isMain && c.categoryId !== categoryId);
    setDraft({ ...draft, categories: [{ categoryId, isMain: true }, ...subs] });
  };

  const toggleSubCategory = (categoryId: number) => {
    if (!draft) return;
    if (draft.categories.find(c => c.categoryId === categoryId && c.isMain)) return;
    const existing = draft.categories.find(c => c.categoryId === categoryId);
    let next: ItemCategoryInput[];
    if (existing) {
      next = draft.categories.filter(c => c.categoryId !== categoryId);
    } else {
      next = [...draft.categories, { categoryId, isMain: false }];
    }
    setDraft({ ...draft, categories: next });
  };

  const closeCatDialog = () => {
    setCatDialogOpen(false);
    setCatDraft(null);
    setCatEditingId(null);
    setCatErrorMsg(null);
    setCatParentPickerOpen(false);
  };

  const openCatCreate = () => {
    setCatDraft({
      code: "",
      name: "",
      description: null,
      parentId: categoryFilter,
      displayOrder: 0,
      isActive: true,
    });
    setCatEditingId(null);
    setCatErrorMsg(null);
    setCatDialogOpen(true);
  };

  const openCatEdit = async () => {
    if (categoryFilter === null) return;
    setCatEditingId(categoryFilter);
    setCatErrorMsg(null);
    setCatDialogOpen(true);
    setCatDraft(null);
    const res = await categoriesApi.get(categoryFilter);
    if (res.isSuccess) {
      const c = res.data;
      setCatDraft({
        id: c.id,
        code: c.code,
        name: c.name,
        description: c.description,
        parentId: c.parentId,
        displayOrder: c.displayOrder,
        isActive: c.isActive,
      });
    } else {
      setCatErrorMsg(res.detail || res.title);
    }
  };

  const handleCatSave = async () => {
    if (!catDraft) return;
    setCatSaving(true);
    setCatErrorMsg(null);
    const body: CategoryUpsert = {
      code: catDraft.code.trim(),
      name: catDraft.name.trim(),
      description: catDraft.description?.trim() || null,
      parentId: catDraft.parentId,
      displayOrder: catDraft.displayOrder,
      isActive: catDraft.isActive,
    };
    const res = catEditingId
      ? await categoriesApi.update(catEditingId, body)
      : await categoriesApi.create(body);
    if (res.isSuccess) {
      await categories.reload();
      closeCatDialog();
    } else {
      setCatErrorMsg(res.detail || res.title);
    }
    setCatSaving(false);
  };

  const handleCatDelete = async () => {
    if (categoryFilter === null) return;
    const cat = categoryList.find(c => c.id === categoryFilter);
    if (!cat) return;
    if (!window.confirm(`Xoá nhóm "${cat.name}"?`)) return;
    setCatSaving(true);
    const res = await categoriesApi.remove(categoryFilter);
    if (res.isSuccess) {
      setCategoryFilter(null);
      items.setData(null);
      await categories.reload();
      await items.reload();
    } else {
      setCatErrorMsg(res.detail || res.title);
      window.alert(res.detail || res.title);
    }
    setCatSaving(false);
  };

  const mainCategoryId = draft?.categories.find(c => c.isMain)?.categoryId ?? null;

  const itemTabs = useMemo(() => {
    const tabs = [
      { id: "info", label: "Thông tin" },
      { id: "image", label: "Hình ảnh" },
      { id: "subcat", label: "Nhóm phụ" },
    ];
    if (editingId && draft?.isStockable) {
      tabs.push({ id: "uom-conv", label: "Quy đổi đơn vị" });
    }
    if (editingId && draft?.hasRecipe) {
      tabs.push({ id: "bom", label: "Công thức (BOM)" });
    }
    return tabs;
  }, [editingId, draft?.isStockable, draft?.hasRecipe]);

  return (
    <>
      <WinToolbar
        left={
          <>
            <TB
              icon={ChromeIcons.Plus}
              onClick={openCreate}
              disabled={categoryFilter === null}
            >
              Tạo mới Item
            </TB>
            <TB
              icon={ChromeIcons.Refresh}
              onClick={() => {
                items.reload();
                categories.reload();
              }}
            >
              Làm mới
            </TB>
            {categoryFilter === null && (
              <span style={{ fontSize: 11, color: "var(--fg-muted)", marginLeft: 8 }}>
                Chọn 1 nhóm bên trái để tạo Item
              </span>
            )}
          </>
        }
        right={<TB icon={ChromeIcons.Help}>Trợ giúp</TB>}
      />

      <div className="win-body" style={{ display: "flex" }}>
        <div
          style={{
            width: 260,
            borderRight: "1px solid var(--border)",
            padding: 8,
            background: "#fafafa",
            overflowY: "auto",
          }}
        >
          <h4
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--fg-muted)",
              margin: "4px 8px 8px",
            }}
          >
            Danh mục
          </h4>
          <div style={{ display: "flex", gap: 4, padding: "0 8px 8px", borderBottom: "1px solid var(--border)", marginBottom: 8 }}>
            <button
              type="button"
              onClick={openCatCreate}
              title="Tạo nhóm mới (con của nhóm đang chọn, hoặc root)"
              style={{ flex: 1, padding: "4px 6px", fontSize: 11, border: "1px solid var(--border-strong)", borderRadius: 4, background: "#fff", cursor: "pointer" }}
            >
              + Tạo
            </button>
            <button
              type="button"
              onClick={openCatEdit}
              disabled={categoryFilter === null}
              title="Sửa nhóm đang chọn"
              style={{ flex: 1, padding: "4px 6px", fontSize: 11, border: "1px solid var(--border-strong)", borderRadius: 4, background: categoryFilter === null ? "#f4f4f5" : "#fff", cursor: categoryFilter === null ? "not-allowed" : "pointer", opacity: categoryFilter === null ? 0.5 : 1 }}
            >
              Sửa
            </button>
            <button
              type="button"
              onClick={handleCatDelete}
              disabled={categoryFilter === null || catSaving}
              title="Xoá nhóm đang chọn"
              style={{ flex: 1, padding: "4px 6px", fontSize: 11, border: "1px solid var(--border-strong)", borderRadius: 4, background: categoryFilter === null ? "#f4f4f5" : "#fff", cursor: categoryFilter === null ? "not-allowed" : "pointer", opacity: categoryFilter === null ? 0.5 : 1, color: "var(--danger)" }}
            >
              Xoá
            </button>
          </div>
          {categories.loading && <LoadingBar text="Đang tải..." />}
          {treeReady && (
            <TreeViewComponent
              key={`tree-${categoryList.length}`}
              fields={treeFields}
              nodeSelected={handleTreeSelect}
              nodeTemplate={renderTreeNode}
            />
          )}
        </div>

        <div className="data-list" style={{ flex: 1 }}>
          {items.loading && <LoadingBar text="Đang tải Item..." />}
          {items.isOffline && <OfflineBar onRetry={() => items.reload()} />}
          {items.isApiError && <ErrorBar text={items.error ?? ""} onRetry={() => items.reload()} />}
          <GridComponent
            key={items.data ? `loaded-${categoryFilter ?? "all"}-${pageNumber}` : "loading"}
            dataSource={itemList}
            allowSorting
            allowPaging
            allowFiltering
            filterSettings={{ type: "Menu" }}
            pageSettings={{
              pageSize: PAGE_SIZE,
              currentPage: pageNumber,
              totalRecordsCount: totalCount,
            }}
            actionBegin={(args: { requestType?: string; currentPage?: number; cancel?: boolean }) => {
              if (args.requestType === "paging" && typeof args.currentPage === "number") {
                setPageNumber(args.currentPage);
              }
            }}
            rowSelected={handleRowSelected}
            height="100%"
          >
            <ColumnsDirective>
              <ColumnDirective field="id" headerText="ID" width="70" textAlign="Right" />
              <ColumnDirective field="code" headerText="Mã" width="120" />
              <ColumnDirective field="name" headerText="Tên" width="240" />
              <ColumnDirective field="primaryCategoryName" headerText="Danh mục chính" width="180" />
              <ColumnDirective field="baseUomCode" headerText="ĐVT" width="80" />
              <ColumnDirective field="vatPercent" headerText="VAT %" width="80" textAlign="Right" />
              <ColumnDirective field="isStockable" headerText="Quản kho" width="100" displayAsCheckBox />
              <ColumnDirective field="isActive" headerText="Kích hoạt" width="100" displayAsCheckBox />
            </ColumnsDirective>
            <Inject services={[Page, Sort, Filter]} />
          </GridComponent>
        </div>
      </div>

      <StatusBar
        left={
          <>
            <span>{totalCount} Item · trang {pageNumber}/{Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}</span>
            <span>·</span>
            <span>{categoryList.length} Danh mục</span>
            {categoryFilter !== null && (
              <>
                <span>·</span>
                <span>Lọc: {categoryList.find(c => c.id === categoryFilter)?.name}</span>
              </>
            )}
          </>
        }
        right={<span>Click Item để xem/sửa</span>}
      />

      <DialogComponent
        visible={dialogOpen}
        header={editingId ? "Sửa Item" : "Tạo Item mới"}
        showCloseIcon
        isModal
        width="760px"
        beforeClose={closeDialog}
        animationSettings={{ effect: "Zoom" }}
      >
        {!draft ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--fg-muted)" }}>Đang tải...</div>
        ) : (
          <div style={{ padding: 8 }}>
            <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)", marginBottom: 8 }}>
              {itemTabs.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedTab(tab.id)}
                  style={{
                    padding: "8px 16px",
                    fontSize: 13,
                    background: "transparent",
                    border: 0,
                    borderBottom: selectedTab === tab.id ? "2px solid var(--accent)" : "2px solid transparent",
                    color: selectedTab === tab.id ? "var(--accent)" : "var(--fg)",
                    fontWeight: selectedTab === tab.id ? 600 : 400,
                    cursor: "pointer",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div style={{ display: selectedTab === "info" ? "block" : "none" }}>
              {renderInfoTab(draft, setDraft, uomList, stationList, categoryListDfs, mainCategoryId, setMainCategoryOnly)}
            </div>
            <div style={{ display: selectedTab === "image" ? "block" : "none" }}>
              {renderImageTab(draft, setDraft, uploading, handleFileUpload)}
            </div>
            <div style={{ display: selectedTab === "subcat" ? "block" : "none" }}>
              {renderSubCategoryTab(draft, categoryListDfs, mainCategoryId, toggleSubCategory)}
            </div>
            {editingId && draft.isStockable && (
              <div style={{ display: selectedTab === "uom-conv" ? "block" : "none" }}>
                <ItemUomConversionTab itemId={editingId} baseUomId={draft.baseUomId} uomList={uomList} />
              </div>
            )}
            {editingId && draft.hasRecipe && (
              <div style={{ display: selectedTab === "bom" ? "block" : "none" }}>
                <ItemBomTab itemId={editingId} />
              </div>
            )}

            {errorMsg && (
              <div style={{ padding: "8px 12px", color: "var(--danger)", fontSize: 12 }}>{errorMsg}</div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 12,
                padding: "8px 12px",
                borderTop: "1px solid var(--border)",
              }}
            >
              {editingId && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  style={{
                    padding: "8px 16px",
                    background: "var(--danger)",
                    color: "#fff",
                    border: 0,
                    borderRadius: 4,
                    fontSize: 13,
                  }}
                >
                  Xoá
                </button>
              )}
              <button
                type="button"
                onClick={closeDialog}
                disabled={saving}
                style={{
                  padding: "8px 16px",
                  background: "#fff",
                  border: "1px solid var(--border-strong)",
                  borderRadius: 4,
                  fontSize: 13,
                }}
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: "8px 16px",
                  background: "var(--accent)",
                  color: "#fff",
                  border: 0,
                  borderRadius: 4,
                  fontSize: 13,
                }}
              >
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        )}
      </DialogComponent>

      <DialogComponent
        visible={catDialogOpen}
        header={catEditingId ? "Sửa nhóm" : "Tạo nhóm mới"}
        showCloseIcon
        isModal
        width="520px"
        beforeClose={closeCatDialog}
        animationSettings={{ effect: "Zoom" }}
      >
        {!catDraft ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--fg-muted)" }}>Đang tải...</div>
        ) : (
          <div style={{ padding: 16 }}>
            <Field label="Mã" required>
              <input value={catDraft.code} onChange={e => setCatDraft({ ...catDraft, code: e.target.value })} />
            </Field>
            <Field label="Tên" required>
              <input value={catDraft.name} onChange={e => setCatDraft({ ...catDraft, name: e.target.value })} />
            </Field>
            <Field label="Mô tả">
              <textarea
                rows={2}
                value={catDraft.description ?? ""}
                onChange={e => setCatDraft({ ...catDraft, description: e.target.value || null })}
              />
            </Field>
            <Field label="Nhóm cha">
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setCatParentPickerOpen(v => !v)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "6px 10px",
                    fontSize: 13,
                    border: "1px solid var(--border-strong)",
                    borderRadius: 4,
                    background: "#fff",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>
                    {catDraft.parentId === null
                      ? "(Root — không có cha)"
                      : categoryList.find(c => c.id === catDraft.parentId)?.name ?? "(Chọn nhóm cha)"}
                  </span>
                  <span style={{ opacity: 0.5, fontSize: 11 }}>{catParentPickerOpen ? "▲" : "▼"}</span>
                </button>
                {catParentPickerOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      marginTop: 2,
                      maxHeight: 240,
                      overflowY: "auto",
                      border: "1px solid var(--border-strong)",
                      borderRadius: 4,
                      padding: 4,
                      background: "#fff",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      zIndex: 10,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setCatDraft({ ...catDraft, parentId: null });
                        setCatParentPickerOpen(false);
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "4px 8px",
                        fontSize: 13,
                        fontWeight: 600,
                        background: catDraft.parentId === null ? "var(--accent)" : "transparent",
                        color: catDraft.parentId === null ? "#fff" : "var(--fg)",
                        border: 0,
                        borderRadius: 4,
                        cursor: "pointer",
                        marginBottom: 2,
                      }}
                    >
                      (Root — không có cha)
                    </button>
                    {categoryListDfs
                      .filter(c => c.id !== catEditingId)
                      .map(c => {
                        const isSelected = catDraft.parentId === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setCatDraft({ ...catDraft, parentId: c.id });
                              setCatParentPickerOpen(false);
                            }}
                            style={{
                              display: "block",
                              width: "100%",
                              textAlign: "left",
                              padding: "4px 8px",
                              paddingLeft: 12 + c.level * 14,
                              fontSize: 13,
                              background: isSelected ? "var(--accent)" : "transparent",
                              color: isSelected ? "#fff" : "var(--fg)",
                              border: 0,
                              borderRadius: 4,
                              cursor: "pointer",
                            }}
                          >
                            {c.name}
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            </Field>
            <Field label="Thứ tự hiển thị">
              <input
                type="number"
                min={0}
                value={catDraft.displayOrder}
                onChange={e => setCatDraft({ ...catDraft, displayOrder: Math.max(0, Number(e.target.value)) })}
              />
            </Field>
            <Field label="Kích hoạt">
              <input
                type="checkbox"
                checked={catDraft.isActive}
                onChange={e => setCatDraft({ ...catDraft, isActive: e.target.checked })}
              />
            </Field>
            {catErrorMsg && (
              <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 8 }}>{catErrorMsg}</div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
              <button
                type="button"
                onClick={closeCatDialog}
                disabled={catSaving}
                style={{ padding: "8px 16px", background: "#fff", border: "1px solid var(--border-strong)", borderRadius: 4, fontSize: 13 }}
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={handleCatSave}
                disabled={catSaving}
                style={{ padding: "8px 16px", background: "var(--accent)", color: "#fff", border: 0, borderRadius: 4, fontSize: 13 }}
              >
                {catSaving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        )}
      </DialogComponent>
    </>
  );
}
