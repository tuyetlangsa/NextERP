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
  private disposed = false;

  beginManual(): boolean {
    if (this.disposed || this.inFlight) return false;
    this.inFlight = true;
    return true;
  }

  beginFresh(request: TFresh): TFresh | null {
    if (this.disposed) return null;
    if (this.inFlight) {
      this.freshQueue.push(request);
      return null;
    }
    this.inFlight = true;
    return request;
  }

  complete(): TFresh | null {
    if (this.disposed) return null;
    const next = this.freshQueue.shift();
    if (next !== undefined) return next;
    this.inFlight = false;
    return null;
  }

  dispose(): void {
    this.disposed = true;
    this.inFlight = false;
    this.freshQueue = [];
  }

  isDisposed(): boolean {
    return this.disposed;
  }
}

/** Owns the current scheduler instance across effect cleanup/reactivation cycles. */
export class ChatRequestLifecycle<TFresh> {
  private scheduler = new ChatRequestScheduler<TFresh>();

  activate(): ChatRequestScheduler<TFresh> {
    if (this.scheduler.isDisposed()) {
      this.scheduler = new ChatRequestScheduler<TFresh>();
    }
    return this.scheduler;
  }

  current(): ChatRequestScheduler<TFresh> {
    return this.scheduler;
  }

  dispose(scheduler: ChatRequestScheduler<TFresh>): void {
    if (scheduler === this.scheduler) scheduler.dispose();
  }

  isCurrent(scheduler: ChatRequestScheduler<TFresh>): boolean {
    return scheduler === this.scheduler && !scheduler.isDisposed();
  }

  complete(scheduler: ChatRequestScheduler<TFresh>): TFresh | null {
    return this.isCurrent(scheduler) ? scheduler.complete() : null;
  }
}
