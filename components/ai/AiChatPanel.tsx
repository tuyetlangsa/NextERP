"use client";

import { useState } from "react";
import { aiApi } from "@/lib/api/ai";
import type { ChatVisualization } from "@/types/api/ai";
import { VisualizationRenderer } from "@/components/ai/VisualizationRenderer";

interface Turn {
  role: "user" | "ai";
  text: string;
  visualizations?: ChatVisualization[];
}

export function AiChatPanel() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<number | undefined>();

  const send = async () => {
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    setTurns((t) => [...t, { role: "user", text: message }]);
    setBusy(true);
    const res = await aiApi.chat(message, conversationId);
    setBusy(false);
    if (res.isSuccess && res.data) {
      const data = res.data;
      setConversationId(data.conversationId);
      setTurns((t) => [...t, { role: "ai", text: data.narrative, visualizations: data.visualizations }]);
    } else {
      setTurns((t) => [...t, { role: "ai", text: res.detail ?? "Lỗi khi gọi AI." }]);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {turns.map((turn, i) => (
          <div key={i} className={turn.role === "user" ? "text-right" : "text-left"}>
            <div className={`inline-block max-w-[90%] rounded-lg px-3 py-2 text-sm ${
              turn.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"}`}>
              {turn.text}
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
          placeholder="Hỏi về doanh thu…"
          className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm"
        />
        <button onClick={send} disabled={busy}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded disabled:opacity-40">Gửi</button>
      </div>
    </div>
  );
}
