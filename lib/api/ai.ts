"use client";

import { http } from "@/lib/http/client";
import type { ConversationDetail, ConversationSummary, SendChatRequest, SendChatResponse } from "@/types/api/ai";

export const aiApi = {
  chat: (request: SendChatRequest) =>
    http.post<SendChatResponse>("/api/ai/chat", request),
  listConversations: () => http.get<ConversationSummary[]>("/api/ai/conversations"),
  getConversation: (id: number) => http.get<ConversationDetail>(`/api/ai/conversations/${id}`),
};
