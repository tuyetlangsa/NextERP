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

  // Core delivery. `convId` is passed explicitly (not read from state) so a fresh-conversation
  // send isn't defeated by the async state update of conversationId. `reset` starts a clean thread.
  // `displayText` is what the user bubble shows; `message` is what's actually sent to the model
  // (they differ for "Phân tích": the model gets the raw JSON, the bubble shows a clean label).
  const deliver = useCallback(
    async (message: string, convId: number | undefined, reset: boolean, displayText?: string) => {
      const text = message.trim();
      if (!text || busy) return;
      const bubble = displayText ?? text;
      setBusy(true);
      setTurns((t) => (reset ? [{ role: "user", text: bubble }] : [...t, { role: "user", text: bubble }]));
      const res = await aiApi.chat(text, convId);
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
    await deliver(message, conversationId, false);
  }, [input, conversationId, deliver]);

  // Send a pre-composed message as a BRAND-NEW conversation (used by "Phân tích bằng AI").
  // Pass `displayText` to show a clean label in the bubble instead of the raw JSON payload.
  const sendFresh = useCallback(async (text: string, displayText?: string) => {
    setConversationId(undefined);
    await deliver(text, undefined, true, displayText);
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
