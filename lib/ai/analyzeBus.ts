"use client";

import type { AiReportType, SendChatRequest } from "@/types/api/ai";

/**
 * A tiny module-level event bus so any report tab can ask the floating AI dock to
 * analyze its currently-loaded data. The dock subscribes; report tabs publish.
 * Kept outside React state deliberately — it's a one-shot command, not shared state.
 */
export interface AnalyzeRequest {
  reportType: AiReportType;
  reportName: string;
  data: unknown;
  filters?: Record<string, unknown>;
  selectedItemId?: number;
}

type Listener = (req: AnalyzeRequest) => void;

const listeners = new Set<Listener>();

export function requestAiAnalysis(req: AnalyzeRequest): void {
  listeners.forEach((l) => l(req));
}

export function subscribeAiAnalysis(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Builds the user-visible label separately from the structured report payload. */
export function buildReportAnalysisRequest(req: AnalyzeRequest): SendChatRequest {
  return {
    message: `Phân tích báo cáo ${req.reportName}`,
    reportContext: {
      reportType: req.reportType,
      filters: req.filters ?? {},
      ...(req.selectedItemId === undefined ? {} : { selectedItemId: req.selectedItemId }),
      data: req.data,
    },
  };
}
