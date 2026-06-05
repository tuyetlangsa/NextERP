/**
 * Mirrors backend `Rpom.Application.Uoms.UomItem` (matches Domain `Uom` shape).
 * Code is the business identifier; case-insensitive unique.
 */
export interface Uom {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
