"use client";

import { http } from "@/lib/http/client";
import type { AiUsageStats, AiConvRow, AiConvTrace } from "@/types/api/aiMonitor";

export const aiMonitorApi = {
  stats: (days = 7) => http.get<AiUsageStats>(`/api/ai/monitor/stats?days=${days}`),
  conversations: (take = 100) => http.get<AiConvRow[]>(`/api/ai/monitor/conversations?take=${take}`),
  trace: (id: number) => http.get<AiConvTrace>(`/api/ai/monitor/conversations/${id}`),
};
