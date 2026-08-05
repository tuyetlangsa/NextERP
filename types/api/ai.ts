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

export interface ConversationSummary {
  id: number;
  title: string | null;
  messageCount: number;
  updatedAt: string;
}

export interface ConversationTurn {
  role: "USER" | "ASSISTANT";
  content: string;
  visualizations: ChatVisualization[] | null;
}

export interface ConversationDetail {
  conversationId: number;
  title: string | null;
  turns: ConversationTurn[];
}

export interface KnowledgeSummary {
  id: number;
  title: string;
  isActive: boolean;
  updatedAt: string;
}

export interface KnowledgeDetail {
  id: number;
  title: string;
  content: string;
  isActive: boolean;
  updatedAt: string;
}

export interface KnowledgeUpsert {
  title: string;
  content: string;
  isActive: boolean;
}
