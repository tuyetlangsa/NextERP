/**
 * Mirrors backend `Rpom.Domain.Operations.CustomerDisplay` — see
 * `Rpom.Application/CustomerDisplays/{List,Get}CustomerDisplay(s)/Response`.
 * `isActive` (soft-delete/enabled flag, admin-controlled) is distinct from
 * `isActivated` (device-pairing status set by the physical display via the
 * guest activate/poll flow) — do not conflate the two.
 */
export interface CustomerDisplay {
  id: number;
  posTerminalId: number;
  posTerminalName: string;
  name: string;
  isActivated: boolean;
  activatedAt: string | null;
  idleMediaUrl: string | null;
  lastSeenAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** POST /api/customer-displays response — deviceToken is only ever returned here, once. */
export interface CustomerDisplayRegisterResult {
  id: number;
  posTerminalId: number;
  name: string;
  deviceToken: string;
  idleMediaUrl: string | null;
}
