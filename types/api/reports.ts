// types/api/reports.ts

// ─── Shared ───
export interface ReportFilter {
  fromDate?: string;
  toDate?: string;
  counterId?: number;
  areaId?: number;
  shiftId?: number;
  categoryId?: number;
}

// ─── Revenue Report (Tab 1) ───
export interface RevenueResponse {
  totalRevenue: number; totalSubtotal: number; totalDiscount: number;
  totalServiceCharge: number; totalVat: number; totalRoundingAdjustment: number;
  averageBill: number; revenuePerGuest: number; revenuePerHour: number;
  billCount: number; totalGuests: number; totalItemsSold: number;
  averageItemsPerBill: number; averageGuestsPerBill: number;
  discountedBillCount: number; discountRate: number;
  averageDiscountPerDiscountedBill: number; totalDiscountPercent: number;
  cashAmount: number; qrAmount: number; cashRate: number; qrRate: number;
  totalPaidAmount: number; averagePaymentCountPerBill: number;
  paidVsRevenueDelta: number;
  averageServiceDurationMinutes: number; cancelledItemCount: number;
  cancellationRate: number; refundAmount: number;
  openTicketCount: number; cancelledTicketCount: number;
  prevPeriodRevenue: number; prevPeriodChangePct: number;
  sameDowLastWeekRevenue: number; sameDowChangePct: number;
  thirtyDayAvgRevenue: number; vsThirtyDayAvgPct: number;
  breakdown: BreakdownRow[];
}

export interface BreakdownRow {
  label: string; totalRevenue: number; totalSubtotal: number;
  totalDiscount: number; totalServiceCharge: number; totalVat: number;
  averageBill: number; billCount: number; totalGuests: number;
  cashAmount: number; qrAmount: number; totalPaidAmount: number;
  averageServiceDurationMinutes: number;
}

// ─── Detailed Revenue (Tab 2) ───
export interface DetailedRevenueResponse {
  bills: BillRow[]; summary: BillSummary;
  pageNumber: number; pageSize: number; totalCount: number;
}
export interface BillRow {
  rowNumber: number; ticketId: number; ticketCode: string;
  closedAt: string; tableCode: string; areaName: string; counterName: string;
  shiftName: string; waiterName: string | null; closedByName: string | null;
  guestCount: number; itemCount: number;
  subtotal: number; discountAmount: number; serviceChargeAmount: number;
  vatAmount: number; totalAmount: number; paidAmount: number;
  refundAmount: number; status: string; cancellationReason: string | null;
  durationMinutes: number; paymentMethods: string;
}
export interface BillSummary {
  totalBills: number; totalRevenue: number; totalDiscount: number;
  totalPaid: number; averageBill: number;
}

// ─── Item Sales Detail (Tab 3) ───
export interface ItemSalesDetailResponse {
  bills: BillWithItems[]; summary: ItemSalesSummary;
  pageNumber: number; pageSize: number; totalCount: number;
}
export interface BillWithItems {
  rowNumber: number; ticketId: number; ticketCode: string;
  closedAt: string; tableCode: string; areaName: string;
  waiterName: string | null; guestCount: number;
  subtotal: number; discountAmount: number; serviceChargeAmount: number;
  totalAmount: number; paidAmount: number; status: string;
  items: BillItemRow[];
}
export interface BillItemRow {
  rowNumber: number; itemCode: string; itemName: string;
  uomCode: string; quantity: number; unitPrice: number;
  choicePricePerUnit: number; vatPercent: number;
  lineSubtotal: number; discountAmount: number;
  totalAmount: number; modifiers: string | null;
}
export interface ItemSalesSummary {
  totalBills: number; totalItems: number; totalQuantity: number;
  totalRevenue: number; totalDiscount: number; totalPaid: number;
}

// ─── Categories (Tab 4) ───
export interface CategoryReportRow {
  categoryId: number; categoryName: string; parentCategoryName: string | null;
  totalQuantity: number; totalRevenue: number; totalDiscount: number;
}

// ─── Items (Tab 5) ───
export interface ItemReportRow {
  itemId: number; itemCode: string; itemName: string;
  uomCode: string; totalQuantity: number; totalRevenue: number;
  totalDiscount: number; billCount: number;
}

// ─── Top Sellers (Tab 6) ───
export interface TopSellerRow {
  rank: number; itemId: number; itemCode: string; itemName: string;
  totalQuantity: number; totalRevenue: number; percentageOfTotal: number;
}

// ─── Shift (Tab 7) ───
export interface ShiftReportRow {
  cashDrawerSessionId: number; counterId: number; counterName: string;
  shiftId: number; shiftName: string;
  openedByStaffName: string | null; closedByStaffName: string | null;
  openedAt: string; closedAt: string | null;
  openingCash: number; expectedClosingCash: number | null;
  actualClosingCash: number | null; variance: number | null;
  totalBills: number; totalRevenue: number;
  cashRevenue: number; qrRevenue: number;
}

// ─── Ingredient Consumption (Tab 8) ───
export interface IngredientConsumptionRow {
  ingredientItemId: number; ingredientCode: string; ingredientName: string;
  baseUomCode: string; totalConsumedQty: number;
  currentStock: number; percentUsed: number;
}

// ─── Stock Alert (Tab 9) ───
export interface StockAlertRow {
  itemId: number; itemCode: string; itemName: string;
  baseUomCode: string; baseUomName: string;
  currentQty: number; lowStockThreshold: number | null;
  status: string; lastMovementAt: string | null;
}
