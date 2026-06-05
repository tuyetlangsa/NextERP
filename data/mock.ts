import type { Counter, Area } from "@/types/domain";

export const mockCounters: Counter[] = [
  { id: "Q01", ten: "Quầy chính", dien_giai: "Tầng 1 sảnh", kich_hoat: true },
  { id: "Q02", ten: "Quầy bar", dien_giai: "Tầng 1 quầy bar", kich_hoat: true },
  { id: "Q03", ten: "Quầy phòng riêng", dien_giai: "Tầng 2", kich_hoat: true },
  { id: "Q04", ten: "Quầy sân vườn", dien_giai: "Sân trước", kich_hoat: true },
];

export const mockAreas: Area[] = [
  { id: "KV01", quay: "Q01", ten: "Sảnh chính", ten1: "Main Hall", mo_ta: "Tầng 1 — bàn thường", khu_cha: null, co_so_do: true, so_so_do: 1, thu_tu: 1, quy_mo: 60, kich_hoat: true, nhom_menu: [] },
  { id: "KV02", quay: "Q01", ten: "Khu VIP", ten1: "VIP Area", mo_ta: "Tầng 1 — bàn VIP phụ thu", khu_cha: null, co_so_do: true, so_so_do: 1, thu_tu: 2, quy_mo: 20, kich_hoat: true, nhom_menu: [] },
  { id: "KV03", quay: "Q02", ten: "Khu quầy bar", ten1: "Bar", mo_ta: "Quầy bar — ghế cao", khu_cha: null, co_so_do: false, so_so_do: 0, thu_tu: 3, quy_mo: 12, kich_hoat: true, nhom_menu: [] },
  { id: "KV04", quay: "Q03", ten: "Phòng riêng Lầu 2", ten1: "Private Room", mo_ta: "Phòng riêng cho nhóm 8-12 khách", khu_cha: null, co_so_do: true, so_so_do: 3, thu_tu: 4, quy_mo: 36, kich_hoat: true, nhom_menu: [] },
  { id: "KV05", quay: "Q04", ten: "Sân vườn", ten1: "Garden", mo_ta: "Ngoài trời, mùa nắng", khu_cha: null, co_so_do: true, so_so_do: 1, thu_tu: 5, quy_mo: 40, kich_hoat: false, nhom_menu: [] },
];
