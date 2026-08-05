"use client";

import type { ChatTurn } from "@/components/ai/useAiChat";
import { VisualizationRenderer } from "@/components/ai/VisualizationRenderer";
import { Markdown } from "@/components/ai/Markdown";

export function ChatThread({
  turns,
  input,
  setInput,
  busy,
  send,
  suggestions = [],
}: {
  turns: ChatTurn[];
  input: string;
  setInput: (v: string) => void;
  busy: boolean;
  send: () => void;
  suggestions?: string[];
}) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {turns.length === 0 && suggestions.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-gray-400">Gợi ý câu hỏi:</div>
            {suggestions.map((q) => (
              <button
                key={q}
                onClick={() => setInput(q)}
                className="block w-full text-left text-sm border border-gray-200 rounded px-3 py-1.5 hover:bg-gray-50"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        {turns.map((turn, i) => (
          <div key={i} className={turn.role === "user" ? "text-right" : "text-left"}>
            <div
              className={`inline-block max-w-[90%] rounded-lg px-3 py-2 text-sm text-left ${
                turn.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
              }`}
            >
              {turn.role === "user" ? turn.text : <Markdown text={turn.text} />}
            </div>
            {turn.visualizations?.map((v, j) => <VisualizationRenderer key={j} viz={v} />)}
          </div>
        ))}
        {busy && <div className="text-sm text-gray-400">AI đang trả lời…</div>}
      </div>
      <div className="flex items-center gap-2 border-t border-gray-200 p-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Hỏi về doanh thu, tồn kho, chênh lệch quỹ…"
          className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm"
        />
        <button
          onClick={send}
          disabled={busy}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded disabled:opacity-40"
        >
          Gửi
        </button>
      </div>
    </div>
  );
}
