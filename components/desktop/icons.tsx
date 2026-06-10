import {
  LayoutGrid, Building2, MapPin, Utensils, ListOrdered, Layers, Tags,
  Users, CalendarClock, Settings, BarChart3, Sparkles,
  Minus, Square, X, Maximize2, Plus, Save, Trash2, RefreshCw, Download, Upload,
  Search, Settings2, Pencil, Check,
  HelpCircle, ChevronDown, ChevronRight, Folder,
  PanelLeftClose, PanelLeftOpen, type LucideIcon,
} from "lucide-react";

export type SubsystemIconKey =
  | "counter" | "area" | "area-menu-category" | "table" | "floorplan"
  | "items"   | "uom"  | "choice" | "setmenu"
  | "pricing" | "discount" | "service-charge"
  | "users"   | "shifts" | "schedule" | "config"
  | "reports" | "ai" | "generic";

export const SubsystemIcons: Record<SubsystemIconKey, LucideIcon> = {
  counter:         Building2,
  area:            MapPin,
  "area-menu-category": Tags,
  table:           LayoutGrid,
  floorplan:       Layers,
  items:           Utensils,
  uom:             ListOrdered,
  choice:          Tags,
  setmenu:         Layers,
  pricing:         Tags,
  discount:        ListOrdered,
  "service-charge": ListOrdered,
  users:           Users,
  shifts:          CalendarClock,
  schedule:        CalendarClock,
  config:          Settings,
  reports:         BarChart3,
  ai:              Sparkles,
  generic:         ListOrdered,
};

export const subsystemIconKey: Record<string, SubsystemIconKey> = {
  counter: "counter", area: "area", "area-menu-category": "area-menu-category", table: "table", floorplan: "floorplan",
  items: "items", uom: "uom", choice: "choice", setmenu: "setmenu",
  pricing: "pricing", discount: "discount", "service-charge": "service-charge",
  users: "users", shifts: "shifts", schedule: "schedule", config: "config",
  reports: "reports", ai: "ai",
};

export const ChromeIcons = {
  Min: Minus, Max: Square, Close: X, Restore: Maximize2,
  Plus, Save, Trash: Trash2, Refresh: RefreshCw, Export: Download, Import: Upload,
  Search, Fn: Settings2, Edit: Pencil, Check,
  Help: HelpCircle, ChevronDown, ChevronRight, Folder,
  CollapseLeft: PanelLeftClose, OpenLeft: PanelLeftOpen,
};
