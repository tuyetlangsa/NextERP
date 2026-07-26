// components/reports/ReportSummaryCards.tsx
"use client";

export interface MetricCard {
  label: string;
  value: string;
  sub?: string;
  color?: "default" | "green" | "red" | "amber";
}

interface Props {
  cards: MetricCard[];
}

const colorMap: Record<string, string> = {
  default: "bg-white border-gray-200",
  green: "bg-green-50 border-green-200 text-green-800",
  red: "bg-red-50 border-red-200 text-red-800",
  amber: "bg-amber-50 border-amber-200 text-amber-800",
};

export function ReportSummaryCards({ cards }: Props) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 p-3">
      {cards.map((c, i) => (
        <div
          key={i}
          className={`rounded-lg border px-3 py-2 ${colorMap[c.color ?? "default"]}`}
        >
          <div className="text-xs text-gray-500">{c.label}</div>
          <div className="text-lg font-semibold">{c.value}</div>
          {c.sub && <div className="text-xs text-gray-400 mt-0.5">{c.sub}</div>}
        </div>
      ))}
    </div>
  );
}
