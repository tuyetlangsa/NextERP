import type { HttpOptions } from "@/lib/http/client";
import type {
  AiPromptSettings,
  AiPromptVersion,
  AiReportType,
  SaveAiPromptRequest,
} from "@/types/api/ai";

export type PromptScope = Pick<SaveAiPromptRequest, "scope" | "reportType">;
export type PromptDrafts = Record<string, string>;

type PromptResult<T> = {
  isSuccess: boolean;
  data: T | null;
};

export interface AiPromptRequestClient {
  getSettings(options?: HttpOptions): Promise<PromptResult<AiPromptSettings>>;
  history(scope: PromptScope["scope"], reportType?: AiReportType, options?: HttpOptions): Promise<PromptResult<AiPromptVersion[]>>;
}

export function scopeKey(scope: PromptScope): string {
  return scope.scope === "GLOBAL" ? "GLOBAL" : `REPORT:${scope.reportType ?? ""}`;
}

/** Rebase server state without replacing unsaved edits in another scope. */
export function rebasePromptDrafts(
  drafts: PromptDrafts,
  dirtyScopes: ReadonlySet<string>,
  settings: AiPromptSettings,
  committedScope?: string,
): PromptDrafts {
  const next = { ...drafts };
  const serverDrafts: PromptDrafts = { GLOBAL: settings.global?.content ?? "" };
  for (const report of settings.reportTypes) {
    serverDrafts[scopeKey({ scope: "REPORT", reportType: report.code })] = report.active?.content ?? "";
  }
  for (const [key, content] of Object.entries(serverDrafts)) {
    if (!dirtyScopes.has(key) || key === committedScope) next[key] = content;
  }
  return next;
}

/**
 * Owns latest-request-wins and abort semantics for the prompt window.
 * A stale response returns null so callers cannot commit stale data or errors.
 */
export class AiPromptRequestController {
  private settingsGeneration = 0;
  private historyGeneration = 0;
  private settingsAbort: AbortController | null = null;
  private historyAbort: AbortController | null = null;
  private disposed = false;

  constructor(private readonly client: AiPromptRequestClient) {}

  /** Starts a new mounted lifetime after a development-mode effect replay. */
  resume(): void {
    this.disposed = false;
  }

  async loadSettings(): Promise<PromptResult<AiPromptSettings> | null> {
    this.settingsAbort?.abort();
    const abort = new AbortController();
    this.settingsAbort = abort;
    const generation = ++this.settingsGeneration;
    const result = await this.client.getSettings({ signal: abort.signal });
    return this.isCurrentSettings(generation, abort) ? result : null;
  }

  async loadHistory(scope: PromptScope): Promise<(PromptResult<AiPromptVersion[]> & { scopeKey: string }) | null> {
    this.historyAbort?.abort();
    const abort = new AbortController();
    this.historyAbort = abort;
    const generation = ++this.historyGeneration;
    const result = await this.client.history(scope.scope, scope.reportType, { signal: abort.signal });
    if (!this.isCurrentHistory(generation, abort)) return null;
    return { ...result, scopeKey: scopeKey(scope) };
  }

  invalidateHistory(): void {
    this.historyGeneration++;
    this.historyAbort?.abort();
    this.historyAbort = null;
  }

  dispose(): void {
    this.disposed = true;
    this.settingsGeneration++;
    this.historyGeneration++;
    this.settingsAbort?.abort();
    this.historyAbort?.abort();
    this.settingsAbort = null;
    this.historyAbort = null;
  }

  private isCurrentSettings(generation: number, abort: AbortController): boolean {
    return !this.disposed && this.settingsGeneration === generation && this.settingsAbort === abort && !abort.signal.aborted;
  }

  private isCurrentHistory(generation: number, abort: AbortController): boolean {
    return !this.disposed && this.historyGeneration === generation && this.historyAbort === abort && !abort.signal.aborted;
  }
}
