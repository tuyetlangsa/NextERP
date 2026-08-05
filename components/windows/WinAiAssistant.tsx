"use client";

import { useEffect } from "react";
import { useAiChat } from "@/components/ai/useAiChat";
import { ChatThread } from "@/components/ai/ChatThread";

const SUGGESTIONS = [
  "Doanh thu 7 ngày qua thế nào?",
  "Top 5 món bán chạy tháng này",
  "So sánh doanh thu tuần này với tuần trước",
  "Tồn kho nào đang thấp?",
];

export function WinAiAssistant() {
  const chat = useAiChat();

  useEffect(() => {
    chat.refreshSessions();
  }, [chat.refreshSessions]);

  return (
    <div className="flex h-full min-h-0">
      {/* Left: permanent session sidebar */}
      <div className="w-64 shrink-0 border-r border-gray-200 flex flex-col min-h-0">
        <div className="p-2 border-b border-gray-200">
          <button
            onClick={chat.startNew}
            className="w-full px-2 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Cuộc trò chuyện mới
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          {chat.loadingSessions && <div className="p-2 text-xs text-gray-400">Đang tải…</div>}
          {!chat.loadingSessions && chat.sessions.length === 0 && (
            <div className="p-2 text-xs text-gray-400">Chưa có phiên chat nào.</div>
          )}
          {chat.sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => chat.openSession(s.id)}
              className={`block w-full text-left px-3 py-2 text-sm border-b border-gray-100 hover:bg-gray-50 ${
                s.id === chat.conversationId ? "bg-blue-50" : ""
              }`}
            >
              <div className="truncate font-medium text-gray-800">{s.title ?? "(không tiêu đề)"}</div>
              <div className="text-xs text-gray-400">{new Date(s.updatedAt).toLocaleString("vi-VN")}</div>
            </button>
          ))}
        </div>
      </div>
      {/* Right: chat */}
      <div className="flex-1 min-w-0">
        <ChatThread
          turns={chat.turns}
          input={chat.input}
          setInput={chat.setInput}
          busy={chat.busy}
          send={chat.send}
          suggestions={SUGGESTIONS}
        />
      </div>
    </div>
  );
}
