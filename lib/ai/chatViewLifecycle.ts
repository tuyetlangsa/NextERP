import type { HttpOptions } from "@/lib/http/client";
import type {
  ConversationDetail,
  ConversationSummary,
  SendChatRequest,
  SendChatResponse,
} from "@/types/api/ai";

export interface AiChatResult<T> {
  isSuccess: boolean;
  data: T | null;
  detail?: string | null;
}

export interface AiChatRequestClient {
  chat(request: SendChatRequest, options?: HttpOptions): Promise<AiChatResult<SendChatResponse>>;
  listConversations(options?: HttpOptions): Promise<AiChatResult<ConversationSummary[]>>;
  getConversation(id: number, options?: HttpOptions): Promise<AiChatResult<ConversationDetail>>;
}

/**
 * Owns the three AI-chat request channels. View requests share a generation so
 * starting a blank conversation or opening history invalidates both an active
 * delivery and any older session detail. Session-list refreshes are independently
 * latest-wins because they do not replace the visible conversation.
 */
export class AiChatRequestController {
  private viewGeneration = 0;
  private sessionsGeneration = 0;
  private chatAbort: AbortController | null = null;
  private sessionsAbort: AbortController | null = null;
  private detailAbort: AbortController | null = null;
  private disposed = false;

  constructor(private readonly client: AiChatRequestClient) {}

  resume(): void {
    this.disposed = false;
  }

  invalidateView(): void {
    this.viewGeneration++;
    this.chatAbort?.abort();
    this.detailAbort?.abort();
    this.chatAbort = null;
    this.detailAbort = null;
  }

  async deliver(request: SendChatRequest): Promise<AiChatResult<SendChatResponse> | null> {
    if (this.detailAbort) {
      this.viewGeneration++;
      this.detailAbort.abort();
      this.detailAbort = null;
    }
    this.chatAbort?.abort();
    const abort = new AbortController();
    const generation = this.viewGeneration;
    this.chatAbort = abort;
    const result = await this.client.chat(request, { signal: abort.signal });
    if (!this.isCurrentView(generation, abort, "chat")) return null;
    this.chatAbort = null;
    return result;
  }

  async refreshSessions(): Promise<AiChatResult<ConversationSummary[]> | null> {
    this.sessionsAbort?.abort();
    const abort = new AbortController();
    const generation = ++this.sessionsGeneration;
    this.sessionsAbort = abort;
    const result = await this.client.listConversations({ signal: abort.signal });
    if (
      this.disposed ||
      generation !== this.sessionsGeneration ||
      this.sessionsAbort !== abort ||
      abort.signal.aborted
    ) return null;
    this.sessionsAbort = null;
    return result;
  }

  invalidateSessions(): void {
    this.sessionsGeneration++;
    this.sessionsAbort?.abort();
    this.sessionsAbort = null;
  }

  async openConversation(id: number): Promise<AiChatResult<ConversationDetail> | null> {
    this.invalidateView();
    const abort = new AbortController();
    const generation = this.viewGeneration;
    this.detailAbort = abort;
    const result = await this.client.getConversation(id, { signal: abort.signal });
    if (!this.isCurrentView(generation, abort, "detail")) return null;
    this.detailAbort = null;
    return result;
  }

  dispose(): void {
    this.disposed = true;
    this.viewGeneration++;
    this.sessionsGeneration++;
    this.chatAbort?.abort();
    this.sessionsAbort?.abort();
    this.detailAbort?.abort();
    this.chatAbort = null;
    this.sessionsAbort = null;
    this.detailAbort = null;
  }

  private isCurrentView(
    generation: number,
    abort: AbortController,
    channel: "chat" | "detail",
  ): boolean {
    const active = channel === "chat" ? this.chatAbort : this.detailAbort;
    return !this.disposed && generation === this.viewGeneration && active === abort && !abort.signal.aborted;
  }
}
