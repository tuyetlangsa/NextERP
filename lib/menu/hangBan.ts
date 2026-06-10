import type { Category } from "@/types/api/menu";

export const HANG_BAN_CODE = "HANG_BAN";

export function findHangBanCategoryId(categories: Category[]): number | null {
  return categories.find(c => c.code === HANG_BAN_CODE)?.id ?? null;
}

export function buildCategorySelectOptions(categories: Category[], rootId: number) {
  const root = categories.find(c => c.id === rootId);
  if (!root) return [] as { id: number; label: string }[];

  return categories
    .filter(c => c.id === rootId || c.path.startsWith(`${rootId};`))
    .sort((a, b) => a.path.localeCompare(b.path) || a.displayOrder - b.displayOrder)
    .map(c => {
      const depth = Math.max(0, c.level - root.level);
      const prefix = depth > 0 ? `${"  ".repeat(depth)}└ ` : "";
      return { id: c.id, label: `${prefix}${c.name}` };
    });
}

export function buildCategoryTreeNodes(categories: Category[], rootId: number | null) {
  const scoped =
    rootId === null ? categories : categories.filter(c => c.path.startsWith(`${rootId};`) || c.id === rootId);

  const byParent = new Map<number | null, Category[]>();
  for (const c of scoped) {
    const key = c.parentId ?? null;
    const arr = byParent.get(key);
    if (arr) arr.push(c);
    else byParent.set(key, [c]);
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
  }
  return { byParent, scoped };
}
