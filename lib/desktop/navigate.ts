/** Cross-window navigation helpers for the desktop shell. */

const STOCK_MOVEMENT_ITEM_KEY = "nextErp.stockMovement.itemId";

export function setStockMovementItemFilter(itemId: number) {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(STOCK_MOVEMENT_ITEM_KEY, String(itemId));
  }
}

export function consumeStockMovementItemFilter(): number | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(STOCK_MOVEMENT_ITEM_KEY);
  sessionStorage.removeItem(STOCK_MOVEMENT_ITEM_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function requestOpenSubsystem(subsystemId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("nextErp:openSubsystem", { detail: { subsystemId } })
  );
}

export const STOCK_MOVEMENT_FILTER_EVENT = "nextErp:stockMovementFilter";

/**
 * Focus the Stock Movement window filtered by `itemId`.
 *
 * Two delivery paths cover both states:
 *  - sessionStorage: read once on first mount (the window isn't mounted yet when
 *    the open request fires, so the event below would be missed).
 *  - custom event: picked up when the window is ALREADY open (re-open just
 *    focuses it, so the mount-time sessionStorage read never re-runs).
 */
export function openStockMovementForItem(itemId: number) {
  setStockMovementItemFilter(itemId);
  requestOpenSubsystem("stock-movement");
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(STOCK_MOVEMENT_FILTER_EVENT, { detail: { itemId } })
    );
  }
}
