/**
 * Dev-only mock data matching backend Domain entity shape (camelCase).
 * Used by Win* components while CRUD endpoints are still being built.
 * Field names MUST match `types/api/restaurant.ts` exactly so the swap
 * to live API is a 1-line change.
 */
import type { Area, Counter, RestaurantTable } from "@/types/api/restaurant";
import type { Uom } from "@/types/api/menu";
import type {
  CancellationReason,
  KitchenStation,
  Shift,
} from "@/types/api/masterData";
import type {
  BomLine,
  ItemUomConversion,
  StockLevel,
  StockMovement,
} from "@/types/api/inventory";

const now = "2026-06-05T00:00:00Z";

export const mockKitchenStations: KitchenStation[] = [
  { id: 1, code: "BEP_CHINH", name: "Bếp chính",     description: "Bếp nấu món chính", displayOrder: 1, isActive: true,  createdAt: now, updatedAt: now },
  { id: 2, code: "BAR",       name: "Bar & Pha chế", description: "Quầy pha chế đồ uống", displayOrder: 2, isActive: true,  createdAt: now, updatedAt: now },
  { id: 3, code: "BEP_NUONG", name: "Bếp nướng",     description: null, displayOrder: 3, isActive: true,  createdAt: now, updatedAt: now },
  { id: 4, code: "BEP_TRA",   name: "Bếp tráng miệng", description: null, displayOrder: 4, isActive: false, createdAt: now, updatedAt: now },
];

export const mockCancellationReasons: CancellationReason[] = [
  { id: 1, code: "CUS_CHANGE_MIND", name: "Khách đổi ý",        displayOrder: 1, isActive: true, createdAt: now, updatedAt: now },
  { id: 2, code: "OUT_OF_STOCK",    name: "Hết hàng",             displayOrder: 2, isActive: true, createdAt: now, updatedAt: now },
  { id: 3, code: "WRONG_DISH",      name: "Gọi nhầm món",         displayOrder: 3, isActive: true, createdAt: now, updatedAt: now },
  { id: 4, code: "FOREIGN_OBJECT",  name: "Dị vật trong món",     displayOrder: 4, isActive: true, createdAt: now, updatedAt: now },
  { id: 5, code: "QUALITY",         name: "Chất lượng không đạt", displayOrder: 5, isActive: true, createdAt: now, updatedAt: now },
  { id: 6, code: "OTHER",           name: "Lý do khác",           displayOrder: 6, isActive: true, createdAt: now, updatedAt: now },
  { id: 7, code: "ALLERGY",         name: "Dị ứng thực phẩm",     displayOrder: 7, isActive: true, createdAt: now, updatedAt: now },
];

export const mockShifts: Shift[] = [
  { id: 1, code: "S_MORNING", name: "Ca sáng",  beginTime: "06:00:00", endTime: "14:00:00", isNextDay: false, note: null,           isActive: true,  createdAt: now, updatedAt: now },
  { id: 2, code: "S_AFTERNOON", name: "Ca chiều", beginTime: "14:00:00", endTime: "22:00:00", isNextDay: false, note: null,           isActive: true,  createdAt: now, updatedAt: now },
  { id: 3, code: "S_NIGHT",   name: "Ca đêm",   beginTime: "22:00:00", endTime: "06:00:00", isNextDay: true,  note: "Ca đêm khuya", isActive: true,  createdAt: now, updatedAt: now },
];

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

export const mockItemUomConversions: ItemUomConversion[] = [
  {
    id: 1,
    itemId: 10,
    uomId: 3,
    uomCode: "gam",
    uomName: "Gam",
    factorToBase: 0.001,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
];

export const mockBomLines: BomLine[] = [
  {
    id: 1,
    sellableItemId: 5,
    materialItemId: 10,
    materialItemCode: "NL_BO",
    materialItemName: "Thịt bò",
    quantity: 0.2,
    uomId: 7,
    uomCode: "kg",
    uomName: "Kilogam",
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
];

export const mockStockLevels: StockLevel[] = [
  {
    itemId: 199,
    itemCode: "DOUONG_BIA_199",
    itemName: "Bia Heineken lon",
    baseUomCode: "lon",
    baseUomName: "Lon",
    currentQty: 50,
    reservedQty: 0,
    lowStockThreshold: 10,
    lastMovementAt: "2026-06-16T10:00:00",
    updatedAt: "2026-06-16T10:00:00",
  },
  {
    itemId: 10,
    itemCode: "NL_BO",
    itemName: "Thịt bò",
    baseUomCode: "kg",
    baseUomName: "Kilogam",
    currentQty: 8,
    reservedQty: 1.5,
    lowStockThreshold: 10,
    lastMovementAt: "2026-06-15T18:30:00",
    updatedAt: "2026-06-15T18:30:00",
  },
];

export const mockStockMovements: StockMovement[] = [
  {
    id: 1,
    itemId: 199,
    itemCode: "DOUONG_BIA_199",
    itemName: "Bia Heineken lon",
    movementType: "STOCK_IN",
    inputQty: 2,
    uomId: 3,
    uomCode: "thung",
    baseUomCode: "lon",
    qtyInBase: 50,
    balanceAfter: 50,
    referenceType: null,
    referenceId: null,
    reason: "2 thung = 50 lon",
    createdByStaffId: 1,
    createdByStaffName: "Chủ nhà hàng",
    createdAt: "2026-06-16T09:00:00",
  },
  {
    id: 2,
    itemId: 199,
    itemCode: "DOUONG_BIA_199",
    itemName: "Bia Heineken lon",
    movementType: "DEDUCT",
    inputQty: 1,
    uomCode: "lon",
    baseUomCode: "lon",
    qtyInBase: -1,
    balanceAfter: 49,
    referenceType: "ORDER_DISH",
    referenceId: 42,
    reason: null,
    createdByStaffId: 1,
    createdByStaffName: "Chủ nhà hàng",
    createdAt: "2026-06-16T10:00:00",
  },
];
