"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChromeIcons } from "@/components/desktop/icons";
import { StatusBar } from "@/components/ui/StatusBar";
import { TB, WinToolbar } from "@/components/ui/WinToolbar";
import { aiAnalysisPromptsApi } from "@/lib/api/aiAnalysisPrompts";
import {
  AiPromptRequestController,
  scopeKey,
  settleSettingsReload,
  type PromptDrafts,
  type PromptScope,
} from "@/lib/ai/analysisPromptWindowController";
import { formatApiError } from "@/lib/http/formatError";
import type { AiPromptSettings, AiPromptVersion, AiReportType } from "@/types/api/ai";

type Tab = "GLOBAL" | "REPORT";
type HistoryState = { scopeKey: string; items: AiPromptVersion[] };

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("vi-VN");
}

function versionMeta(version: AiPromptVersion | null): React.ReactNode {
  if (!version) return <span>Chưa có phiên bản tuỳ chỉnh.</span>;
  return <span>Phiên bản {version.versionNumber} · {version.createdByFullName} · {formatDate(version.createdAt)}</span>;
}

export function WinAiAnalysisPrompt() {
  const controllerRef = useRef<AiPromptRequestController | null>(null);
  if (!controllerRef.current) controllerRef.current = new AiPromptRequestController(aiAnalysisPromptsApi);
  const controller = controllerRef.current;
  const mountedRef = useRef(true);
  const dirtyScopesRef = useRef<Set<string>>(new Set());
  const draftsRef = useRef<PromptDrafts>({});
  const draftRevisionsRef = useRef<Record<string, number>>({});
  const pendingCommittedScopesRef = useRef<Record<string, number>>({});

  const [tab, setTab] = useState<Tab>("GLOBAL");
  const [settings, setSettings] = useState<AiPromptSettings | null>(null);
  const [selectedReportType, setSelectedReportType] = useState<AiReportType | "">("");
  const [drafts, setDrafts] = useState<PromptDrafts>({});
  const [initialized, setInitialized] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<HistoryState | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const selectedReport = useMemo(
    () => settings?.reportTypes.find(report => report.code === selectedReportType) ?? null,
    [settings, selectedReportType],
  );
  const currentScope: PromptScope | null = tab === "GLOBAL"
    ? { scope: "GLOBAL" }
    : selectedReportType ? { scope: "REPORT", reportType: selectedReportType } : null;
  const currentScopeKey = currentScope ? scopeKey(currentScope) : null;
  const activeVersion = tab === "GLOBAL" ? settings?.global ?? null : selectedReport?.active ?? null;
  const draft = currentScopeKey ? drafts[currentScopeKey] ?? activeVersion?.content ?? "" : "";
  const interactionLocked = settingsLoading || saving;

  const reloadSettings = useCallback(async (committedScope?: string) => {
    if (committedScope) {
      pendingCommittedScopesRef.current = {
        ...pendingCommittedScopesRef.current,
        [committedScope]: draftRevisionsRef.current[committedScope] ?? 0,
      };
    }
    setSettingsLoading(true);
    const result = await controller.loadSettings();
    if (!result || !mountedRef.current) return "stale" as const;

    const settled = settleSettingsReload({
      drafts: draftsRef.current,
      dirtyScopes: dirtyScopesRef.current,
      draftRevisions: draftRevisionsRef.current,
      pendingCommittedScopes: pendingCommittedScopesRef.current,
    }, result);
    if (settled.outcome === "applied" && settled.settings) {
      draftsRef.current = settled.drafts;
      dirtyScopesRef.current = new Set(settled.dirtyScopes);
      draftRevisionsRef.current = settled.draftRevisions;
      pendingCommittedScopesRef.current = settled.pendingCommittedScopes;
      setSettings(settled.settings);
      setDrafts(settled.drafts);
      setInitialized(true);
      setSettingsError(null);
    } else if (settled.outcome === "failed" && settled.errorChannel === "settings") {
      setSettingsError(formatApiError(result as unknown as Parameters<typeof formatApiError>[0]));
    }
    setSettingsLoading(false);
    return settled.outcome;
  }, [controller]);

  useEffect(() => {
    mountedRef.current = true;
    controller.resume();
    void reloadSettings();
    return () => {
      mountedRef.current = false;
      controller.dispose();
    };
  }, [controller, reloadSettings]);

  useEffect(() => {
    if (!settings?.reportTypes.length) return;
    if (!selectedReportType || !settings.reportTypes.some(report => report.code === selectedReportType)) {
      setSelectedReportType(settings.reportTypes[0].code);
    }
  }, [settings, selectedReportType]);

  function currentScopeOrError(): PromptScope | null {
    if (currentScope) return currentScope;
    setActionError("Chưa có loại báo cáo để thao tác.");
    return null;
  }

  async function loadHistory(scope = currentScopeOrError()) {
    if (!scope || !initialized) return;
    setHistoryLoading(true);
    setHistoryError(null);
    const result = await controller.loadHistory(scope);
    if (!result || !mountedRef.current) return;

    if (result.isSuccess && result.data) {
      setHistory({ scopeKey: result.scopeKey, items: result.data });
    } else {
      setHistoryError(formatApiError(result as unknown as Parameters<typeof formatApiError>[0]));
    }
    setHistoryLoading(false);
  }

  function invalidateHistory() {
    controller.invalidateHistory();
    setHistoryLoading(false);
    setHistory(null);
  }

  function changeTab(next: Tab) {
    if (interactionLocked) return;
    invalidateHistory();
    setTab(next);
    setHistoryError(null);
    setActionError(null);
  }

  function changeReportType(next: AiReportType | "") {
    if (interactionLocked) return;
    invalidateHistory();
    setSelectedReportType(next);
    setHistoryError(null);
    setActionError(null);
  }

  function changeDraft(content: string) {
    if (!currentScopeKey || interactionLocked) return;
    dirtyScopesRef.current = new Set(dirtyScopesRef.current).add(currentScopeKey);
    draftRevisionsRef.current = {
      ...draftRevisionsRef.current,
      [currentScopeKey]: (draftRevisionsRef.current[currentScopeKey] ?? 0) + 1,
    };
    const { [currentScopeKey]: _resolvedPendingScope, ...pendingScopes } = pendingCommittedScopesRef.current;
    pendingCommittedScopesRef.current = pendingScopes;
    const next = { ...draftsRef.current, [currentScopeKey]: content };
    draftsRef.current = next;
    setDrafts(next);
  }

  async function save() {
    const scope = currentScopeOrError();
    if (!initialized || !scope || draft.length > 4000) return;

    const scopeId = scopeKey(scope);
    const content = draft.trim();
    const reloadHistoryAfterSave = history?.scopeKey === scopeId;
    controller.invalidateHistory();
    setHistoryLoading(false);
    setHistory(null);
    setSaving(true);
    setActionError(null);
    const result = await aiAnalysisPromptsApi.save({ ...scope, content });
    if (!mountedRef.current) return;

    if (result.isSuccess) {
      await reloadSettings(scopeId);
      if (reloadHistoryAfterSave) await loadHistory(scope);
    } else {
      setActionError(formatApiError(result));
    }
    if (mountedRef.current) setSaving(false);
  }

  async function restore(version: AiPromptVersion) {
    const scope = currentScopeOrError();
    if (!initialized || !scope || !currentScopeKey || history?.scopeKey !== currentScopeKey) return;
    if (!window.confirm(`Khôi phục phiên bản ${version.versionNumber}? Thao tác này sẽ tạo một phiên bản mới.`)) return;

    const scopeId = currentScopeKey;
    controller.invalidateHistory();
    setHistoryLoading(false);
    setHistory(null);
    setSaving(true);
    setActionError(null);
    const result = await aiAnalysisPromptsApi.restore(version.id);
    if (!mountedRef.current) return;

    if (result.isSuccess) {
      await reloadSettings(scopeId);
      await loadHistory(scope);
    } else {
      setActionError(formatApiError(result));
    }
    if (mountedRef.current) setSaving(false);
  }

  return (
    <>
      <WinToolbar
        left={
          <>
            <TB icon={ChromeIcons.Save} kind="primary" onClick={() => void save()} disabled={!initialized || interactionLocked || draft.length > 4000}>
              {saving ? "Đang lưu..." : "Lưu và áp dụng"}
            </TB>
            <TB icon={ChromeIcons.History} onClick={() => void loadHistory()} disabled={!initialized || saving || historyLoading}>
              {historyLoading ? "Đang tải..." : "Xem lịch sử"}
            </TB>
            <div className="tb-divider" />
            <TB icon={ChromeIcons.Refresh} onClick={() => void reloadSettings()} disabled={saving}>Làm mới</TB>
          </>
        }
      />

      <div className="win-body" style={{ minHeight: 0 }}>
        <main className="data-list" style={{ padding: 16, overflowY: "auto" }}>
          {!initialized ? (
            <div role="alert" aria-live="assertive" style={{ color: settingsError ? "var(--danger)" : "var(--fg-muted)", fontSize: 13 }}>
              {settingsError ?? "Đang tải cấu hình prompt..."}
              {settingsError && <button className="tb-btn" style={{ marginLeft: 10 }} onClick={() => void reloadSettings()}>Thử lại</button>}
            </div>
          ) : (
            <>
              <div role="tablist" aria-label="Phạm vi prompt" style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
                <button id="ai-prompt-tab-global" role="tab" aria-selected={tab === "GLOBAL"} aria-controls="ai-prompt-panel-global" disabled={interactionLocked} onClick={() => changeTab("GLOBAL")} style={tabButtonStyle(tab === "GLOBAL")}>
                  Prompt chung
                </button>
                <button id="ai-prompt-tab-report" role="tab" aria-selected={tab === "REPORT"} aria-controls="ai-prompt-panel-report" disabled={interactionLocked} onClick={() => changeTab("REPORT")} style={tabButtonStyle(tab === "REPORT")}>
                  Theo báo cáo
                </button>
              </div>

              <div id={`ai-prompt-panel-${tab.toLowerCase()}`} role="tabpanel" aria-labelledby={`ai-prompt-tab-${tab.toLowerCase()}`} style={{ maxWidth: 760 }}>
                {tab === "REPORT" && (
                  <label style={fieldLabelStyle}>
                    Loại báo cáo
                    <select value={selectedReportType} disabled={interactionLocked} onChange={event => changeReportType(event.target.value as AiReportType | "")} style={fieldStyle}>
                      {settings?.reportTypes.map(report => <option key={report.code} value={report.code}>{report.label}</option>)}
                    </select>
                  </label>
                )}

                <label style={fieldLabelStyle}>
                  {tab === "GLOBAL" ? "Prompt bổ sung chung" : "Prompt bổ sung"}
                  <textarea value={draft} maxLength={4000} disabled={interactionLocked || !currentScope} onChange={event => changeDraft(event.target.value)} placeholder="Nhập hướng dẫn bổ sung cho AI..." rows={14} style={{ ...fieldStyle, minHeight: 260, resize: "vertical", fontFamily: "inherit" }} />
                </label>
                <div style={{ display: "flex", justifyContent: "space-between", color: draft.length > 4000 ? "var(--danger)" : "var(--fg-muted)", fontSize: 12 }}>
                  <span>Chỉ nội dung bổ sung; prompt hệ thống cốt lõi không hiển thị ở đây.</span>
                  <span>{draft.length} / 4000</span>
                </div>
                <div style={{ marginTop: 12, color: "var(--fg-muted)", fontSize: 12 }}>{versionMeta(activeVersion)}</div>
              </div>
            </>
          )}

          {initialized && settingsLoading && <div style={{ color: "var(--fg-muted)", fontSize: 12, marginTop: 12 }}>Đang làm mới cấu hình...</div>}
          {initialized && settingsError && <ErrorMessage>{settingsError}</ErrorMessage>}
          {initialized && historyError && <ErrorMessage>{historyError}</ErrorMessage>}
          {initialized && actionError && <ErrorMessage>{actionError}</ErrorMessage>}
        </main>

        {history && history.scopeKey === currentScopeKey && (
          <aside aria-label="Lịch sử phiên bản" style={{ width: 350, flexShrink: 0, borderLeft: "1px solid var(--border)", padding: 12, overflowY: "auto" }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Lịch sử phiên bản</div>
            {history.items.length === 0 ? <div style={{ color: "var(--fg-muted)", fontSize: 12 }}>Chưa có phiên bản nào.</div> : history.items.map(version => (
              <section key={version.id} style={{ border: "1px solid var(--border)", borderRadius: 4, padding: 10, marginBottom: 8, fontSize: 12 }}>
                <div style={{ fontWeight: 600 }}>Phiên bản {version.versionNumber}</div>
                <div style={{ color: "var(--fg-muted)", marginTop: 3 }}>{version.createdByFullName} · {formatDate(version.createdAt)}</div>
                {version.restoredFromId && <div style={{ color: "var(--fg-muted)", marginTop: 3 }}>Khôi phục từ bản ghi #{version.restoredFromId}</div>}
                <pre style={{ margin: "8px 0", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit", maxHeight: 120, overflowY: "auto" }}>{version.content || "(trống)"}</pre>
                <button onClick={() => void restore(version)} disabled={interactionLocked} className="tb-btn">Khôi phục</button>
              </section>
            ))}
          </aside>
        )}
      </div>

      <StatusBar left={<span>{tab === "GLOBAL" ? "Prompt chung" : selectedReport?.label ?? "Theo báo cáo"}</span>} right={<span>Prompt bổ sung cho phân tích AI</span>} />
    </>
  );
}

const fieldLabelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, marginBottom: 12, fontSize: 12, fontWeight: 500 };
const fieldStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 4, background: "var(--window-bg)", color: "var(--fg)" };

function ErrorMessage({ children }: { children: React.ReactNode }) {
  return <div role="alert" aria-live="assertive" style={{ color: "var(--danger)", fontSize: 12, marginTop: 12, whiteSpace: "pre-wrap" }}>{children}</div>;
}

function tabButtonStyle(active: boolean): React.CSSProperties {
  return { border: "none", borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent", background: "transparent", padding: "8px 12px", color: active ? "var(--accent)" : "var(--fg-muted)", fontWeight: active ? 600 : 400, cursor: "pointer" };
}
