import type { Subsystem, SubsystemGroup } from "@/types/domain";

export const subsystems: Subsystem[] = [
  // Mặt bằng
  { id: "quay",   ten: "Quầy",                sub: "Top-level: Quầy → Khu → Bàn", group: "mat-bang", desktop: true, win: null },
  { id: "khu",    ten: "Khu",                 sub: "Quản lý khu vực bàn",          group: "mat-bang", desktop: true, win: "WinKhu" },
  { id: "ban",    ten: "Bàn / Phòng / Máy",   sub: "Sơ đồ bàn & cấu hình",         group: "mat-bang", desktop: true, win: null },
  { id: "layout", ten: "Sơ đồ bàn",           sub: "Editor kéo-thả",               group: "mat-bang", desktop: true, win: null },
  // Thực đơn
  { id: "items",   ten: "Hàng Hóa - Dịch Vụ", sub: "Catalog + Nhóm hàng",          group: "thuc-don", desktop: true, win: null },
  { id: "dvt",     ten: "Đơn vị tính",        sub: "Count / Weight / Volume",      group: "thuc-don", desktop: true, win: null },
  { id: "choice",  ten: "Loại lựa chọn",      sub: "Choice Categories & Modifiers", group: "thuc-don", desktop: true, win: null },
  { id: "setmenu", ten: "Set Menu",           sub: "Combo & Main Components",      group: "thuc-don", desktop: true, win: null },
  // Giá & Khuyến mãi
  { id: "pricing",  ten: "Bảng giá bán",      sub: "Variant Time/Day/Area",        group: "gia-km",   desktop: true, win: null },
  { id: "discount", ten: "Khuyến mãi",        sub: "Bill & Quantity-based",        group: "gia-km",   win: null },
  { id: "tax",      ten: "Phí phục vụ",       sub: "Service charge theo Khu",      group: "gia-km",   desktop: true, win: null },
  // Hệ thống
  { id: "users",     ten: "Người dùng",       sub: "Vai trò, ma trận quyền",       group: "he-thong", desktop: true, win: null },
  { id: "shift",     ten: "Danh sách ca",     sub: "Khung giờ làm theo ngày",      group: "he-thong", desktop: true, win: null },
  { id: "sched-m",   ten: "Lịch làm việc tháng", sub: "Manager · calendar + day detail", group: "he-thong", desktop: true, win: null },
  { id: "config",    ten: "Cấu hình nhà hàng", sub: "Restaurant Profile",          group: "he-thong", win: null },
  // Báo cáo
  { id: "report", ten: "Báo cáo & Phân tích", sub: "Doanh thu / Top bán",          group: "bao-cao", win: null },
  { id: "ai",     ten: "AI Conversational",   sub: "Chart-bound chat",             group: "bao-cao", win: null },
];

export const subsystemGroups: { id: SubsystemGroup | "all"; ten: string }[] = [
  { id: "all",      ten: "Tất cả" },
  { id: "mat-bang", ten: "Mặt bằng" },
  { id: "thuc-don", ten: "Thực đơn" },
  { id: "gia-km",   ten: "Giá & Khuyến mãi" },
  { id: "he-thong", ten: "Hệ thống" },
  { id: "bao-cao",  ten: "Báo cáo" },
];
