import type { Subsystem, SubsystemGroup } from "@/types/domain";

export const subsystems: Subsystem[] = [
  // Layout (Counter → Area → Table)
  { id: "counter", label: "Quầy",              description: "Top-level: Quầy → Khu → Bàn",      group: "layout",  showOnDesktop: true, win: "WinCounter" },
  { id: "area",    label: "Khu",               description: "Quản lý khu vực bàn",              group: "layout",  showOnDesktop: true, win: "WinArea" },
  { id: "area-menu-category", label: "Menu theo Khu", description: "Gán Category cho Khu vực (Area Menu Category)", group: "layout", showOnDesktop: true, win: "WinAreaMenuCategory" },
  { id: "table",   label: "Danh sách bàn", description: "Cấu hình bàn",                     group: "layout",  showOnDesktop: true, win: "WinTable" },
  // Menu
  { id: "items",   label: "Hàng hóa / Dịch vụ", description: "Catalog + nhóm hàng",             group: "menu",    showOnDesktop: true, win: "WinItem" },
  { id: "uom",     label: "Đơn vị tính",        description: "Phần / Tô / Chai / Kg / ...",     group: "menu",    showOnDesktop: true, win: "WinUom" },
  { id: "uom-conversion", label: "Quy đổi ĐVT", description: "Quy đổi đơn vị tính theo từng mặt hàng", group: "menu", showOnDesktop: true, win: "WinUomConversion" },
  { id: "choice",  label: "Loại lựa chọn",      description: "Choice Categories & Modifiers",   group: "menu",    showOnDesktop: true, win: "WinChoice" },
  { id: "setmenu", label: "Set Menu",           description: "Combo & Main Components",         group: "menu",    showOnDesktop: true, win: "WinSetMenu" },
  { id: "kitchen-station", label: "Bếp con",    description: "Kitchen Station — gán bếp cho món", group: "menu",  showOnDesktop: true, win: "WinKitchenStation" },
  { id: "recipe",  label: "Công thức chế biến", description: "Định lượng nguyên liệu cho từng món", group: "menu", showOnDesktop: true, win: "WinRecipe" },
  // Inventory
  { id: "stock", label: "Tồn kho", description: "Dashboard tồn kho & cảnh báo sắp hết", group: "inventory", showOnDesktop: true, win: "WinStock" },
  { id: "stock-movement", label: "Nhập/Xuất kho", description: "Sổ kho append-only", group: "inventory", showOnDesktop: true, win: "WinStockMovement" },
  // Pricing
  { id: "pricing",  label: "Bảng giá bán",     description: "Variant Time/Day/Area",            group: "pricing", showOnDesktop: true, win: "WinPricing" },
  { id: "discount", label: "Chính sách giảm giá", description: "Bill & Quantity-based", group: "pricing", showOnDesktop: true, win: "WinDiscountPolicy" },
  { id: "service-charge", label: "Phí phục vụ", description: "Service charge theo Khu",         group: "pricing", showOnDesktop: true, win: "WinServiceCharge" },
  // System
  { id: "users",     label: "Quản lý tài khoản", description: "Vai trò, ma trận quyền",           group: "system",  showOnDesktop: true, win: "WinStaffAccount" },
  { id: "shifts",    label: "Danh sách ca",    description: "Khung giờ làm theo ngày",          group: "system",  showOnDesktop: true, win: "WinShift" },
  { id: "cancellation-reason", label: "Lý do huỷ/trả", description: "Lý do huỷ món / trả món", group: "system", showOnDesktop: true, win: "WinCancellationReason" },
  { id: "schedule",  label: "Lịch làm việc", description: "Xếp ca tuần, template, duyệt đổi ca", group: "system", showOnDesktop: true, win: "WinSchedule" },
  { id: "config",    label: "Cấu hình nhà hàng", description: "Cấu hình hệ thống, làm tròn, hóa đơn, email", group: "system", showOnDesktop: true, win: "WinConfig" },
  // Reports
  { id: "reports", label: "Báo cáo",              description: "Báo cáo doanh thu, món hàng, ca, tồn kho", group: "reports", showOnDesktop: true, win: "WinReports" },
  { id: "ai",      label: "Trợ lý AI",           description: "Chat phân tích doanh thu, tồn kho, quỹ — toàn màn hình", group: "reports", showOnDesktop: true, win: "WinAiAssistant" },
  { id: "ai-knowledge", label: "Tri thức nghiệp vụ", description: "Nhập quy trình/nghiệp vụ cho Trợ lý AI", group: "reports", showOnDesktop: true, win: "WinAiKnowledge" },
  { id: "ai-monitor", label: "Nhật ký AI", description: "Giám sát hoạt động Trợ lý AI — công cụ, độ trễ, lỗi", group: "reports", showOnDesktop: true, win: "WinAiMonitor" },
];

export const subsystemGroups: { id: SubsystemGroup | "all"; label: string }[] = [
  { id: "all",     label: "Tất cả" },
  { id: "layout",  label: "Mặt bằng" },
  { id: "menu",    label: "Thực đơn" },
  { id: "inventory", label: "Kho" },
  { id: "pricing", label: "Giá & Khuyến mãi" },
  { id: "system",  label: "Hệ thống" },
  { id: "reports", label: "Báo cáo" },
];
