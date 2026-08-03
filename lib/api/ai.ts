"use client";

import { http } from "@/lib/http/client";
import type { SendChatResponse } from "@/types/api/ai";

export const aiApi = {
  chat: (message: string, conversationId?: number) =>
    http.post<SendChatResponse>("/api/ai/chat", { message, conversationId }),
};
