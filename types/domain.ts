/**
 * UI/session domain types — distinct from API DTOs in `types/api/`.
 *
 * Re-exports backend entity shapes so window components can import from one
 * place. UI-only constructs (window state, subsystem catalog) live here.
 */
export type {
  Counter,
  Area,
  RestaurantTable,
  TableStatus,
  CounterLookupItem,
  KitchenStationLookupItem,
  ShiftLookupItem,
  DenominationLookupItem,
} from "./api/restaurant";

export type { Uom } from "./api/menu";

export type SubsystemGroup =
  | "layout"
  | "menu"
  | "inventory"
  | "pricing"
  | "system"
  | "reports";

export interface Subsystem {
  id: string;
  label: string;
  description: string;
  group: SubsystemGroup;
  showOnDesktop?: boolean;
  /** Component key registered in `DesktopShell.WIN_REGISTRY`; `null` when not yet implemented. */
  win: string | null;
}

export interface AppWindowState {
  id: string;
  def: Subsystem;
  pos: { x: number; y: number };
  size: { width: number; height: number };
  maximized: boolean;
  minimized: boolean;
  z: number;
}

export interface SessionUser {
  staffAccountId: number;
  username: string;
  fullName: string;
  roleCode: string;
}
