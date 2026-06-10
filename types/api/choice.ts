export interface ChoiceCategoryListRow {
  id: number;
  name: string;
  note: string | null;
  minChoice: number;
  maxChoice: number | null;
  displayOrder: number;
  isActive: boolean;
  modifierCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChoiceCategoryModifier {
  itemId: number;
  itemCode: string;
  itemName: string;
  extraPrice: number;
  minPerModifier: number;
  maxPerModifier: number;
  displayOrder: number;
  isActive: boolean;
}

export interface ChoiceCategoryDetail {
  id: number;
  name: string;
  note: string | null;
  minChoice: number;
  maxChoice: number | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  modifiers: ChoiceCategoryModifier[];
}

export interface ChoiceCategoryUpsert {
  name: string;
  note?: string | null;
  minChoice: number;
  maxChoice?: number | null;
  displayOrder: number;
  isActive: boolean;
}

export interface ChoiceCategoryModifierInput {
  itemId: number;
  extraPrice: number;
  minPerModifier: number;
  maxPerModifier: number;
  displayOrder: number;
  isActive: boolean;
}

export interface ChoiceCategoryModifiersReplaceRequest {
  modifiers: ChoiceCategoryModifierInput[];
}

export interface ChoiceCategoryModifiersReplaceResult {
  choiceCategoryId: number;
  inserted: number;
  updated: number;
  deleted: number;
  total: number;
}
