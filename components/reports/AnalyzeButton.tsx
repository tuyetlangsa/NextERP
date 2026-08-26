"use client";

import { requestAiAnalysis } from "@/lib/ai/analyzeBus";
import type { AiReportType } from "@/types/api/ai";

interface AnalyzeButtonProps {
  reportType: AiReportType;
  reportName: string;
  data: unknown;
  filters?: Record<string, unknown>;
  selectedItemId?: number;
}

/**
 * "Phân tích bằng AI" — sends this report's currently-loaded data to the floating
 * AI dock as a NEW conversation. Disabled until data is present.
 */
export function AnalyzeButton({ reportType, reportName, data, filters, selectedItemId }: AnalyzeButtonProps) {
  const disabled = data == null || (Array.isArray(data) && data.length === 0);
  return (
    <button
      type="button"
      onClick={() => !disabled && requestAiAnalysis({ reportType, reportName, data, filters, selectedItemId })}
      disabled={disabled}
      className="px-3 py-1.5 text-sm text-purple-700 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100 disabled:opacity-40 disabled:cursor-not-allowed"
      title="Gửi dữ liệu báo cáo này cho Trợ lý AI phân tích"
    >
      Phân tích bằng AI
    </button>
  );
}
