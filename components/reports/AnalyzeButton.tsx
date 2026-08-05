"use client";

import { requestAiAnalysis } from "@/lib/ai/analyzeBus";

/**
 * "Phân tích bằng AI" — sends this report's currently-loaded data to the floating
 * AI dock as a NEW conversation. Disabled until data is present.
 */
export function AnalyzeButton({ reportName, data }: { reportName: string; data: unknown }) {
  const disabled = data == null || (Array.isArray(data) && data.length === 0);
  return (
    <button
      type="button"
      onClick={() => !disabled && requestAiAnalysis({ reportName, data })}
      disabled={disabled}
      className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed"
      title="Gửi dữ liệu báo cáo này cho Trợ lý AI phân tích"
    >
      {"\u{1F916}"} Phân tích bằng AI
    </button>
  );
}
