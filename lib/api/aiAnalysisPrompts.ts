"use client";

import { http } from "@/lib/http/client";
import type {
  AiPromptSettings,
  AiPromptVersion,
  AiReportType,
  SaveAiPromptRequest,
} from "@/types/api/ai";

const BASE_PATH = "/api/erp/ai-analysis-prompts";

export const aiAnalysisPromptsApi = {
  getSettings: () => http.get<AiPromptSettings>(BASE_PATH),
  save: (body: SaveAiPromptRequest) => http.put<AiPromptVersion>(BASE_PATH, body),
  history: (scope: SaveAiPromptRequest["scope"], reportType?: AiReportType) =>
    http.get<AiPromptVersion[]>(`${BASE_PATH}/history`, { params: { scope, reportType } }),
  restore: (id: number) => http.post<AiPromptVersion>(`${BASE_PATH}/${id}/restore`),
};
