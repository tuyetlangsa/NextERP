import type { TopOrderStaffByItemRow, TopOrderStaffRank } from "@/types/api/reports";

export const MIN_SAMPLE_QUANTITY = 5;
export const HIGH_CONCENTRATION_PERCENT = 80;
export const BACKUP_PERCENT = 25;
export const BROAD_DISTRIBUTION_PERCENT = 50;

export type TopOrderStaffStatus =
  | "REFUND_REVIEW"
  | "NO_POSITIVE_QUANTITY"
  | "LOW_SAMPLE"
  | "HIGH_CONCENTRATION"
  | "BROAD_DISTRIBUTION"
  | "MODERATE_DISTRIBUTION";
export type TopOrderStaffSort = "QUANTITY_DESC" | "CONCENTRATION_DESC" | "NAME_ASC";
export type TopOrderStaffFilter = "ALL" | "TRAINING" | "LOW_SAMPLE" | "REFUND_REVIEW";

export interface TopOrderStaffInsight {
  item: TopOrderStaffByItemRow;
  positiveStaff: TopOrderStaffRank[];
  negativeStaff: TopOrderStaffRank[];
  top1Percentage: number | null;
  status: TopOrderStaffStatus;
  hasBackup: boolean;
  message: string;
}

const STATUS_MESSAGE: Record<TopOrderStaffStatus, string> = {
  REFUND_REVIEW: "Cần kiểm tra hoàn món",
  NO_POSITIVE_QUANTITY: "Không có sản lượng dương",
  LOW_SAMPLE: "Ít dữ liệu",
  HIGH_CONCENTRATION: "Tập trung cao",
  BROAD_DISTRIBUTION: "Phân bổ rộng",
  MODERATE_DISTRIBUTION: "Phân bổ vừa",
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLocaleLowerCase("vi");
}

export function buildTopOrderStaffInsight(item: TopOrderStaffByItemRow): TopOrderStaffInsight {
  const positiveStaff = item.topStaff.filter((x) => x.quantity > 0).slice(0, 3);
  const negativeStaff = item.topStaff.filter((x) => x.quantity < 0);
  const top1Percentage = positiveStaff[0]?.percentageOfItemQuantity ?? null;

  let status: TopOrderStaffStatus;
  if (negativeStaff.length > 0) status = "REFUND_REVIEW";
  else if (positiveStaff.length === 0) status = "NO_POSITIVE_QUANTITY";
  else if (item.totalQuantity < MIN_SAMPLE_QUANTITY) status = "LOW_SAMPLE";
  else if ((top1Percentage ?? 0) >= HIGH_CONCENTRATION_PERCENT) status = "HIGH_CONCENTRATION";
  else if ((top1Percentage ?? 0) < BROAD_DISTRIBUTION_PERCENT) status = "BROAD_DISTRIBUTION";
  else status = "MODERATE_DISTRIBUTION";

  return {
    item,
    positiveStaff,
    negativeStaff,
    top1Percentage,
    status,
    hasBackup: (positiveStaff[1]?.percentageOfItemQuantity ?? 0) >= BACKUP_PERCENT,
    message: STATUS_MESSAGE[status],
  };
}

export function itemInsightKey(insight: TopOrderStaffInsight): string {
  return JSON.stringify([insight.item.itemId, insight.item.itemCode]);
}

export function nextSelectedInsightKey(
  visible: readonly TopOrderStaffInsight[],
  current: string | null,
): string | null {
  if (current && visible.some((x) => itemInsightKey(x) === current)) return current;
  return visible[0] ? itemInsightKey(visible[0]) : null;
}

export function selectTopOrderStaffInsights(
  items: readonly TopOrderStaffByItemRow[],
  options: { query: string; sort: TopOrderStaffSort; filter: TopOrderStaffFilter },
): TopOrderStaffInsight[] {
  const query = normalize(options.query.trim());
  const insights = items.map(buildTopOrderStaffInsight).filter((insight) => {
    const matchesQuery = query.length === 0 || normalize(`${insight.item.itemCode} ${insight.item.itemName}`).includes(query);
    const matchesFilter =
      options.filter === "ALL" ||
      (options.filter === "TRAINING" && insight.status === "HIGH_CONCENTRATION" && !insight.hasBackup) ||
      (options.filter === "LOW_SAMPLE" && insight.status === "LOW_SAMPLE") ||
      (options.filter === "REFUND_REVIEW" && insight.status === "REFUND_REVIEW");
    return matchesQuery && matchesFilter;
  });

  return insights.sort((left, right) => {
    if (options.sort === "NAME_ASC") return left.item.itemName.localeCompare(right.item.itemName, "vi");
    if (options.sort === "CONCENTRATION_DESC") return (right.top1Percentage ?? -Infinity) - (left.top1Percentage ?? -Infinity);
    return right.item.totalQuantity - left.item.totalQuantity;
  });
}
