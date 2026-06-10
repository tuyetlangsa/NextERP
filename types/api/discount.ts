export type DiscountType = "TICKET_THRESHOLD" | "QUANTITY_ITEM";
export type ApplyType = "PERCENT" | "FIXED";

export interface DiscountPolicyListRow {
  id: number;
  code: string;
  name: string;
  description: string | null;
  discountType: DiscountType;
  isAutoApply: boolean;
  daysOfWeek: string | null;
  isActive: boolean;
  conditionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DiscountPolicyCondition {
  id: number;
  thresholdAmount: number | null;
  itemId: number | null;
  itemName: string | null;
  quantityThreshold: number | null;
  areaId: number | null;
  areaName: string | null;
  applyType: ApplyType;
  discountValue: number;
  displayOrder: number;
}

export interface DiscountPolicyDetail {
  id: number;
  code: string;
  name: string;
  description: string | null;
  discountType: DiscountType;
  isAutoApply: boolean;
  daysOfWeek: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  conditions: DiscountPolicyCondition[];
}

export interface DiscountPolicyConditionInput {
  thresholdAmount?: number | null;
  itemId?: number | null;
  quantityThreshold?: number | null;
  areaId?: number | null;
  applyType: ApplyType;
  discountValue: number;
  displayOrder: number;
}

export interface DiscountPolicyUpsert {
  code: string;
  name: string;
  description?: string | null;
  discountType: DiscountType;
  isAutoApply: boolean;
  daysOfWeek?: string | null;
  isActive: boolean;
  conditions: DiscountPolicyConditionInput[];
}

export interface DiscountPolicySaveResult {
  id: number;
  code: string;
  name: string;
  conditionCount: number;
}
