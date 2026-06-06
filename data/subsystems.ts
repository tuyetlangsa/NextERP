import type { Subsystem, SubsystemGroup } from "@/types/domain";

export const subsystems: Subsystem[] = [
  // Layout (Counter → Area → Table)
  { id: "counter", label: "Quầy",              description: "Top-level: Quầy → Khu → Bàn",      group: "layout",  showOnDesktop: true, win: "WinCounter" },
  { id: "area",    label: "Khu",               description: "Quản lý khu vực bàn",              group: "layout",  showOnDesktop: true, win: "WinArea" },
  { id: "table",   label: "Bàn / Phòng / Máy", description: "Cấu hình bàn",                     group: "layout",  showOnDesktop: true, win: "WinTable" },
  { id: "floorplan", label: "Sơ đồ bàn",       description: "Editor kéo-thả",                   group: "layout",  showOnDesktop: true, win: null },
  // Menu
  { id: "items",   label: "Hàng hóa / Dịch vụ", description: "Catalog + nhóm hàng",             group: "menu",    showOnDesktop: true, win: "WinItem" },
  { id: "uom",     label: "Đơn vị tính",        description: "Phần / Tô / Chai / Kg / ...",     group: "menu",    showOnDesktop: true, win: "WinUom" },
  { id: "choice",  label: "Loại lựa chọn",      description: "Choice Categories & Modifiers",   group: "menu",    showOnDesktop: true, win: null },
  { id: "setmenu", label: "Set Menu",           description: "Combo & Main Components",         group: "menu",    showOnDesktop: true, win: null },
  // Pricing
  { id: "pricing",  label: "Bảng giá bán",     description: "Variant Time/Day/Area",            group: "pricing", showOnDesktop: true, win: "WinPricing" },
  { id: "discount", label: "Khuyến mãi",        description: "Bill & Quantity-based",           group: "pricing", win: null },
  { id: "service-charge", label: "Phí phục vụ", description: "Service charge theo Khu",         group: "pricing", showOnDesktop: true, win: null },
  // System
  { id: "users",     label: "Người dùng",      description: "Vai trò, ma trận quyền",           group: "system",  showOnDesktop: true, win: null },
  { id: "shifts",    label: "Danh sách ca",    description: "Khung giờ làm theo ngày",          group: "system",  showOnDesktop: true, win: null },
  { id: "schedule",  label: "Lịch làm việc tháng", description: "Manager · calendar + day detail", group: "system", showOnDesktop: true, win: null },
  { id: "config",    label: "Cấu hình nhà hàng", description: "Restaurant Profile",             group: "system",  win: null },
  // Reports
  { id: "reports", label: "Báo cáo & Phân tích", description: "Doanh thu / Top bán",            group: "reports", win: null },
  { id: "ai",      label: "AI Conversational",   description: "Chart-bound chat",               group: "reports", win: null },
];

export const subsystemGroups: { id: SubsystemGroup | "all"; label: string }[] = [
  { id: "all",     label: "Tất cả" },
  { id: "layout",  label: "Mặt bằng" },
  { id: "menu",    label: "Thực đơn" },
  { id: "pricing", label: "Giá & Khuyến mãi" },
  { id: "system",  label: "Hệ thống" },
  { id: "reports", label: "Báo cáo" },
];
