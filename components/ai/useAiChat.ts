"use client";

import { useCallback, useState } from "react";
import { aiApi } from "@/lib/api/ai";
import type { ChatVisualization, ConversationSummary, SendChatRequest } from "@/types/api/ai";

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

  // Core delivery. `request.conversationId` is supplied by the caller so a fresh-conversation
  // send isn't defeated by the async state update of conversationId. `reset` starts a clean thread.
  // `displayText` remains separate from the request payload for report-analysis bubbles.
  const deliver = useCallback(
    async (request: SendChatRequest, reset: boolean, displayText?: string) => {
      const text = request.message.trim();
      if (!text || busy) return;
      const bubble = displayText ?? text;
      setBusy(true);
      setTurns((t) => (reset ? [{ role: "user", text: bubble }] : [...t, { role: "user", text: bubble }]));
      const res = await aiApi.chat({ ...request, message: text });
      setBusy(false);
      if (res.isSuccess && res.data) {
        const data = res.data;
        setConversationId(data.conversationId);
        setTurns((t) => [...t, { role: "ai", text: data.narrative, visualizations: data.visualizations }]);
      } else {
        setTurns((t) => [...t, { role: "ai", text: res.detail ?? "Lỗi khi gọi AI." }]);
      }
    },
    [busy],
  );

  const send = useCallback(async () => {
    const message = input.trim();
    if (!message) return;
    setInput("");
    await deliver({ message, conversationId }, false);
  }, [input, conversationId, deliver]);

  // Send a structured report request as a BRAND-NEW conversation.
  const sendFresh = useCallback(async (request: SendChatRequest, displayText?: string) => {
    setConversationId(undefined);
    await deliver({ ...request, conversationId: undefined }, true, displayText);
  }, [deliver]);

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
    sendFresh,
    refreshSessions,
    startNew,
    openSession,
  };
}
