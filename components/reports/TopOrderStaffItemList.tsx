"use client";

import { useRef, type KeyboardEvent } from "react";
import {
  itemInsightKey,
  type TopOrderStaffFilter,
  type TopOrderStaffInsight,
  type TopOrderStaffSort,
} from "./topOrderStaffInsights";

const STATUS_LABEL = {
  REFUND_REVIEW: "Cần kiểm tra hoàn món",
  NO_POSITIVE_QUANTITY: "Không có sản lượng dương",
  LOW_SAMPLE: "Ít dữ liệu",
  HIGH_CONCENTRATION: "Tập trung cao",
  BROAD_DISTRIBUTION: "Phân bổ rộng",
  MODERATE_DISTRIBUTION: "Phân bổ vừa",
} as const;

interface Props {
  items: readonly TopOrderStaffInsight[];
  selectedKey: string | null;
  query: string;
  sort: TopOrderStaffSort;
  filter: TopOrderStaffFilter;
  onQueryChange(value: string): void;
  onSortChange(value: TopOrderStaffSort): void;
  onFilterChange(value: TopOrderStaffFilter): void;
  onSelect(key: string): void;
}

const FILTERS: ReadonlyArray<{ value: TopOrderStaffFilter; label: string }> = [
  { value: "ALL", label: "Tất cả" },
  { value: "TRAINING", label: "Gợi ý đào tạo chéo" },
  { value: "LOW_SAMPLE", label: "Ít dữ liệu" },
  { value: "REFUND_REVIEW", label: "Hoàn món" },
];

export function TopOrderStaffItemList({
  items,
  selectedKey,
  query,
  sort,
  filter,
  onQueryChange,
  onSortChange,
  onFilterChange,
  onSelect,
}: Props) {
  const itemListRef = useRef<HTMLDivElement>(null);

  const handleItemKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;

    const sibling = items[index + (event.key === "ArrowUp" ? -1 : 1)];
    if (!sibling) return;

    event.preventDefault();
    const nextKey = itemInsightKey(sibling);
    onSelect(nextKey);
    itemListRef.current?.querySelectorAll<HTMLButtonElement>("[data-item-key]").forEach((button) => {
      if (button.dataset.itemKey === nextKey) button.focus();
    });
  };

  return (
    <section className="flex min-h-0 flex-col gap-3" aria-label="Danh sách món">
      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Tìm tên hoặc mã món"
          aria-label="Tìm món"
          className="min-w-48 flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
        <select
          value={sort}
          onChange={(event) => onSortChange(event.target.value as TopOrderStaffSort)}
          aria-label="Sắp xếp món"
          className="rounded border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="QUANTITY_DESC">Sản lượng giảm dần</option>
          <option value="CONCENTRATION_DESC">Tập trung giảm dần</option>
          <option value="NAME_ASC">Tên món A-Z</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc món">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => onFilterChange(value)}
            className={`rounded border px-2 py-1 text-sm ${filter === value ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 hover:bg-gray-50"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div ref={itemListRef} className="min-h-0 overflow-auto border border-gray-200 rounded">
        {items.map((insight, index) => {
          const key = itemInsightKey(insight);
          const top1 = insight.positiveStaff[0];
          return (
            <button
              key={key}
              type="button"
              data-item-key={key}
              aria-pressed={selectedKey === key}
              onClick={() => onSelect(key)}
              onKeyDown={(event) => handleItemKeyDown(event, index)}
              className={`block w-full border-b border-gray-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-gray-50 ${selectedKey === key ? "bg-blue-50" : ""}`}
            >
              <span className="block font-medium text-gray-900">{insight.item.itemName}</span>
              <span className="block text-xs text-gray-600">
                {insight.item.itemCode} · {insight.item.totalQuantity}/{insight.item.uomCode}
              </span>
              <span className="block text-xs text-gray-600">
                Top 1: {top1 ? `${top1.staffName} · ${top1.percentageOfItemQuantity}%` : "—"}
              </span>
              <span className="block text-xs text-gray-600">{STATUS_LABEL[insight.status]}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
