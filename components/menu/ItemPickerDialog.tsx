"use client";

import { useEffect, useMemo, useState } from "react";
import { DialogComponent } from "@syncfusion/ej2-react-popups";
import { WinToolbar, TB } from "@/components/ui/WinToolbar";
import { ChromeIcons } from "@/components/desktop/icons";
import { itemsApi } from "@/lib/api/menu";
import { formatApiError } from "@/lib/http/formatError";
import { buildCategorySelectOptions } from "@/lib/menu/hangBan";
import type { Category, ItemListRow } from "@/types/api/menu";

const PAGE_SIZE = 50;

export function ItemPickerDialog({
  visible,
  title = "Tìm kiếm mặt hàng",
  hangBanCategoryId,
  categories = [],
  excludeItemIds = [],
  onClose,
  onSelect,
}: {
  visible: boolean;
  title?: string;
  hangBanCategoryId: number | null;
  categories?: Category[];
  excludeItemIds?: number[];
  onClose: () => void;
  onSelect: (item: ItemListRow) => void;
}) {
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [categoryFilterId, setCategoryFilterId] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [rows, setRows] = useState<ItemListRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const excludeKey =
    excludeItemIds.length === 0
      ? ""
      : [...excludeItemIds].sort((a, b) => a - b).join(",");
  const excludeSet = useMemo(() => new Set(excludeItemIds), [excludeKey]);

  const categoryOptions = useMemo(() => {
    if (hangBanCategoryId === null) return [];
    return buildCategorySelectOptions(categories, hangBanCategoryId);
  }, [categories, hangBanCategoryId]);

  const effectiveCategoryId = categoryFilterId ?? hangBanCategoryId;

  useEffect(() => {
    if (!visible) return;
    setSearchInput("");
    setAppliedSearch("");
    setCategoryFilterId(hangBanCategoryId);
    setPageNumber(1);
    setSelectedId(null);
    setErrorMsg(null);
  }, [visible, hangBanCategoryId]);

  useEffect(() => {
    if (!visible || effectiveCategoryId === null) {
      setRows([]);
      setTotalCount(0);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setErrorMsg(null);
      const res = await itemsApi.list({
        categoryId: effectiveCategoryId,
        isActive: true,
        search: appliedSearch.trim() || undefined,
        pageNumber,
        pageSize: PAGE_SIZE,
      });
      if (cancelled) return;
      if (res.isSuccess) {
        setRows(res.data.items.filter(i => !excludeSet.has(i.id)));
        setTotalCount(res.data.totalCount);
      } else {
        setRows([]);
        setTotalCount(0);
        setErrorMsg(formatApiError(res));
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, effectiveCategoryId, appliedSearch, pageNumber, excludeKey]);

  const runSearch = () => {
    setAppliedSearch(searchInput);
    setPageNumber(1);
    setSelectedId(null);
  };

  const selected = rows.find(r => r.id === selectedId) ?? null;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <DialogComponent
      visible={visible}
      header={title}
      showCloseIcon
      isModal
      width="820px"
      beforeClose={onClose}
      animationSettings={{ effect: "Zoom" }}
    >
      <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <WinToolbar
          left={
            <>
              <TB
                icon={ChromeIcons.Check}
                kind="primary"
                disabled={!selected}
                onClick={() => selected && onSelect(selected)}
              >
                Chấp nhận
              </TB>
              <TB icon={ChromeIcons.Close} onClick={onClose}>
                Bỏ qua
              </TB>
              <TB icon={ChromeIcons.Search} onClick={runSearch} disabled={effectiveCategoryId === null}>
                Tìm
              </TB>
            </>
          }
        />

        <div style={{ padding: 12 }}>
          {hangBanCategoryId === null ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--fg-muted)" }}>
              Không tìm thấy nhóm Hàng bán (HANG_BAN).
            </div>
          ) : (
            <>
              <div
                className="grid-filterbar"
                style={{ marginBottom: 8, border: "1px solid var(--border)", borderRadius: 4 }}
              >
                <div className="filter-group">
                  <label>Mã/tên:</label>
                  <input
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") runSearch();
                    }}
                    placeholder="Mã hoặc tên hàng..."
                  />
                </div>
                <div className="filter-group">
                  <label>Nhóm:</label>
                  <select
                    value={effectiveCategoryId ?? ""}
                    onChange={e => {
                      setCategoryFilterId(Number(e.target.value));
                      setPageNumber(1);
                      setSelectedId(null);
                    }}
                  >
                    {categoryOptions.map(opt => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }} />
                <span className="tb-help">{totalCount} món</span>
              </div>

              {loading && (
                <div style={{ padding: 12, fontSize: 12, color: "var(--fg-muted)" }}>Đang tải...</div>
              )}
              {errorMsg && (
                <div style={{ padding: 8, fontSize: 12, color: "var(--danger)", marginBottom: 8 }}>
                  {errorMsg}
                </div>
              )}

              <div
                className="dgrid-wrap"
                style={{ maxHeight: 380, border: "1px solid var(--border)", borderRadius: 4 }}
              >
                <table className="dgrid">
                  <thead>
                    <tr>
                      <th className="stt">#</th>
                      <th style={{ width: 120 }}>Mã hàng</th>
                      <th>Tên</th>
                      <th style={{ width: 90 }}>ĐVT</th>
                      <th style={{ width: 140 }}>Phân loại</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => (
                      <tr
                        key={r.id}
                        className={selectedId === r.id ? "selected" : ""}
                        onClick={() => setSelectedId(r.id)}
                        onDoubleClick={() => onSelect(r)}
                      >
                        <td className="stt">{idx + 1 + (pageNumber - 1) * PAGE_SIZE}</td>
                        <td className="mono">{r.code}</td>
                        <td>{r.name}</td>
                        <td>{r.baseUomCode}</td>
                        <td className="mute">{r.primaryCategoryName ?? "—"}</td>
                      </tr>
                    ))}
                    {!loading && rows.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", color: "var(--fg-muted)" }}>
                          Không có món phù hợp.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  disabled={pageNumber <= 1 || loading}
                  onClick={() => setPageNumber(p => p - 1)}
                  style={{ padding: "4px 10px", fontSize: 12 }}
                >
                  ‹
                </button>
                <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                  Trang {pageNumber}/{totalPages}
                </span>
                <button
                  type="button"
                  disabled={pageNumber >= totalPages || loading}
                  onClick={() => setPageNumber(p => p + 1)}
                  style={{ padding: "4px 10px", fontSize: 12 }}
                >
                  ›
                </button>
                <div style={{ flex: 1 }} />
                <span className="tb-help">Double-click hoặc Chấp nhận để chọn</span>
              </div>
            </>
          )}
        </div>
      </div>
    </DialogComponent>
  );
}
