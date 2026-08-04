export interface AiUsageStats {
  conversationCount: number;
  messageCount: number;
  toolCallCount: number;
  toolErrorCount: number;
  toolErrorRate: number;
  avgToolLatencyMs: number;
  p95ToolLatencyMs: number | null;
  totalTokens: number;
  topTools: { toolName: string; count: number; errorCount: number; avgLatencyMs: number }[];
}

export interface AiConvRow {
  id: number;
  title: string | null;
  ownerName: string | null;
  status: string;
  messageCount: number;
  updatedAt: string;
}

export interface AiToolCallTrace {
  id: number;
  toolName: string;
  inputJson: string;
  outputJson: string | null;
  status: string;
  errorMessage: string | null;
  latencyMs: number | null;
  createdAt: string;
}

export interface AiMessageTrace {
  id: number;
  role: "USER" | "ASSISTANT" | "TOOL_CALL" | "SYSTEM";
  content: string;
  sequenceNumber: number;
  tokenCount: number | null;
  hasVisualization: boolean;
  createdAt: string;
  toolCalls: AiToolCallTrace[];
}

export interface AiConvTrace {
  id: number;
  title: string | null;
  ownerName: string | null;
  status: string;
  startedAt: string;
  endedAt: string | null;
  messages: AiMessageTrace[];
}
