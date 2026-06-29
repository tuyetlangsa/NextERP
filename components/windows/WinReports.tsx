"use client";

import { useMemo, useState } from "react";
import {
  TabComponent,
  TabItemDirective,
  TabItemsDirective,
} from "@syncfusion/ej2-react-navigations";
import { ensureSyncfusionLicense } from "@/lib/syncfusion-license";
import { StatusBar } from "@/components/ui/StatusBar";
import { LoadingBar, ErrorBar } from "@/components/ui/ResourceBars";
import { ReportToolbar } from "@/components/reports/ReportToolbar";
import {
  ReportFilterBar,
  defaultFilterValues,
  type ReportFilterValues,
} from "@/components/reports/ReportFilterBar";
import { RevenueTab } from "@/components/reports/RevenueTab";
import { DetailedRevenueTab } from "@/components/reports/DetailedRevenueTab";
import { ItemSalesDetailTab } from "@/components/reports/ItemSalesDetailTab";
import { CategoryTab } from "@/components/reports/CategoryTab";
import { ItemTab } from "@/components/reports/ItemTab";
import { TopSellerTab } from "@/components/reports/TopSellerTab";
import { ShiftTab } from "@/components/reports/ShiftTab";
import { IngredientTab } from "@/components/reports/IngredientTab";
import { StockAlertTab } from "@/components/reports/StockAlertTab";

ensureSyncfusionLicense();

const TAB_LABELS = [
  "Doanh thu",
  "DS phiếu",
  "Bán hàng",
  "Danh mục",
  "Món hàng",
  "Top bán chạy",
  "Ca làm việc",
  "Nguyên liệu",
  "Tồn kho",
];

const TAB_REPORT_TYPES = [
  "revenue",
  "revenue-detail",
  "items-detail",
  "categories",
  "items",
  "top-sellers",
  "shift",
  "ingredient-consumption",
  "stock-alert",
];

export function WinReports() {
  const [activeTab, setActiveTab] = useState(0);
  const [filters, setFilters] = useState<ReportFilterValues>(defaultFilterValues());
  const [ticketId, setTicketId] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filterParams = useMemo(
    () => ({
      fromDate: filters.fromDate.toISOString(),
      toDate: filters.toDate.toISOString(),
      counterId: filters.counterId,
      areaId: filters.areaId,
      shiftId: filters.shiftId,
      categoryId: filters.categoryId,
    }),
    [filters],
  );

  return (
    <div className="flex flex-col h-full">
      <ReportToolbar
        reportType={TAB_REPORT_TYPES[activeTab]}
        filters={filterParams}
        disabled={loading}
      />
      <TabComponent
        selectedItem={activeTab}
        selecting={(args: any) => {
          if (args.isSwiped) args.cancel = true;
        }}
        selected={(args: any) => setActiveTab(args.selectedIndex)}
      >
        <TabItemsDirective>
          {TAB_LABELS.map((label) => (
            <TabItemDirective key={label} header={{ text: label }} />
          ))}
        </TabItemsDirective>
      </TabComponent>
      <ReportFilterBar value={filters} onChange={setFilters} />
      <div className="flex-1 overflow-auto">
        {error && <ErrorBar text={error} onRetry={() => setError(null)} />}
        {loading && <LoadingBar text="Đang tải..." />}
        {activeTab === 0 && (
          <RevenueTab filters={filterParams} onLoading={setLoading} onError={setError} />
        )}
        {activeTab === 1 && (
          <DetailedRevenueTab
            filters={filterParams}
            onLoading={setLoading}
            onError={setError}
            onDrillDown={(tid) => {
              setTicketId(tid);
              setActiveTab(2);
            }}
          />
        )}
        {activeTab === 2 && (
          <ItemSalesDetailTab
            filters={filterParams}
            ticketId={ticketId}
            onLoading={setLoading}
            onError={setError}
          />
        )}
        {activeTab === 3 && (
          <CategoryTab filters={filterParams} onLoading={setLoading} onError={setError} />
        )}
        {activeTab === 4 && (
          <ItemTab filters={filterParams} onLoading={setLoading} onError={setError} />
        )}
        {activeTab === 5 && (
          <TopSellerTab filters={filterParams} onLoading={setLoading} onError={setError} />
        )}
        {activeTab === 6 && (
          <ShiftTab filters={filterParams} onLoading={setLoading} onError={setError} />
        )}
        {activeTab === 7 && (
          <IngredientTab filters={filterParams} onLoading={setLoading} onError={setError} />
        )}
        {activeTab === 8 && (
          <StockAlertTab onLoading={setLoading} onError={setError} />
        )}
      </div>
      <StatusBar left={<span>Sẵn sàng</span>} />
    </div>
  );
}
