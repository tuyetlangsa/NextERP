import type { ScheduleTemplateLine } from "@/types/api/schedule";

export type TemplateRoleQty = { roleId: number; requiredCount: number };

/** Cell key: dayOfWeek (1=Mon…7=Sun) + shiftId */
export function cellKey(dayOfWeek: number, shiftId: number): string {
  return `${dayOfWeek}|${shiftId}`;
}

export function parseCellKey(key: string): { dayOfWeek: number; shiftId: number } {
  const [dayOfWeek, shiftId] = key.split("|").map(Number);
  return { dayOfWeek, shiftId };
}

/** Group flat lines → map cell → role quantities (keeps 0 counts if present). */
export function linesToCellMap(
  lines: ScheduleTemplateLine[],
): Map<string, TemplateRoleQty[]> {
  const map = new Map<string, TemplateRoleQty[]>();
  for (const line of lines) {
    const key = cellKey(line.dayOfWeek, line.shiftId);
    const list = map.get(key) ?? [];
    const existing = list.find(r => r.roleId === line.roleId);
    if (existing) existing.requiredCount = line.requiredCount;
    else list.push({ roleId: line.roleId, requiredCount: line.requiredCount });
    map.set(key, list);
  }
  return map;
}

/**
 * Flatten cells → API lines.
 * Only `requiredCount > 0` is sent (backend typically rejects 0).
 * Empty template → `[]`.
 */
export function cellMapToUpsertLines(
  cells: Map<string, TemplateRoleQty[]>,
): Omit<ScheduleTemplateLine, "id">[] {
  const out: Omit<ScheduleTemplateLine, "id">[] = [];
  for (const [key, roles] of cells) {
    const { dayOfWeek, shiftId } = parseCellKey(key);
    for (const r of roles) {
      if (r.requiredCount > 0) {
        out.push({
          dayOfWeek,
          shiftId,
          roleId: r.roleId,
          requiredCount: r.requiredCount,
        });
      }
    }
  }
  return out;
}

export function cloneRoles(roles: TemplateRoleQty[]): TemplateRoleQty[] {
  return roles.map(r => ({ ...r }));
}

export function cellHasContent(roles: TemplateRoleQty[] | undefined): boolean {
  return !!roles && roles.some(r => r.requiredCount > 0);
}

/**
 * If cell has ≥1 role with count > 0, return all roles (missing → 0).
 * Matches Create UX after "Chọn vai trò" save. Empty / all-zero → [].
 */
export function expandCellRoles(
  cellRoles: TemplateRoleQty[] | undefined,
  allRoles: { id: number }[],
): TemplateRoleQty[] {
  if (!cellHasContent(cellRoles)) return [];
  return allRoles.map(role => ({
    roleId: role.id,
    requiredCount: cellRoles!.find(r => r.roleId === role.id)?.requiredCount ?? 0,
  }));
}

/** Expand every non-empty cell so Edit matches Create pill display. */
export function expandAllCells(
  cells: Map<string, TemplateRoleQty[]>,
  allRoles: { id: number }[],
): Map<string, TemplateRoleQty[]> {
  const next = new Map<string, TemplateRoleQty[]>();
  for (const [key, roles] of cells) {
    const expanded = expandCellRoles(roles, allRoles);
    if (expanded.length > 0) next.set(key, expanded);
  }
  return next;
}
