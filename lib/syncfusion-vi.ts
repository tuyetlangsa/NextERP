import { L10n } from "@syncfusion/ej2-base";

let loaded = false;

/** Load Vietnamese strings for Syncfusion Grid / Pager (once). */
export function ensureSyncfusionViLocale() {
  if (loaded) return;
  loaded = true;
  L10n.load({
    "vi-VN": {
      grid: {
        EmptyRecord: "Không có bản ghi",
        Item: "mục",
        Items: "mục",
        FilterButton: "Lọc",
        ClearButton: "Xóa",
        StartsWith: "Bắt đầu bằng",
        EndsWith: "Kết thúc bằng",
        Contains: "Chứa",
        Equal: "Bằng",
        NotEqual: "Không bằng",
        Search: "Tìm",
      },
      pager: {
        currentPageInfo: "Trang {0} / {1}",
        totalItemsInfo: "({0} mục)",
        firstPageTooltip: "Trang đầu",
        lastPageTooltip: "Trang cuối",
        nextPageTooltip: "Trang sau",
        previousPageTooltip: "Trang trước",
        nextPagerTooltip: "Nhóm trang sau",
        previousPagerTooltip: "Nhóm trang trước",
      },
    },
  });
}
