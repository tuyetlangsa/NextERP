/**
 * Maps each desktop subsystem id (data/subsystems.ts) → backend Page.Code.
 * Used by the Start Menu / desktop-icon guard after GET /api/access/my-menu.
 *
 * Page access gates NAVIGATION only. API actions inside each window are still
 * gated server-side by permissions.
 */
export const SUBSYSTEM_PAGE_CODE: Record<string, string> = {
  // Mặt bằng
  counter: "nexterp.counters",
  area: "nexterp.areas",
  "area-menu-category": "nexterp.area_menu_category",
  table: "nexterp.tables",
  floorplan: "nexterp.floor_plan",

  // Thực đơn
  items: "nexterp.items",
  uom: "nexterp.uom",
  "uom-conversion": "nexterp.uom_conversion",
  choice: "nexterp.choice_categories",
  setmenu: "nexterp.set_menu",
  "kitchen-station": "nexterp.kitchen_stations",
  recipe: "nexterp.recipes",

  // Kho
  stock: "nexterp.stock",
  "stock-movement": "nexterp.stock_movement",

  // Giá & Khuyến mãi
  pricing: "nexterp.pricing",
  discount: "nexterp.discount_policies",
  "service-charge": "nexterp.service_charge",

  // Hệ thống
  users: "nexterp.staff_accounts",
  shifts: "nexterp.shifts",
  "cancellation-reason": "nexterp.cancellation_reasons",
  schedule: "nexterp.schedule",
  config: "nexterp.config",

  // Báo cáo
  reports: "nexterp.reports",
  ai: "nexterp.ai",
  "ai-knowledge": "nexterp.ai_knowledge",
  "ai-monitor": "nexterp.ai_monitor",
};

export function pageCodeForSubsystem(subsystemId: string): string | undefined {
  return SUBSYSTEM_PAGE_CODE[subsystemId];
}

/**
 * Whether a subsystem should be visible/launchable for the current account.
 *
 * - `win === null` (coming-soon teaser): always visible — it isn't launchable
 *   anyway, and we keep the existing "Sắp ra mắt" UX.
 * - Real window (`win` set): visible only if its page code is granted.
 * - Real window with no page mapping: hidden (fail closed) — every implemented
 *   window is mapped above, so this only guards a forgotten mapping.
 */
export function canSeeSubsystem(
  sub: { id: string; win: string | null },
  accessiblePages: Set<string>,
): boolean {
  if (!sub.win) return true;
  const code = pageCodeForSubsystem(sub.id);
  if (!code) return false;
  return accessiblePages.has(code);
}

/** Backend page `nexterp.schedule` is still commented out in AccessSeeder — grant
 *  navigation when the account clearly manages shifts/staff or is Owner/Manager. */
const SCHEDULE_NAV_FALLBACK_PAGES = ["nexterp.shifts", "nexterp.staff_accounts"] as const;
const SCHEDULE_NAV_FALLBACK_ROLES = new Set(["OWNER", "MANAGER"]);

export function augmentAccessiblePages(
  pages: Set<string>,
  roleCode?: string,
): Set<string> {
  const scheduleCode = SUBSYSTEM_PAGE_CODE.schedule;
  if (!scheduleCode || pages.has(scheduleCode)) return pages;

  const role = roleCode?.toUpperCase() ?? "";
  const canSee =
    SCHEDULE_NAV_FALLBACK_ROLES.has(role) ||
    SCHEDULE_NAV_FALLBACK_PAGES.some(code => pages.has(code));
  if (!canSee) return pages;

  const next = new Set(pages);
  next.add(scheduleCode);
  return next;
}
