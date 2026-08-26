import type { SendChatRequest } from "@/types/api/ai";

export function createManualChatRequest(message: string, conversationId?: number): SendChatRequest {
  return { message, conversationId };
}

export function createFreshChatRequest(request: SendChatRequest): SendChatRequest {
  return { ...request, conversationId: undefined };
}

/**
 * Synchronously coordinates chat delivery outside React's asynchronous state updates.
 * Manual messages retain their current reject-while-busy behavior. Fresh report
 * analyses are retained in first-in-first-out order until they can start.
 */
export class ChatRequestScheduler<TFresh> {
  private inFlight = false;
  private freshQueue: TFresh[] = [];

  beginManual(): boolean {
    if (this.inFlight) return false;
    this.inFlight = true;
    return true;
  }

  beginFresh(request: TFresh): TFresh | null {
    if (this.inFlight) {
      this.freshQueue.push(request);
      return null;
    }
    this.inFlight = true;
    return request;
  }

  complete(): TFresh | null {
    const next = this.freshQueue.shift();
    if (next !== undefined) return next;
    this.inFlight = false;
    return null;
  }
}
