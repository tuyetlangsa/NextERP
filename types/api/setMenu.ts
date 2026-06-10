export type SetMenuDetailType = "COMPONENT" | "CHOICE_CATEGORY";

export interface SetMenuDetailRow {
  id: number;
  detailType: SetMenuDetailType;
  componentItemId: number | null;
  componentItemName: string | null;
  quantity: number | null;
  isFixed: boolean | null;
  choiceCategoryId: number | null;
  choiceCategoryName: string | null;
  displayOrder: number;
}

export interface SetMenuConfig {
  itemId: number;
  itemCode: string;
  itemName: string;
  description: string | null;
  details: SetMenuDetailRow[];
}

export interface SetMenuDetailInput {
  detailType: SetMenuDetailType;
  componentItemId?: number;
  quantity?: number;
  isFixed?: boolean;
  choiceCategoryId?: number;
  displayOrder: number;
}

export interface SetMenuUpsert {
  description?: string | null;
  details: SetMenuDetailInput[];
}

export interface SetMenuUpsertResult {
  itemId: number;
  detailCount: number;
}
