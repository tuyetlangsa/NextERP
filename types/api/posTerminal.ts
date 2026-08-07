/**
 * Mirrors backend `Rpom.Domain.Operations.PosTerminal` — see
 * `Rpom.Application/PosTerminals/{List,Get}PosTerminal(s)/Response`.
 * `hasDisplay` is a computed field (not stored): true when an active
 * CustomerDisplay is linked to this terminal.
 */
export interface PosTerminal {
  id: number;
  name: string;
  hasDisplay: boolean;
  lastSeenAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** POST /api/pos-terminals response — deviceToken is only ever returned here, once. */
export interface PosTerminalRegisterResult {
  id: number;
  name: string;
  deviceToken: string;
}
