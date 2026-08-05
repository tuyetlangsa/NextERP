"use client";

import { Fragment, useEffect } from "react";
import { useResource } from "@/lib/http/useResource";
import { reportsApi } from "@/lib/api/reports";
import type { RevenueResponse } from "@/types/api/reports";
import { AnalyzeButton } from "@/components/reports/AnalyzeButton";

function money(n: number): string {
  return n.toLocaleString("vi-VN") + "đ";
}
function num(n: number): string {
  return n.toLocaleString("vi-VN");
}
function dec(n: number): string {
  return n.toLocaleString("vi-VN", { maximumFractionDigits: 1 });
}
function pct(n: number): string {
  return n.toFixed(1) + "%";
}
function signedPct(n: number): string {
  return (n >= 0 ? "+" : "") + pct(n);
}

/** "up" → value shown under "Phát sinh tăng"; "down" → under "Phát sinh giảm". */
type Direction = "up" | "down";

interface SummaryRow {
  label: string;
  value: string;
  dir: Direction;
  desc: string;
}
interface SummarySection {
  title: string;
  rows: SummaryRow[];
}

/**
 * Every backend revenue metric arranged as a ledger-style table. Only real
 * reductions (total discount, cash-out vouchers) sit in the "Phát sinh giảm"
 * column; everything else — money, counts, ratios, durations — goes in the
 * "Phát sinh tăng" value column (that column is not money-only).
 */
function buildSummary(d: RevenueResponse): SummarySection[] {
  return [
    {
      title: "A. Doanh thu",
      rows: [
        { label: "Tổng doanh thu", value: money(d.totalRevenue), dir: "up", desc: "Tổng tiền các hóa đơn đã đóng (sau giảm giá, phí phục vụ, VAT)" },
        { label: "Tổng tạm tính", value: money(d.totalSubtotal), dir: "up", desc: "Tổng tiền hàng trước giảm giá, phí phục vụ, VAT" },
        { label: "Tổng giảm giá", value: money(d.totalDiscount), dir: "down", desc: "Tổng số tiền đã giảm cho khách" },
        { label: "Tổng phí phục vụ", value: money(d.totalServiceCharge), dir: "up", desc: "Tổng phí phục vụ thu thêm trên hóa đơn" },
        { label: "Tổng thuế VAT", value: money(d.totalVat), dir: "up", desc: "Tổng thuế giá trị gia tăng" },
        { label: "Chênh lệch làm tròn", value: money(d.totalRoundingAdjustment), dir: "up", desc: "Chênh lệch phát sinh do làm tròn tổng hóa đơn" },
        { label: "Trung bình / hóa đơn", value: money(d.averageBill), dir: "up", desc: "Doanh thu trung bình mỗi hóa đơn" },
        { label: "Doanh thu / khách", value: money(d.revenuePerGuest), dir: "up", desc: "Doanh thu trung bình mỗi khách" },
        { label: "Doanh thu / giờ", value: money(d.revenuePerHour), dir: "up", desc: "Doanh thu trung bình mỗi giờ trong khoảng lọc" },
      ],
    },
    {
      title: "B. Sản lượng",
      rows: [
        { label: "Tổng hóa đơn", value: num(d.billCount), dir: "up", desc: "Số hóa đơn đã đóng trong kỳ" },
        { label: "Tổng số khách", value: num(d.totalGuests), dir: "up", desc: "Tổng số khách trên các hóa đơn" },
        { label: "Tổng số món bán", value: dec(d.totalItemsSold), dir: "up", desc: "Tổng số lượng món đã bán" },
        { label: "Số món trung bình / hóa đơn", value: dec(d.averageItemsPerBill), dir: "up", desc: "Số món trung bình mỗi hóa đơn" },
        { label: "Số khách trung bình / hóa đơn", value: dec(d.averageGuestsPerBill), dir: "up", desc: "Số khách trung bình mỗi hóa đơn" },
      ],
    },
    {
      title: "C. Giảm giá",
      rows: [
        { label: "Số hóa đơn có giảm giá", value: num(d.discountedBillCount), dir: "up", desc: "Số hóa đơn được áp dụng giảm giá" },
        { label: "Tỉ lệ hóa đơn được giảm", value: pct(d.discountRate), dir: "up", desc: "Tỉ lệ hóa đơn có giảm giá trên tổng hóa đơn" },
        { label: "Giảm giá trung bình / hóa đơn được giảm", value: money(d.averageDiscountPerDiscountedBill), dir: "up", desc: "Số tiền giảm trung bình trên mỗi hóa đơn có giảm" },
        { label: "% giảm trên tạm tính", value: pct(d.totalDiscountPercent), dir: "up", desc: "Tổng giảm giá chia cho tổng tạm tính" },
      ],
    },
    {
      title: "D. Thanh toán",
      rows: [
        { label: "Tiền mặt", value: money(d.cashAmount), dir: "up", desc: "Tiền khách thanh toán bằng tiền mặt" },
        { label: "QR", value: money(d.qrAmount), dir: "up", desc: "Tiền khách thanh toán bằng QR / chuyển khoản" },
        { label: "Tỉ lệ tiền mặt", value: pct(d.cashRate), dir: "up", desc: "Tỉ lệ tiền mặt trên tổng đã thu" },
        { label: "Tỉ lệ QR", value: pct(d.qrRate), dir: "up", desc: "Tỉ lệ QR trên tổng đã thu" },
        { label: "Tổng đã thu", value: money(d.totalPaidAmount), dir: "up", desc: "Tổng tiền đã thu từ khách" },
        { label: "Số lần thanh toán trung bình / hóa đơn", value: dec(d.averagePaymentCountPerBill), dir: "up", desc: "Số lần thanh toán trung bình mỗi hóa đơn" },
        { label: "Chênh lệch (đã thu − doanh thu)", value: money(d.paidVsRevenueDelta), dir: "up", desc: "Chênh lệch giữa tiền đã thu và doanh thu" },
      ],
    },
    {
      title: "E. Vận hành",
      rows: [
        { label: "Thời gian phục vụ trung bình (phút)", value: dec(d.averageServiceDurationMinutes), dir: "up", desc: "Thời gian trung bình từ mở đến đóng hóa đơn" },
        { label: "Số món bị hủy", value: num(d.cancelledItemCount), dir: "up", desc: "Số món bị hủy trong kỳ" },
        { label: "Tỉ lệ hủy món", value: pct(d.cancellationRate), dir: "up", desc: "Số lượng món hủy trên tổng (bán + hủy)" },
        { label: "Ticket đang mở", value: num(d.openTicketCount), dir: "up", desc: "Số ticket đang mở tại thời điểm xem" },
        { label: "Ticket đã hủy", value: num(d.cancelledTicketCount), dir: "up", desc: "Số ticket bị hủy trong kỳ" },
      ],
    },
    {
      title: "F. So sánh",
      rows: [
        { label: "Doanh thu kỳ trước", value: money(d.prevPeriodRevenue), dir: "up", desc: `Kỳ trước cùng độ dài — thay đổi ${signedPct(d.prevPeriodChangePct)}` },
        { label: "Doanh thu cùng thứ tuần trước", value: money(d.sameDowLastWeekRevenue), dir: "up", desc: `Cửa sổ lùi 7 ngày — thay đổi ${signedPct(d.sameDowChangePct)}` },
        { label: "Trung bình 30 ngày", value: money(d.thirtyDayAvgRevenue), dir: "up", desc: `So với trung bình 30 ngày — thay đổi ${signedPct(d.vsThirtyDayAvgPct)}` },
      ],
    },
    {
      title: "G. Phiếu thu / chi",
      rows: [
        { label: "Tổng thu", value: money(d.totalReceive), dir: "up", desc: "Tổng phiếu thu quỹ (ngoài bán hàng)" },
        { label: "Tổng chi", value: money(d.totalPayment), dir: "down", desc: "Tổng phiếu chi quỹ" },
      ],
    },
  ];
}

export function RevenueSummaryTab({
  filters,
  onLoading,
  onError,
}: {
  filters: Record<string, unknown>;
  onLoading: (v: boolean) => void;
  onError: (e: string | null) => void;
}) {
  const revenue = useResource(() => reportsApi.revenue(filters as never), {
    deps: [filters],
  });

  useEffect(() => {
    onLoading(revenue.loading);
  }, [revenue.loading, onLoading]);

  useEffect(() => {
    onError(revenue.error);
  }, [revenue.error, onError]);

  const data = revenue.data;
  if (!data) return null;

  const sections = buildSummary(data);

  return (
    <div className="p-4">
      <div className="flex justify-end pb-2">
        <AnalyzeButton reportName="Báo cáo doanh thu tổng thể" data={data} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100 text-gray-600">
              <th className="border border-gray-300 px-4 py-2 text-left font-medium">Chỉ tiêu</th>
              <th className="border border-gray-300 px-4 py-2 text-right font-medium w-40">Phát sinh tăng</th>
              <th className="border border-gray-300 px-4 py-2 text-right font-medium w-40">Phát sinh giảm</th>
              <th className="border border-gray-300 px-4 py-2 text-left font-medium">Mô tả</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => (
              <Fragment key={section.title}>
                <tr className="bg-gray-100">
                  <td
                    colSpan={4}
                    className="border border-gray-300 px-4 py-1.5 font-semibold text-gray-700"
                  >
                    {section.title}
                  </td>
                </tr>
                {section.rows.map((row) => (
                  <tr key={section.title + row.label} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-1.5 text-gray-700">{row.label}</td>
                    <td className="border border-gray-300 px-4 py-1.5 text-right font-medium text-gray-900 tabular-nums">
                      {row.dir === "up" ? row.value : ""}
                    </td>
                    <td className="border border-gray-300 px-4 py-1.5 text-right font-medium text-red-600 tabular-nums">
                      {row.dir === "down" ? row.value : ""}
                    </td>
                    <td className="border border-gray-300 px-4 py-1.5 text-gray-500">{row.desc}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
