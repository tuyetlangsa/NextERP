"use client";

import { useMemo, useState, useCallback, useTransition } from "react";
import {
  TabComponent,
  TabItemDirective,
  TabItemsDirective,
} from "@syncfusion/ej2-react-navigations";
import { ensureSyncfusionLicense } from "@/lib/syncfusion-license";
import { useResource } from "@/lib/http/useResource";
import { lookupsApi } from "@/lib/api/lookups";
import { StatusBar } from "@/components/ui/StatusBar";
import { LoadingBar, ErrorBar } from "@/components/ui/ResourceBars";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import {
  ReportFilterBar,
  defaultFilterValues,
  type ReportFilterValues,
} from "@/components/reports/ReportFilterBar";
import { RevenueTab } from "@/components/reports/RevenueTab";
import { RevenueSummaryTab } from "@/components/reports/RevenueSummaryTab";
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
  "Báo cáo doanh thu tổng thể",
  "Doanh thu",
  "Danh sách phiếu",
  "Bán hàng",
  "Danh mục",
  "Món hàng",
  "Top bán chạy",
  "Ca làm việc",
  "Nguyên liệu",
  "Tồn kho",
];

/**
 * Which shared filters each tab actually honors (index-aligned with TAB_LABELS).
 * Only the dropdowns listed here are shown for that tab; the rest are hidden so the
 * bar never offers a filter the report ignores. `hideBar` hides the whole filter bar
 * (used by tabs that rely on their own in-tab controls instead).
 */
interface TabFilterConfig {
  counter?: boolean;
  area?: boolean;
  shift?: boolean;
  category?: boolean;
  hideBar?: boolean;
}

const TAB_FILTERS: readonly TabFilterConfig[] = [
  { counter: true, area: true, shift: true },    // 0 Báo cáo doanh thu tổng thể
  { counter: true, area: true, shift: true },    // 1 Doanh thu
  { counter: true, area: true, shift: true },    // 2 Danh sách phiếu
  { counter: true, area: true },                 // 3 Bán hàng
  { counter: true, area: true },                 // 4 Danh mục
  { counter: true, area: true, category: true }, // 5 Món hàng
  { counter: true, area: true },                 // 6 Top bán chạy
  { counter: true, shift: true },                // 7 Ca làm việc
  { counter: true },                             // 8 Nguyên liệu
  { hideBar: true },                             // 9 Tồn kho — has its own search/lowStock controls
];

/** API report filters are calendar dates, not UTC instants. Keep the date selected in the
 * browser instead of letting toISOString() shift midnight back one day in UTC+ time zones. */
function toLocalDateParam(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function WinReports() {
  const [activeTab, setActiveTab] = useState(0);
  const [filters, setFilters] = useState<ReportFilterValues>(defaultFilterValues());
  const [ticketId, setTicketId] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Lookup data for the filter dropdowns — fetched once on mount. Without these the
  // Quầy/Khu/Ca/Danh mục dropdowns only show their "Tất cả X" placeholder.
  const counters = useResource(() => lookupsApi.getCounters(), {});
  const areas = useResource(() => lookupsApi.getAreas(), {});
  const shifts = useResource(() => lookupsApi.getShifts(), {});
  const categories = useResource(() => lookupsApi.getCategories(), {});

  const filterParams = useMemo(
    () => ({
      fromDate: toLocalDateParam(filters.fromDate),
      toDate: toLocalDateParam(filters.toDate),
      counterId: filters.counterId,
      areaId: filters.areaId,
      shiftId: filters.shiftId,
      categoryId: filters.categoryId,
    }),
    [filters],
  );

  return (
    <div className="flex flex-col" style={{ flex: 1, minHeight: 0 }}>
      <TabComponent
        selectedItem={activeTab}
        selecting={(args: any) => {
          if (args.isSwiped) args.cancel = true;
        }}
        selected={useCallback((args: any) => {
          startTransition(() => setActiveTab(args.selectedIndex));
        }, [startTransition])}
      >
        <TabItemsDirective>
          {TAB_LABELS.map((label) => (
            <TabItemDirective key={label} header={{ text: label }} />
          ))}
        </TabItemsDirective>
      </TabComponent>
      {!TAB_FILTERS[activeTab].hideBar && (
        <ReportFilterBar
          value={filters}
          onChange={setFilters}
          counters={counters.data ?? undefined}
          areas={areas.data ?? undefined}
          shifts={shifts.data ?? undefined}
          categories={categories.data ?? undefined}
          visibleFilters={{
            counter: !!TAB_FILTERS[activeTab].counter,
            area: !!TAB_FILTERS[activeTab].area,
            shift: !!TAB_FILTERS[activeTab].shift,
            category: !!TAB_FILTERS[activeTab].category,
          }}
        />
      )}
      <div className="flex-1 overflow-auto">
        {error && <ErrorBar text={error} onRetry={() => setError(null)} />}
        {loading && <LoadingBar text="Đang tải..." />}
        <ErrorBoundary resetKey={activeTab}>
        {activeTab === 0 && (
          <RevenueSummaryTab filters={filterParams} onLoading={setLoading} onError={setError} />
        )}
        {activeTab === 1 && (
          <RevenueTab filters={filterParams} onLoading={setLoading} onError={setError} />
        )}
        {activeTab === 2 && (
          <DetailedRevenueTab
            filters={filterParams}
            onLoading={setLoading}
            onError={setError}
            onDrillDown={(tid) => {
              setTicketId(tid);
              setActiveTab(3);
            }}
          />
        )}
        {activeTab === 3 && (
          <ItemSalesDetailTab
            filters={filterParams}
            ticketId={ticketId}
            onLoading={setLoading}
            onError={setError}
          />
        )}
        {activeTab === 4 && (
          <CategoryTab filters={filterParams} onLoading={setLoading} onError={setError} />
        )}
        {activeTab === 5 && (
          <ItemTab filters={filterParams} onLoading={setLoading} onError={setError} />
        )}
        {activeTab === 6 && (
          <TopSellerTab filters={filterParams} onLoading={setLoading} onError={setError} />
        )}
        {activeTab === 7 && (
          <ShiftTab filters={filterParams} onLoading={setLoading} onError={setError} />
        )}
        {activeTab === 8 && (
          <IngredientTab filters={filterParams} onLoading={setLoading} onError={setError} />
        )}
        {activeTab === 9 && (
          <StockAlertTab onLoading={setLoading} onError={setError} />
        )}
        </ErrorBoundary>
      </div>
      <StatusBar left={<span>Sẵn sàng</span>} />
    </div>
  );
}
