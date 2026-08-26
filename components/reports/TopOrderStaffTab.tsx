"use client";

import { useEffect, useMemo, useState } from "react";
import { useResource } from "@/lib/http/useResource";
import { reportsApi } from "@/lib/api/reports";
import { AnalyzeButton } from "@/components/reports/AnalyzeButton";
import {
  itemInsightKey,
  nextSelectedInsightKey,
  selectTopOrderStaffInsights,
  type TopOrderStaffFilter,
  type TopOrderStaffSort,
} from "@/components/reports/topOrderStaffInsights";
import { TopOrderStaffItemList } from "@/components/reports/TopOrderStaffItemList";
import { TopOrderStaffDetail } from "@/components/reports/TopOrderStaffDetail";

export function TopOrderStaffTab({
  filters,
  onLoading,
  onError,
}: {
  filters: Record<string, unknown>;
  onLoading: (value: boolean) => void;
  onError: (error: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<TopOrderStaffSort>("QUANTITY_DESC");
  const [filter, setFilter] = useState<TopOrderStaffFilter>("ALL");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const result = useResource(
    () => reportsApi.topOrderStaffByItem(filters as any),
    { deps: [filters] },
  );

  useEffect(() => {
    onLoading(result.loading);
  }, [result.loading, onLoading]);

  useEffect(() => {
    onError(result.error);
  }, [result.error, onError]);

  const insights = useMemo(
    () => selectTopOrderStaffInsights(result.data ?? [], { query, sort, filter }),
    [result.data, query, sort, filter],
  );
  const resolvedKey = nextSelectedInsightKey(insights, selectedKey);
  const selected = insights.find((insight) => itemInsightKey(insight) === resolvedKey) ?? null;

  useEffect(() => {
    if (resolvedKey !== selectedKey) setSelectedKey(resolvedKey);
  }, [resolvedKey, selectedKey]);

  if (result.data === null) return null;

  const data = result.data;

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-end px-1 pb-2">
        <AnalyzeButton reportName="Top nhân viên theo món" data={data} />
      </div>

      <p className="px-1 pb-3 text-sm text-gray-600">
        Sản lượng thuần là số lượng ròng có gán nhân viên tạo order, gồm cả hoàn món không bị huỷ
        nên có thể âm. Chỉ đối chiếu với tab Món hàng khi không có order cũ thiếu người tạo; nếu
        lọc Quầy/Khu, dữ liệu phiếu phải trùng snapshot hoá đơn. Tổng tỷ lệ top 3 có thể không bằng
        100% vì còn nhân viên khác hoặc có hoàn món.
      </p>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-400">
          Không có dữ liệu
        </div>
      ) : (
        <div className="grid min-h-[420px] flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(300px,2fr)_minmax(420px,3fr)]">
          <TopOrderStaffItemList
            items={insights}
            selectedKey={resolvedKey}
            query={query}
            sort={sort}
            filter={filter}
            onQueryChange={setQuery}
            onSortChange={setSort}
            onFilterChange={setFilter}
            onSelect={setSelectedKey}
          />
          <TopOrderStaffDetail insight={selected} />
        </div>
      )}
    </div>
  );
}
