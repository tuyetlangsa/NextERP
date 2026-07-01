"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useResource } from "@/lib/http/useResource";
import { reportsApi } from "@/lib/api/reports";
import { ReportSummaryCards } from "@/components/reports/ReportSummaryCards";
import type { MetricCard } from "@/components/reports/ReportSummaryCards";
import type { ItemSalesDetailResponse } from "@/types/api/reports";

function fmt(n: number): string {
  return n.toLocaleString("vi-VN");
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month} ${hours}:${minutes}`;
}

export function ItemSalesDetailTab({
  filters,
  ticketId,
  onLoading,
  onError,
}: {
  filters: Record<string, unknown>;
  ticketId?: number;
  onLoading: (v: boolean) => void;
  onError: (e: string | null) => void;
}) {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const itemSalesDetail = useResource(
    () =>
      reportsApi.itemSalesDetail({
        ...(filters as Record<string, unknown>),
        ticketId,
        pageNumber: page,
        pageSize,
      }),
    { deps: [filters, ticketId, page] },
  );

  useEffect(() => {
    onLoading(itemSalesDetail.loading);
  }, [itemSalesDetail.loading, onLoading]);

  useEffect(() => {
    onError(itemSalesDetail.error);
  }, [itemSalesDetail.error, onError]);

  const data = itemSalesDetail.data;

  const [expandKey, setExpandKey] = useState(0);
  const [allExpanded, setAllExpanded] = useState(false);

  const toggleAll = useCallback(() => {
    setAllExpanded((prev) => !prev);
    setExpandKey((prev) => prev + 1);
  }, []);

  const handlePrevPage = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setPage((p) => p + 1);
  }, []);

  if (!data) return null;

  const totalPages = Math.ceil(data.totalCount / pageSize);
  const isEmpty = !data.bills || data.bills.length === 0;

  const cards: MetricCard[] = useMemo(
    () => [
      { label: "Tổng hóa đơn", value: fmt(data.summary.totalBills) },
      { label: "Mặt hàng đã bán", value: fmt(data.summary.totalItems) },
      { label: "Tổng doanh thu", value: fmt(data.summary.totalRevenue) + "đ" },
    ],
    [data],
  );

  return (
    <div className="p-4 space-y-4">
      <ReportSummaryCards cards={cards} />

      <div className="flex items-center justify-between">
        <button
          onClick={toggleAll}
          className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
        >
          {allExpanded ? "Thu gọn tất cả" : "Mở rộng tất cả"}
        </button>
        <span className="text-sm text-gray-500">
          {fmt(data.totalCount)} hóa đơn
        </span>
      </div>

      {isEmpty ? (
        <div className="text-center text-gray-400 py-12">
          Không có dữ liệu
        </div>
      ) : (
        <div className="space-y-3">
          {data.bills.map((bill) => (
            <details
              key={`${bill.ticketId}-${expandKey}`}
              {...({ defaultOpen: allExpanded || bill.ticketId === ticketId } as any)}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <summary className="flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 cursor-pointer text-sm">
                <span className="font-medium text-gray-900 min-w-[120px]">
                  {bill.ticketCode}
                </span>
                <span className="text-gray-600 min-w-[80px]">
                  {bill.tableCode}
                </span>
                <span className="text-gray-500 min-w-[110px]">
                  {formatDateTime(bill.closedAt)}
                </span>
                <span className="text-gray-600 min-w-[100px]">
                  {bill.waiterName ?? "—"}
                </span>
                <span className="text-gray-600 min-w-[60px]">
                  {bill.guestCount} khách
                </span>
                <span className="ml-auto text-gray-700 font-medium">
                  {fmt(bill.subtotal)}đ
                </span>
                <span className="text-red-500 min-w-[80px] text-right">
                  -{fmt(bill.discountAmount)}đ
                </span>
                <span className="text-gray-900 font-semibold min-w-[100px] text-right">
                  {fmt(bill.totalAmount)}đ
                </span>
              </summary>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 text-gray-600">
                      <th className="px-3 py-2 text-left w-12">STT</th>
                      <th className="px-3 py-2 text-left">Mã MH</th>
                      <th className="px-3 py-2 text-left">Tên mặt hàng</th>
                      <th className="px-3 py-2 text-left">ĐVT</th>
                      <th className="px-3 py-2 text-right">SL</th>
                      <th className="px-3 py-2 text-right">Đơn giá</th>
                      <th className="px-3 py-2 text-right">Tiền hàng</th>
                      <th className="px-3 py-2 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bill.items.map((item, idx) => (
                      <tr
                        key={item.rowNumber}
                        className="border-t border-gray-100 hover:bg-gray-50"
                      >
                        <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                        <td className="px-3 py-2 text-gray-700 font-mono text-xs">
                          {item.itemCode}
                        </td>
                        <td className="px-3 py-2 text-gray-900">
                          {item.itemName}
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {item.uomCode}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-900">
                          {fmt(item.quantity)}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700">
                          {fmt(item.unitPrice)}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700">
                          {fmt(item.lineSubtotal)}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-900 font-medium">
                          {fmt(item.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data.totalCount > pageSize && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={handlePrevPage}
            disabled={page <= 1}
            className="px-3 py-1 text-sm border rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 cursor-pointer"
          >
            {"<"} Trước
          </button>
          <span className="text-sm text-gray-600">
            Trang {page} / {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={page >= totalPages}
            className="px-3 py-1 text-sm border rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 cursor-pointer"
          >
            Sau {">"}
          </button>
        </div>
      )}
    </div>
  );
}
