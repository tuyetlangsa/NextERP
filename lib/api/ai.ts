"use client";

import { http } from "@/lib/http/client";
import type { ConversationDetail, ConversationSummary, SendChatResponse } from "@/types/api/ai";

export const aiApi = {
  chat: (message: string, conversationId?: number) =>
    http.post<SendChatResponse>("/api/ai/chat", { message, conversationId }),
  listConversations: () => http.get<ConversationSummary[]>("/api/ai/conversations"),
  getConversation: (id: number) => http.get<ConversationDetail>(`/api/ai/conversations/${id}`),
};
