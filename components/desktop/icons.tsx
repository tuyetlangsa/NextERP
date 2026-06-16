import {
  LayoutGrid, Building2, MapPin, Utensils, ListOrdered, Layers, Tags,
  Users, CalendarClock, Settings, BarChart3, Sparkles, ChefHat, Ban,
  Minus, Square, X, Maximize2, Plus, Save, Trash2, RefreshCw, Download, Upload,
  Search, Settings2, Pencil, Check,
  HelpCircle, ChevronDown, ChevronRight, Folder, Package, ArrowLeftRight, Repeat,
  PanelLeftClose, PanelLeftOpen, type LucideIcon,
} from "lucide-react";

export type SubsystemIconKey =
  | "counter" | "area" | "area-menu-category" | "table" | "floorplan"
  | "items"   | "uom"  | "uom-conversion" | "choice" | "setmenu" | "kitchen-station"
  | "stock" | "stock-movement"
  | "pricing" | "discount" | "service-charge"
  | "users"   | "shifts" | "schedule" | "config" | "cancellation-reason"
  | "reports" | "ai" | "generic";

export const SubsystemIcons: Record<SubsystemIconKey, LucideIcon> = {
  counter:         Building2,
  area:            MapPin,
  "area-menu-category": Tags,
  table:           LayoutGrid,
  floorplan:       Layers,
  items:           Utensils,
  uom:             ListOrdered,
  "uom-conversion": Repeat,
  choice:          Tags,
  setmenu:         Layers,
  "kitchen-station": ChefHat,
  stock: Package,
  "stock-movement": ArrowLeftRight,
  pricing:         Tags,
  discount:        ListOrdered,
  "service-charge": ListOrdered,
  users:           Users,
  shifts:          CalendarClock,
  "cancellation-reason": Ban,
  schedule:        CalendarClock,
  config:          Settings,
  reports:         BarChart3,
  ai:              Sparkles,
  generic:         ListOrdered,
};

export const subsystemIconKey: Record<string, SubsystemIconKey> = {
  counter: "counter", area: "area", "area-menu-category": "area-menu-category", table: "table", floorplan: "floorplan",
  items: "items", uom: "uom", "uom-conversion": "uom-conversion", choice: "choice", setmenu: "setmenu",
  "kitchen-station": "kitchen-station",
  stock: "stock",
  "stock-movement": "stock-movement",
  pricing: "pricing", discount: "discount", "service-charge": "service-charge",
  users: "users", shifts: "shifts", "cancellation-reason": "cancellation-reason",
  schedule: "schedule", config: "config",
  reports: "reports", ai: "ai",
};

export const ChromeIcons = {
  Min: Minus, Max: Square, Close: X, Restore: Maximize2,
  Plus, Save, Trash: Trash2, Refresh: RefreshCw, Export: Download, Import: Upload,
  Search, Fn: Settings2, Edit: Pencil, Check,
  Help: HelpCircle, ChevronDown, ChevronRight, Folder,
  CollapseLeft: PanelLeftClose, OpenLeft: PanelLeftOpen,
};
