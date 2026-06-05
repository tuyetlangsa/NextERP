import {
  LayoutGrid,
  Building2,
  MapPin,
  Utensils,
  ListOrdered,
  Layers,
  Tags,
  Users,
  CalendarClock,
  Settings,
  BarChart3,
  Sparkles,
  Minus,
  Square,
  X,
  Maximize2,
  Plus,
  Save,
  Trash2,
  RefreshCw,
  Download,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Folder,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react";

export type SubsystemIconKey =
  | "counter" | "area" | "table" | "layout"
  | "items" | "fn" | "choice" | "setmenu"
  | "pricing" | "users" | "shift" | "cog"
  | "report" | "ai" | "printer";

export const SubsystemIcons: Record<SubsystemIconKey, LucideIcon> = {
  counter: Building2,
  area:    MapPin,
  table:   LayoutGrid,
  layout:  Layers,
  items:   Utensils,
  fn:      ListOrdered,
  choice:  Tags,
  setmenu: Layers,
  pricing: Tags,
  users:   Users,
  shift:   CalendarClock,
  cog:     Settings,
  report:  BarChart3,
  ai:      Sparkles,
  printer: Settings,
};

export const subsystemIconKey: Record<string, SubsystemIconKey> = {
  quay: "counter", khu: "area", ban: "table", layout: "layout",
  items: "items", dvt: "fn", choice: "choice", setmenu: "setmenu",
  pricing: "pricing", discount: "fn", tax: "fn",
  users: "users", shift: "shift", "sched-m": "shift", config: "cog",
  report: "report", ai: "ai",
};

export const ChromeIcons = {
  Min: Minus, Max: Square, Close: X, Restore: Maximize2,
  Plus, Save, Trash: Trash2, Refresh: RefreshCw, Export: Download,
  Help: HelpCircle, ChevronDown, ChevronRight, Folder,
  CollapseLeft: PanelLeftClose, OpenLeft: PanelLeftOpen,
};
