"use client";

import { http } from "@/lib/http/client";
import type { HttpOptions } from "@/lib/http/client";
import type { ConversationDetail, ConversationSummary, SendChatRequest, SendChatResponse } from "@/types/api/ai";

export const aiApi = {
  chat: (request: SendChatRequest, options?: HttpOptions) =>
    http.post<SendChatResponse>("/api/ai/chat", request, options),
  listConversations: (options?: HttpOptions) =>
    http.get<ConversationSummary[]>("/api/ai/conversations", options),
  getConversation: (id: number, options?: HttpOptions) =>
    http.get<ConversationDetail>(`/api/ai/conversations/${id}`, options),
};
