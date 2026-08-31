import { L10n } from "@syncfusion/ej2-base";

let loaded = false;

/**
 * Vietnamese UI strings for Syncfusion Grid / Pager.
 *
 * Loaded under BOTH culture keys on purpose. The app never calls `setCulture`,
 * so the active culture stays "en-US" — and it has to: ej2 ships CLDR data for
 * en-US only, and switching culture without loading CLDR for it would break the
 * things that do depend on it (`format="N2"` in WinServiceCharge, the
 * `datepickeredit` editors in WinPricing). L10n strings and CLDR number/date
 * data are separate concerns, so overriding the active culture's strings gives
 * a Vietnamese UI with none of that risk. The "vi-VN" copy is there so the
 * translation still applies if the app ever does load CLDR and switch.
 */
const strings = {
  grid: {
    // Toolbar sửa dữ liệu — mấy nút Add/Edit/Delete/Update/Cancel trên lưới.
    Add: "Thêm",
    Edit: "Sửa",
    Delete: "Xoá",
    Update: "Cập nhật",
    Cancel: "Huỷ",
    Save: "Lưu",
    Search: "Tìm",
    Print: "In",
    Columnchooser: "Cột",
    // Hộp thoại và cảnh báo của luồng sửa.
    SaveButton: "Lưu",
    OKButton: "Đồng ý",
    CancelButton: "Huỷ",
    EditFormTitle: "Chi tiết ",
    AddFormTitle: "Thêm bản ghi mới",
    ConfirmDelete: "Bạn có chắc muốn xoá bản ghi này?",
    CancelEdit: "Bạn có chắc muốn huỷ các thay đổi?",
    EditOperationAlert: "Chưa chọn bản ghi nào để sửa",
    DeleteOperationAlert: "Chưa chọn bản ghi nào để xoá",
    BatchSaveConfirm: "Bạn có chắc muốn lưu các thay đổi?",
    BatchSaveLostChanges: "Các thay đổi chưa lưu sẽ mất. Bạn có chắc muốn tiếp tục?",
    // Lưới rỗng và bộ lọc.
    EmptyRecord: "Không có bản ghi",
    Item: "mục",
    Items: "mục",
    FilterButton: "Lọc",
    ClearButton: "Xoá",
    StartsWith: "Bắt đầu bằng",
    EndsWith: "Kết thúc bằng",
    Contains: "Chứa",
    Equal: "Bằng",
    NotEqual: "Không bằng",
    Matchs: "Không tìm thấy kết quả",
    ChooseColumns: "Chọn cột",
    ColumnMenu: "Menu cột",
    SearchColumns: "tìm cột",
    True: "có",
    False: "không",
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
};

/** Load Vietnamese strings for Syncfusion Grid / Pager (once). */
export function ensureSyncfusionViLocale() {
  if (loaded) return;
  loaded = true;
  L10n.load({ "en-US": strings, "vi-VN": strings });
}
