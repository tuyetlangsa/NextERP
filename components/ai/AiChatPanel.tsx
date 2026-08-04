"use client";

import { useState } from "react";
import { useAiChat } from "@/components/ai/useAiChat";
import { ChatThread } from "@/components/ai/ChatThread";

export function AiChatPanel({ suggestions = [] }: { suggestions?: string[] }) {
  const chat = useAiChat();
  const [showList, setShowList] = useState(false);

  const startNew = () => {
    chat.startNew();
    setShowList(false);
  };

  const openSession = async (id: number) => {
    await chat.openSession(id);
    setShowList(false);
  };

  const toggleList = async () => {
    const next = !showList;
    setShowList(next);
    if (next) {
      await chat.refreshSessions();
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
          {chat.loadingSessions && <div className="p-2 text-xs text-gray-400">Đang tải…</div>}
          {!chat.loadingSessions && chat.sessions.length === 0 && (
            <div className="p-2 text-xs text-gray-400">Chưa có phiên chat nào.</div>
          )}
          {!chat.loadingSessions &&
            chat.sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => openSession(s.id)}
                className={`block w-full text-left px-3 py-1.5 text-xs border-b border-gray-100 hover:bg-gray-50 ${
                  s.id === chat.conversationId ? "bg-blue-50" : ""
                }`}
              >
                <div className="truncate font-medium text-gray-800">{s.title ?? "(không tiêu đề)"}</div>
                <div className="text-gray-400">{new Date(s.updatedAt).toLocaleString("vi-VN")}</div>
              </button>
            ))}
        </div>
      )}

      <ChatThread
        turns={chat.turns}
        input={chat.input}
        setInput={chat.setInput}
        busy={chat.busy}
        send={chat.send}
        suggestions={suggestions}
      />
    </div>
  );
}
