"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { aiApi } from "@/lib/api/ai";
import {
  ChatRequestLifecycle,
  ChatRequestScheduler,
  createFreshChatRequest,
  createManualChatRequest,
} from "@/lib/ai/chatRequestScheduler";
import { AiChatRequestController } from "@/lib/ai/chatViewLifecycle";
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
  const lifecycleRef = useRef(new ChatRequestLifecycle<PendingFreshRequest>());
  const requestControllerRef = useRef(new AiChatRequestController(aiApi));
  const startFreshRef = useRef<(pending: PendingFreshRequest, scheduler: ChatRequestScheduler<PendingFreshRequest>) => void>(() => {});

  useEffect(() => {
    lifecycleRef.current.activate();
    requestControllerRef.current.resume();
    return () => {
      lifecycleRef.current.disposeCurrent();
      requestControllerRef.current.dispose();
    };
  }, []);

  const completeDelivery = useCallback((scheduler: ChatRequestScheduler<PendingFreshRequest>) => {
    const next = lifecycleRef.current.complete(scheduler);
    if (next && lifecycleRef.current.isCurrent(scheduler)) startFreshRef.current(next, scheduler);
  }, []);

  // Core delivery. `request.conversationId` is supplied by the caller so a fresh-conversation
  // send isn't defeated by the async state update of conversationId. `reset` starts a clean thread.
  // `displayText` remains separate from the request payload for report-analysis bubbles.
  const deliver = useCallback(
    async (
      request: SendChatRequest,
      reset: boolean,
      displayText: string | undefined,
      scheduler: ChatRequestScheduler<PendingFreshRequest>,
    ) => {
      if (!lifecycleRef.current.isCurrent(scheduler)) return;
      const text = request.message.trim();
      if (!text) return;
      const bubble = displayText ?? text;
      setBusy(true);
      setTurns((t) => (reset ? [{ role: "user", text: bubble }] : [...t, { role: "user", text: bubble }]));
      try {
        const res = await requestControllerRef.current.deliver({ ...request, message: text });
        if (!res || !lifecycleRef.current.isCurrent(scheduler)) return;
        if (res.isSuccess && res.data) {
          const data = res.data;
          setConversationId(data.conversationId);
          setTurns((t) => [...t, { role: "ai", text: data.narrative, visualizations: data.visualizations }]);
        } else {
          setTurns((t) => [...t, { role: "ai", text: res.detail ?? "Lỗi khi gọi AI." }]);
        }
      } catch {
        if (lifecycleRef.current.isCurrent(scheduler)) {
          setTurns((t) => [...t, { role: "ai", text: "Lỗi khi gọi AI." }]);
        }
      } finally {
        if (lifecycleRef.current.isCurrent(scheduler)) {
          setBusy(false);
          completeDelivery(scheduler);
        }
      }
    },
    [completeDelivery],
  );

  const send = useCallback(async () => {
    const scheduler = lifecycleRef.current.current();
    if (!lifecycleRef.current.isCurrent(scheduler)) return;
    const message = input.trim();
    if (!message) return;
    setInput("");
    if (!scheduler.beginManual()) return;
    await deliver(createManualChatRequest(message, conversationId), false, undefined, scheduler);
  }, [input, conversationId, deliver]);

  const startFresh = useCallback((pending: PendingFreshRequest, scheduler: ChatRequestScheduler<PendingFreshRequest>) => {
    if (!lifecycleRef.current.isCurrent(scheduler)) return;
    requestControllerRef.current.invalidateView();
    setConversationId(undefined);
    void deliver(pending.request, true, pending.displayText, scheduler);
  }, [deliver]);
  startFreshRef.current = startFresh;

  // Send a structured report request as a BRAND-NEW conversation.
  const sendFresh = useCallback(async (request: SendChatRequest, displayText?: string) => {
    const scheduler = lifecycleRef.current.current();
    if (!lifecycleRef.current.isCurrent(scheduler)) return;
    const pending = scheduler.beginFresh({
      request: createFreshChatRequest(request),
      displayText,
    });
    if (pending) startFresh(pending, scheduler);
  }, [startFresh]);

  const refreshSessions = useCallback(async () => {
    setLoadingSessions(true);
    const res = await requestControllerRef.current.refreshSessions();
    if (!res) return;
    setLoadingSessions(false);
    if (res.isSuccess && res.data) setSessions(res.data);
  }, []);

  const cancelSessionRefresh = useCallback(() => {
    requestControllerRef.current.invalidateSessions();
    setLoadingSessions(false);
  }, []);

  const startNew = useCallback(() => {
    lifecycleRef.current.invalidate();
    requestControllerRef.current.invalidateView();
    setBusy(false);
    setTurns([]);
    setConversationId(undefined);
  }, []);

  const openSession = useCallback(async (id: number) => {
    lifecycleRef.current.invalidate();
    setBusy(false);
    setTurns([]);
    setConversationId(undefined);
    const res = await requestControllerRef.current.openConversation(id);
    if (!res) return;
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
    cancelSessionRefresh,
    startNew,
    openSession,
  };
}
