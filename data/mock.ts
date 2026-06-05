/**
 * Dev-only mock data matching backend Domain entity shape (camelCase).
 * Used by Win* components while CRUD endpoints are still being built.
 * Field names MUST match `types/api/restaurant.ts` exactly so the swap
 * to live API is a 1-line change.
 */
import type { Area, Counter, RestaurantTable } from "@/types/api/restaurant";
import type { Uom } from "@/types/api/menu";

const now = "2026-06-05T00:00:00Z";

export const mockUoms: Uom[] = [
  { id: 1, code: "phan", name: "Phần",    description: "Đơn vị bán theo phần", isActive: true,  createdAt: now, updatedAt: now },
  { id: 2, code: "to",   name: "Tô",       description: "Đơn vị bán theo tô",   isActive: true,  createdAt: now, updatedAt: now },
  { id: 3, code: "dia",  name: "Đĩa",      description: "Đơn vị bán theo đĩa",  isActive: true,  createdAt: now, updatedAt: now },
  { id: 4, code: "chai", name: "Chai",     description: "Đơn vị bán theo chai", isActive: true,  createdAt: now, updatedAt: now },
  { id: 5, code: "lon",  name: "Lon",      description: null,                    isActive: true,  createdAt: now, updatedAt: now },
  { id: 6, code: "ly",   name: "Ly",       description: null,                    isActive: true,  createdAt: now, updatedAt: now },
  { id: 7, code: "kg",   name: "Kilogam",  description: "Khối lượng",            isActive: true,  createdAt: now, updatedAt: now },
];

export const mockCounters: Counter[] = [
  { id: 1, name: "Quầy chính",        note: "Tầng 1 sảnh",         displayOrder: 1, isActive: true,  createdAt: now, updatedAt: now },
  { id: 2, name: "Quầy bar",          note: "Tầng 1 quầy bar",     displayOrder: 2, isActive: true,  createdAt: now, updatedAt: now },
  { id: 3, name: "Quầy phòng riêng",  note: "Tầng 2",              displayOrder: 3, isActive: true,  createdAt: now, updatedAt: now },
  { id: 4, name: "Quầy sân vườn",     note: "Sân trước",           displayOrder: 4, isActive: false, createdAt: now, updatedAt: now },
];

export const mockAreas: Area[] = [
  { id: 1, counterId: 1, name: "Sảnh chính",        description: "Tầng 1 — bàn thường",            displayOrder: 1, isActive: true,  createdAt: now, updatedAt: now },
  { id: 2, counterId: 1, name: "Khu VIP",           description: "Tầng 1 — bàn VIP phụ thu 15%",  displayOrder: 2, isActive: true,  createdAt: now, updatedAt: now },
  { id: 3, counterId: 2, name: "Khu quầy bar",      description: "Quầy bar — ghế cao",             displayOrder: 3, isActive: true,  createdAt: now, updatedAt: now },
  { id: 4, counterId: 3, name: "Phòng riêng Lầu 2", description: "Phòng riêng nhóm 8-12 khách",   displayOrder: 4, isActive: true,  createdAt: now, updatedAt: now },
  { id: 5, counterId: 4, name: "Sân vườn",          description: "Ngoài trời, mùa nắng",          displayOrder: 5, isActive: false, createdAt: now, updatedAt: now },
];

export const mockTables: RestaurantTable[] = [
  { id: 1,  areaId: 1, code: "T01",  seatCount: 4,  description: "Bàn cạnh cửa sổ",  status: "AVAILABLE", isActive: true,  createdAt: now, updatedAt: now },
  { id: 2,  areaId: 1, code: "T02",  seatCount: 4,  description: null,               status: "OCCUPIED",  isActive: true,  createdAt: now, updatedAt: now },
  { id: 3,  areaId: 1, code: "T03",  seatCount: 6,  description: "Bàn dài 6 chỗ",    status: "AVAILABLE", isActive: true,  createdAt: now, updatedAt: now },
  { id: 4,  areaId: 1, code: "T04",  seatCount: 2,  description: "Bàn 2 chỗ góc",    status: "AVAILABLE", isActive: true,  createdAt: now, updatedAt: now },
  { id: 5,  areaId: 2, code: "VIP1", seatCount: 8,  description: "VIP cửa kính",     status: "AVAILABLE", isActive: true,  createdAt: now, updatedAt: now },
  { id: 6,  areaId: 2, code: "VIP2", seatCount: 10, description: null,               status: "OCCUPIED",  isActive: true,  createdAt: now, updatedAt: now },
  { id: 7,  areaId: 3, code: "B01",  seatCount: 1,  description: "Ghế bar 1",        status: "AVAILABLE", isActive: true,  createdAt: now, updatedAt: now },
  { id: 8,  areaId: 3, code: "B02",  seatCount: 1,  description: "Ghế bar 2",        status: "AVAILABLE", isActive: true,  createdAt: now, updatedAt: now },
  { id: 9,  areaId: 4, code: "PR1",  seatCount: 12, description: "Phòng riêng lớn",  status: "AVAILABLE", isActive: true,  createdAt: now, updatedAt: now },
  { id: 10, areaId: 5, code: "G01",  seatCount: 6,  description: "Bàn sân vườn 1",   status: "AVAILABLE", isActive: false, createdAt: now, updatedAt: now },
];
