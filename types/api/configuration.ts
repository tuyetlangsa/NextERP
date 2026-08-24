/** Functional group for ConfigValue display. Must match backend ConfigGroup enum. */
export type ConfigGroup =
  | "RestaurantProfile"
  | "TicketTable"
  | "Reservation"
  | "Kitchen"
  | "CustomerDisplay"
  | "Printing"
  | "TableLock"
  | "Pagination"
  | "Transfer"
  | "EInvoice"
  | "Scheduling"
  | "Email"
  | "AiLockSuggestion";

export type ConfigValueType = "BOOL" | "TEXT" | "NUMBER" | "TIME";

/** Single config entry from GET /api/configs */
export interface ConfigValueItem {
  code: string;
  value: string | null;
  valueType: ConfigValueType;
  description: string | null;
  group: ConfigGroup;
  updatedAt: string;
  updatedByStaffAccountId: number | null;
}

/** Single rounding entry from GET /api/rounding-configs */
export interface RoundingConfigItem {
  keyCode: string;
  digits: number;
  description: string | null;
}

/** PATCH /api/configs request body */
export interface BatchUpdateConfigValuesRequest {
  changes: Array<{ code: string; value: string | null }>;
}

/** PATCH /api/rounding-configs request body */
export interface BatchUpdateRoundingConfigsRequest {
  changes: Array<{ keyCode: string; digits: number }>;
}
