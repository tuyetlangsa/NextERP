"use client";

import { useState } from "react";
import { AiChatPanel } from "@/components/ai/AiChatPanel";

const SUGGESTIONS = [
  "Doanh thu 7 ngày qua thế nào?",
  "Top 5 món bán chạy tháng này",
  "So sánh doanh thu tuần này với tuần trước",
  "Phân tích doanh thu từng món tháng này",
];

export function AiAssistantDock() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-[9998] h-12 w-12 rounded-full bg-blue-600 text-white text-xl shadow-lg hover:bg-blue-700"
        title="Trợ lý AI"
        aria-label="Trợ lý AI"
      >
        {"\u{1F916}"}
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-[9999] flex h-[70vh] w-[400px] max-w-[92vw] flex-col rounded-xl border border-gray-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
            <span className="text-sm font-semibold">Trợ lý AI — Doanh thu</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600" aria-label="Đóng">✕</button>
          </div>
          <div className="flex-1 min-h-0">
            <AiChatPanel suggestions={SUGGESTIONS} />
          </div>
        </div>
      )}
    </>
  );
}
