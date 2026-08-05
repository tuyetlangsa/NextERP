"use client";

import { http } from "@/lib/http/client";
import type { KnowledgeSummary, KnowledgeDetail, KnowledgeUpsert } from "@/types/api/ai";

export const aiKnowledgeApi = {
  list: () => http.get<KnowledgeSummary[]>("/api/ai/knowledge"),
  get: (id: number) => http.get<KnowledgeDetail>(`/api/ai/knowledge/${id}`),
  create: (body: KnowledgeUpsert) => http.post<{ id: number }>("/api/ai/knowledge", body),
  update: (id: number, body: KnowledgeUpsert) => http.put<{ id: number }>(`/api/ai/knowledge/${id}`, body),
  remove: (id: number) => http.delete<null>(`/api/ai/knowledge/${id}`),
};
