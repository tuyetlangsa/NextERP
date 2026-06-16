/** KitchenStation — GET/POST/PUT /api/kitchen-stations */

export interface KitchenStation {
  id: number;
  code: string;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KitchenStationUpsert {
  code: string;
  name: string;
  description?: string | null;
  displayOrder: number;
  isActive: boolean;
}

/** CancellationReason — GET/POST/PUT /api/cancellation-reasons */

export interface CancellationReason {
  id: number;
  code: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CancellationReasonUpsert {
  code: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
}

/** Shift — GET/POST/PUT /api/shifts */

export interface Shift {
  id: number;
  code: string;
  name: string;
  beginTime: string;
  endTime: string;
  isNextDay: boolean;
  note: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftUpsert {
  code: string;
  name: string;
  beginTime: string;
  endTime: string;
  isNextDay: boolean;
  note?: string | null;
  isActive: boolean;
}
