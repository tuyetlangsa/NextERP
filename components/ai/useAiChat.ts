"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { aiApi } from "@/lib/api/ai";
import {
  ChatRequestScheduler,
  createFreshChatRequest,
  createManualChatRequest,
} from "@/lib/ai/chatRequestScheduler";
import type { ChatVisualization, ConversationSummary, SendChatRequest } from "@/types/api/ai";

export interface ChatTurn {
  role: "user" | "ai";
  text: string;
  visualizations?: ChatVisualization[];
}

interface PendingFreshRequest {
  request: SendChatRequest;
  displayText?: string;
}

export function useAiChat() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<number | undefined>();
  const [sessions, setSessions] = useState<ConversationSummary[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const schedulerRef = useRef(new ChatRequestScheduler<PendingFreshRequest>());
  const disposedRef = useRef(false);
  const startFreshRef = useRef<(pending: PendingFreshRequest) => void>(() => {});

  useEffect(() => {
    disposedRef.current = false;
    schedulerRef.current = new ChatRequestScheduler<PendingFreshRequest>();
    return () => {
      disposedRef.current = true;
      schedulerRef.current.dispose();
    };
  }, []);

  const completeDelivery = useCallback(() => {
    if (disposedRef.current) return;
    const next = schedulerRef.current.complete();
    if (next && !disposedRef.current) startFreshRef.current(next);
  }, []);

  // Core delivery. `request.conversationId` is supplied by the caller so a fresh-conversation
  // send isn't defeated by the async state update of conversationId. `reset` starts a clean thread.
  // `displayText` remains separate from the request payload for report-analysis bubbles.
  const deliver = useCallback(
    async (request: SendChatRequest, reset: boolean, displayText?: string) => {
      if (disposedRef.current) return;
      const text = request.message.trim();
      if (!text) return;
      const bubble = displayText ?? text;
      setBusy(true);
      setTurns((t) => (reset ? [{ role: "user", text: bubble }] : [...t, { role: "user", text: bubble }]));
      try {
        const res = await aiApi.chat({ ...request, message: text });
        if (disposedRef.current) return;
        if (res.isSuccess && res.data) {
          const data = res.data;
          setConversationId(data.conversationId);
          setTurns((t) => [...t, { role: "ai", text: data.narrative, visualizations: data.visualizations }]);
        } else {
          setTurns((t) => [...t, { role: "ai", text: res.detail ?? "Lỗi khi gọi AI." }]);
        }
      } catch {
        if (!disposedRef.current) {
          setTurns((t) => [...t, { role: "ai", text: "Lỗi khi gọi AI." }]);
        }
      } finally {
        if (!disposedRef.current) {
          setBusy(false);
          completeDelivery();
        }
      }
    },
    [completeDelivery],
  );

  const send = useCallback(async () => {
    if (disposedRef.current) return;
    const message = input.trim();
    if (!message) return;
    setInput("");
    if (!schedulerRef.current.beginManual()) return;
    await deliver(createManualChatRequest(message, conversationId), false);
  }, [input, conversationId, deliver]);

  const startFresh = useCallback((pending: PendingFreshRequest) => {
    if (disposedRef.current) return;
    setConversationId(undefined);
    void deliver(pending.request, true, pending.displayText);
  }, [deliver]);
  startFreshRef.current = startFresh;

  // Send a structured report request as a BRAND-NEW conversation.
  const sendFresh = useCallback(async (request: SendChatRequest, displayText?: string) => {
    if (disposedRef.current) return;
    const pending = schedulerRef.current.beginFresh({
      request: createFreshChatRequest(request),
      displayText,
    });
    if (pending) startFresh(pending);
  }, [startFresh]);

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
