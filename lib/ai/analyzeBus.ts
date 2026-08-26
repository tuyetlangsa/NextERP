"use client";

/**
 * A tiny module-level event bus so any report tab can ask the floating AI dock to
 * analyze its currently-loaded data. The dock subscribes; report tabs publish.
 * Kept outside React state deliberately — it's a one-shot command, not shared state.
 */
export interface AnalyzeRequest {
  reportName: string;
  data: unknown;
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

/** Compose the Vietnamese analysis prompt carrying the report data inline (capped to bound tokens). */
export function buildAnalysisMessage(reportName: string, data: unknown): string {
  let json = JSON.stringify(data, null, 2);
  const CAP = 12000;
  let truncated = false;
  if (json.length > CAP) {
    json = json.slice(0, CAP);
    truncated = true;
  }
  return (
    `Đây là dữ liệu báo cáo "${reportName}" của nhà hàng (định dạng JSON). ` +
    `Hãy phân tích DỰA TRÊN dữ liệu được cung cấp bên dưới — không cần gọi công cụ khác: ` +
    `nhận xét tổng quan, xu hướng, điểm bất thường, và đề xuất hành động cụ thể nếu có. ` +
    `Trả lời ngắn gọn, rõ ràng bằng tiếng Việt` +
    (truncated ? " (dữ liệu đã được rút gọn do quá dài)" : "") +
    `.\n\nDỮ LIỆU:\n\`\`\`json\n${json}\n\`\`\``
  );
}
