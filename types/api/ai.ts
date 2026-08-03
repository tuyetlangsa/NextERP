export interface ChatVisualization {
  kind: "chart" | "table" | "kpi";
  title: string;
  chartType?: "line" | "bar" | "pie" | "area";
  xField?: string;
  series?: { name: string; field: string }[];
  columns?: { field: string; header: string; format?: "money" | "number" | "percent" | "date" }[];
  metrics?: { label: string; value: string; unit?: string }[];
  data?: Record<string, unknown>[];
}

export interface SendChatResponse {
  conversationId: number;
  narrative: string;
  visualizations: ChatVisualization[];
}
