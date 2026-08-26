"use client";

import { http } from "@/lib/http/client";
import type { HttpOptions } from "@/lib/http/client";
import type {
  AiPromptSettings,
  AiPromptHistoryPage,
  AiPromptVersion,
  AiReportType,
  SaveAiPromptRequest,
} from "@/types/api/ai";

const BASE_PATH = "/api/erp/ai-analysis-prompts";

export const aiAnalysisPromptsApi = {
  getSettings: (options?: HttpOptions) => http.get<AiPromptSettings>(BASE_PATH, options),
  save: (body: SaveAiPromptRequest) => http.put<AiPromptVersion>(BASE_PATH, body),
  history: (
    scope: SaveAiPromptRequest["scope"],
    reportType: AiReportType | undefined,
    pageSize: number,
    beforeVersionNumber?: number,
    options?: HttpOptions,
  ) =>
    http.get<AiPromptHistoryPage>(`${BASE_PATH}/history`, {
      ...options,
      params: { ...options?.params, scope, reportType, pageSize, beforeVersionNumber },
    }),
  restore: (id: number) => http.post<AiPromptVersion>(`${BASE_PATH}/${id}/restore`),
};
