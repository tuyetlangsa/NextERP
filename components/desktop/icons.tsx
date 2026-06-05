import {
  LayoutGrid, Building2, MapPin, Utensils, ListOrdered, Layers, Tags,
  Users, CalendarClock, Settings, BarChart3, Sparkles,
  Minus, Square, X, Maximize2, Plus, Save, Trash2, RefreshCw, Download,
  HelpCircle, ChevronDown, ChevronRight, Folder,
  PanelLeftClose, PanelLeftOpen, type LucideIcon,
} from "lucide-react";

export type SubsystemIconKey =
  | "counter" | "area" | "table" | "floorplan"
  | "items"   | "uom"  | "choice" | "setmenu"
  | "pricing" | "discount" | "service-charge"
  | "users"   | "shifts" | "schedule" | "config"
  | "reports" | "ai" | "generic";

export const SubsystemIcons: Record<SubsystemIconKey, LucideIcon> = {
  counter:         Building2,
  area:            MapPin,
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
  counter: "counter", area: "area", table: "table", floorplan: "floorplan",
  items: "items", uom: "uom", choice: "choice", setmenu: "setmenu",
  pricing: "pricing", discount: "discount", "service-charge": "service-charge",
  users: "users", shifts: "shifts", schedule: "schedule", config: "config",
  reports: "reports", ai: "ai",
};

export const ChromeIcons = {
  Min: Minus, Max: Square, Close: X, Restore: Maximize2,
  Plus, Save, Trash: Trash2, Refresh: RefreshCw, Export: Download,
  Help: HelpCircle, ChevronDown, ChevronRight, Folder,
  CollapseLeft: PanelLeftClose, OpenLeft: PanelLeftOpen,
};
