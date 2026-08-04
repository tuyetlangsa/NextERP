"use client";

import { useCallback, useState } from "react";
import { aiApi } from "@/lib/api/ai";
import type { ChatVisualization, ConversationSummary } from "@/types/api/ai";

export interface ChatTurn {
  role: "user" | "ai";
  text: string;
  visualizations?: ChatVisualization[];
}

export function useAiChat() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<number | undefined>();
  const [sessions, setSessions] = useState<ConversationSummary[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const send = useCallback(async () => {
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
  }, [input, busy, conversationId]);

  const refreshSessions = useCallback(async () => {
    setLoadingSessions(true);
    const res = await aiApi.listConversations();
    setLoadingSessions(false);
    if (res.isSuccess && res.data) setSessions(res.data);
  }, []);

  const startNew = useCallback(() => {
    setTurns([]);
    setConversationId(undefined);
  }, []);

  const openSession = useCallback(async (id: number) => {
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
  }, []);

  return {
    turns,
    input,
    setInput,
    busy,
    conversationId,
    sessions,
    loadingSessions,
    send,
    refreshSessions,
    startNew,
    openSession,
  };
}
