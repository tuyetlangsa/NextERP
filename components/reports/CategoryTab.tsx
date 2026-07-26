"use client";

import { useEffect } from "react";
import { useResource } from "@/lib/http/useResource";
import { reportsApi } from "@/lib/api/reports";
import {
  AccumulationChartComponent,
  AccumulationSeriesCollectionDirective,
  AccumulationSeriesDirective,
  Inject,
  PieSeries,
  AccumulationLegend,
  AccumulationTooltip,
} from "@syncfusion/ej2-react-charts";
import type { CategoryReportRow } from "@/types/api/reports";

function fmt(n: number): string {
  return n.toLocaleString("vi-VN");
}

export function CategoryTab({
  filters,
  onLoading,
  onError,
}: {
  filters: Record<string, unknown>;
  onLoading: (v: boolean) => void;
  onError: (e: string | null) => void;
}) {
  const categories = useResource(
    () => reportsApi.categories(filters as Record<string, unknown>),
    { deps: [filters] },
  );

  useEffect(() => {
    onLoading(categories.loading);
  }, [categories.loading, onLoading]);

  useEffect(() => {
    onError(categories.error);
  }, [categories.error, onError]);

  const data = categories.data;

  if (!data) return null;

  const isEmpty = data.length === 0;

  return (
    <div className="p-4 space-y-4">
      {isEmpty ? (
        <div className="text-center text-gray-400 py-12">
          Không có dữ liệu
        </div>
      ) : (
        <>
          {/* Pie chart */}
          <div className="max-w-md mx-auto">
            <AccumulationChartComponent
              title="Doanh thu theo danh mục"
              legendSettings={{ visible: true }}
              enableSmartLabels={true}
              tooltip={{
                enable: true,
                format: "${point.x}: <b>${point.y}</b>",
              }}
            >
              <Inject
                services={[PieSeries, AccumulationLegend, AccumulationTooltip]}
              />
              <AccumulationSeriesCollectionDirective>
                <AccumulationSeriesDirective
                  dataSource={data}
                  xName="categoryName"
                  yName="totalRevenue"
                  type="Pie"
                  explode={false}
                  dataLabel={{
                    visible: true,
                    position: "Outside",
                    format: "{point.x}",
                  }}
                />
              </AccumulationSeriesCollectionDirective>
            </AccumulationChartComponent>
          </div>

          {/* Data table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 text-gray-600">
                  <th className="px-4 py-2 text-left">Danh mục</th>
                  <th className="px-4 py-2 text-right">SL bán</th>
                  <th className="px-4 py-2 text-right">Doanh thu</th>
                  <th className="px-4 py-2 text-right">Giảm giá</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr
                    key={row.categoryId}
                    className="border-t border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-2 text-gray-900">
                      {row.categoryName}
                      {row.parentCategoryName && (
                        <span className="text-gray-400 text-xs ml-2">
                          ({row.parentCategoryName})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-900">
                      {fmt(row.totalQuantity)}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-900 font-medium">
                      {fmt(row.totalRevenue)}đ
                    </td>
                    <td className="px-4 py-2 text-right text-red-500">
                      {fmt(row.totalDiscount)}đ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
