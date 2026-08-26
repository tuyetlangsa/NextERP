import { buildTopOrderStaffBarRows, type TopOrderStaffInsight } from "./topOrderStaffInsights";

export function TopOrderStaffDetail({ insight }: { insight: TopOrderStaffInsight | null }) {
  if (insight === null) {
    return (
      <section className="flex min-h-48 items-center justify-center text-sm text-gray-500" aria-label="Chi tiết món">
        Chọn một món để xem chi tiết
      </section>
    );
  }

  const bars = buildTopOrderStaffBarRows(insight);
  const { item } = insight;
  const chartDescription = bars.length === 0
    ? `Biểu đồ sản lượng nhân viên có sản lượng dương của món ${item.itemName}: không có dữ liệu.`
    : `Biểu đồ sản lượng nhân viên có sản lượng dương của món ${item.itemName}: ${bars
      .map((bar) => `${bar.staffName} ${bar.quantity.toFixed(2)}, ${bar.percentage.toFixed(1)}%`)
      .join("; ")}.`;

  return (
    <section className="flex min-h-0 flex-col gap-4" aria-label="Chi tiết món">
      <header>
        <p className="text-sm text-gray-600">{item.itemCode}</p>
        <h2 className="text-lg font-semibold text-gray-900">{item.itemName}</h2>
        <p className="text-sm text-gray-700">
          Tổng sản lượng: <span className="font-medium">{item.totalQuantity.toFixed(2)} {item.uomCode}</span>
        </p>
      </header>

      <div
        className="space-y-3"
        role="img"
        aria-label={chartDescription}
      >
        {bars.map((bar) => (
          <div key={bar.staffAccountId} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-gray-900">{bar.staffName}</span>
              <span className="shrink-0 text-gray-700">
                {bar.quantity.toFixed(2)} · {bar.percentage.toFixed(1)}%
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded bg-gray-200">
              <div className="h-full rounded bg-blue-600" style={{ width: `${bar.widthPercent}%` }} />
            </div>
          </div>
        ))}
      </div>

      {insight.negativeStaff.length > 0 && (
        <aside className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-900" aria-label="Cảnh báo hoàn món">
          <p className="font-medium">Cảnh báo hoàn món</p>
          <ul className="mt-1 space-y-1">
            {insight.negativeStaff.map((person) => (
              <li key={person.staffAccountId}>
                {person.staffName}: {person.quantity.toFixed(2)} · {person.percentageOfItemQuantity.toFixed(1)}%
              </li>
            ))}
          </ul>
        </aside>
      )}

      <aside className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">
        <p className="font-medium">Nhận định từ dữ liệu</p>
        <p className="mt-1">{insight.message}</p>
      </aside>

      <p className="text-xs text-gray-500">Sản lượng chưa chuẩn hóa theo số ca/giờ.</p>
    </section>
  );
}
