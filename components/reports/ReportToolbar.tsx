// components/reports/ReportToolbar.tsx
"use client";

import { reportsApi } from "@/lib/api/reports";

interface Props {
  reportType: string;
  filters: Record<string, unknown>;
  disabled?: boolean;
}

export function ReportToolbar({ reportType, filters, disabled }: Props) {
  const handleExport = async (format: "pdf" | "excel") => {
    try {
      const res = (await reportsApi.exportReport(reportType, format, filters)) as unknown as Blob;
      const url = URL.createObjectURL(res);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportType}_${new Date().toISOString().slice(0, 10)}.${format === "pdf" ? "pdf" : "xlsx"}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // handled by parent via error state
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-200">
      <button
        disabled={disabled}
        onClick={() => handleExport("pdf")}
        className="px-3 py-1 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100 disabled:opacity-40"
      >
        {"\u{1F4E5}"} PDF
      </button>
      <button
        disabled={disabled}
        onClick={() => handleExport("excel")}
        className="px-3 py-1 text-sm bg-green-50 text-green-700 rounded hover:bg-green-100 disabled:opacity-40"
      >
        {"\u{1F4CA}"} Excel
      </button>
    </div>
  );
}
