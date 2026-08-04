"use client";

import { useState } from "react";
import { aiApi } from "@/lib/api/ai";
import type { ChatVisualization, ConversationSummary } from "@/types/api/ai";
import { VisualizationRenderer } from "@/components/ai/VisualizationRenderer";

interface Turn {
  role: "user" | "ai";
  text: string;
  visualizations?: ChatVisualization[];
}

export function AiChatPanel({ suggestions = [] }: { suggestions?: string[] }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<number | undefined>();

  const [showList, setShowList] = useState(false);
  const [sessions, setSessions] = useState<ConversationSummary[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

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

  const startNew = () => {
    setTurns([]);
    setConversationId(undefined);
    setShowList(false);
  };

  const openSession = async (id: number) => {
    const res = await aiApi.getConversation(id);
    if (res.isSuccess && res.data) {
      const data = res.data;
      setTurns(
        data.turns.map((turn) => ({
          role: turn.role === "USER" ? "user" : "ai",
          text: turn.content,
          visualizations: turn.visualizations ?? undefined,
        }))
      );
      setConversationId(data.conversationId);
    }
    setShowList(false);
  };

  const toggleList = async () => {
    const next = !showList;
    setShowList(next);
    if (next) {
      setLoadingSessions(true);
      const res = await aiApi.listConversations();
      setLoadingSessions(false);
      if (res.isSuccess && res.data) {
        setSessions(res.data);
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 border-b border-gray-200 px-2 py-1.5">
        <button
          onClick={startNew}
          className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50"
        >
          + Mới
        </button>
        <button
          onClick={toggleList}
          className={`px-2 py-1 text-xs border rounded hover:bg-gray-50 ${
            showList ? "border-blue-400 text-blue-600 bg-blue-50" : "border-gray-200"
          }`}
        >
          Lịch sử
        </button>
      </div>

      {showList && (
        <div className="max-h-40 overflow-auto border-b border-gray-200">
          {loadingSessions && <div className="p-2 text-xs text-gray-400">Đang tải…</div>}
          {!loadingSessions && sessions.length === 0 && (
            <div className="p-2 text-xs text-gray-400">Chưa có phiên chat nào.</div>
          )}
          {!loadingSessions &&
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => openSession(s.id)}
                className={`block w-full text-left px-3 py-1.5 text-xs border-b border-gray-100 hover:bg-gray-50 ${
                  s.id === conversationId ? "bg-blue-50" : ""
                }`}
              >
                <div className="truncate font-medium text-gray-800">{s.title ?? "(không tiêu đề)"}</div>
                <div className="text-gray-400">{new Date(s.updatedAt).toLocaleString("vi-VN")}</div>
              </button>
            ))}
        </div>
      )}

      <div className="flex-1 overflow-auto p-3 space-y-3">
        {turns.length === 0 && suggestions.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-gray-400">Gợi ý câu hỏi:</div>
            {suggestions.map((q) => (
              <button
                key={q}
                onClick={() => { setInput(q); }}
                className="block w-full text-left text-sm border border-gray-200 rounded px-3 py-1.5 hover:bg-gray-50"
              >
                {q}
              </button>
            ))}
          </div>
        )}
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
