"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChromeIcons } from "@/components/desktop/icons";
import { StatusBar } from "@/components/ui/StatusBar";
import { TB, WinToolbar } from "@/components/ui/WinToolbar";
import { aiAnalysisPromptsApi } from "@/lib/api/aiAnalysisPrompts";
import { formatApiError } from "@/lib/http/formatError";
import type {
  AiPromptSettings,
  AiPromptVersion,
  AiReportType,
  SaveAiPromptRequest,
} from "@/types/api/ai";

type Tab = "GLOBAL" | "REPORT";

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("vi-VN");
}

function versionMeta(version: AiPromptVersion | null): React.ReactNode {
  if (!version) return <span>Chưa có phiên bản tuỳ chỉnh.</span>;
  return (
    <span>
      Phiên bản {version.versionNumber} · {version.createdByFullName} · {formatDate(version.createdAt)}
    </span>
  );
}

export function WinAiAnalysisPrompt() {
  const [tab, setTab] = useState<Tab>("GLOBAL");
  const [settings, setSettings] = useState<AiPromptSettings | null>(null);
  const [selectedReportType, setSelectedReportType] = useState<AiReportType | "">("");
  const [globalDraft, setGlobalDraft] = useState("");
  const [reportDraft, setReportDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<AiPromptVersion[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedReport = useMemo(
    () => settings?.reportTypes.find(report => report.code === selectedReportType) ?? null,
    [settings, selectedReportType],
  );
  const activeVersion = tab === "GLOBAL" ? settings?.global ?? null : selectedReport?.active ?? null;
  const draft = tab === "GLOBAL" ? globalDraft : reportDraft;

  const reloadSettings = useCallback(async () => {
    setLoading(true);
    const res = await aiAnalysisPromptsApi.getSettings();
    if (res.isSuccess && res.data) {
      setSettings(res.data);
      setErrorMsg(null);
    } else {
      setErrorMsg(formatApiError(res));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void reloadSettings();
  }, [reloadSettings]);

  useEffect(() => {
    setGlobalDraft(settings?.global?.content ?? "");
  }, [settings]);

  useEffect(() => {
    if (!selectedReportType && settings?.reportTypes[0]) {
      setSelectedReportType(settings.reportTypes[0].code);
    }
  }, [settings, selectedReportType]);

  useEffect(() => {
    setReportDraft(selectedReport?.active?.content ?? "");
  }, [selectedReport]);

  function currentScope(): { scope: SaveAiPromptRequest["scope"]; reportType?: AiReportType } | null {
    if (tab === "GLOBAL") return { scope: "GLOBAL" };
    if (!selectedReportType) return null;
    return { scope: "REPORT", reportType: selectedReportType };
  }

  async function loadHistory() {
    const scope = currentScope();
    if (!scope) {
      setErrorMsg("Chưa có loại báo cáo để xem lịch sử.");
      return;
    }
    setHistoryLoading(true);
    const res = await aiAnalysisPromptsApi.history(scope.scope, scope.reportType);
    if (res.isSuccess && res.data) {
      setHistory(res.data);
      setErrorMsg(null);
    } else {
      setErrorMsg(formatApiError(res));
    }
    setHistoryLoading(false);
  }

  function changeTab(next: Tab) {
    setTab(next);
    setHistory(null);
    setErrorMsg(null);
  }

  function changeReportType(next: AiReportType | "") {
    setSelectedReportType(next);
    setHistory(null);
    setErrorMsg(null);
  }

  async function save() {
    const scope = currentScope();
    if (!scope || draft.length > 4000) return;

    setSaving(true);
    setErrorMsg(null);
    const res = await aiAnalysisPromptsApi.save({ ...scope, content: draft.trim() });
    if (res.isSuccess) {
      await reloadSettings();
      if (history) await loadHistory();
    } else {
      setErrorMsg(formatApiError(res));
    }
    setSaving(false);
  }

  async function restore(version: AiPromptVersion) {
    if (!window.confirm(`Khôi phục phiên bản ${version.versionNumber}? Thao tác này sẽ tạo một phiên bản mới.`)) {
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    const res = await aiAnalysisPromptsApi.restore(version.id);
    if (res.isSuccess) {
      await reloadSettings();
      await loadHistory();
    } else {
      setErrorMsg(formatApiError(res));
    }
    setSaving(false);
  }

  return (
    <>
      <WinToolbar
        left={
          <>
            <TB icon={ChromeIcons.Save} kind="primary" onClick={save} disabled={saving || draft.length > 4000}>
              {saving ? "Đang lưu..." : "Lưu và áp dụng"}
            </TB>
            <TB icon={ChromeIcons.History} onClick={() => void loadHistory()} disabled={historyLoading || saving}>
              {historyLoading ? "Đang tải..." : "Xem lịch sử"}
            </TB>
            <div className="tb-divider" />
            <TB icon={ChromeIcons.Refresh} onClick={() => void reloadSettings()} disabled={loading || saving}>
              Làm mới
            </TB>
          </>
        }
      />

      <div className="win-body" style={{ minHeight: 0 }}>
        <main className="data-list" style={{ padding: 16, overflowY: "auto" }}>
          <div style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
            <button onClick={() => changeTab("GLOBAL")} style={tabButtonStyle(tab === "GLOBAL")}>
              Prompt chung
            </button>
            <button onClick={() => changeTab("REPORT")} style={tabButtonStyle(tab === "REPORT")}>
              Theo báo cáo
            </button>
          </div>

          {loading ? (
            <div style={{ color: "var(--fg-muted)", fontSize: 13 }}>Đang tải cấu hình prompt...</div>
          ) : (
            <div style={{ maxWidth: 760 }}>
              {tab === "REPORT" && (
                <label style={fieldLabelStyle}>
                  Loại báo cáo
                  <select value={selectedReportType} onChange={event => changeReportType(event.target.value as AiReportType | "")} style={fieldStyle}>
                    {settings?.reportTypes.map(report => (
                      <option key={report.code} value={report.code}>{report.label}</option>
                    ))}
                  </select>
                </label>
              )}

              <label style={fieldLabelStyle}>
                {tab === "GLOBAL" ? "Prompt bổ sung chung" : "Prompt bổ sung"}
                <textarea
                  value={draft}
                  maxLength={4000}
                  onChange={event => tab === "GLOBAL" ? setGlobalDraft(event.target.value) : setReportDraft(event.target.value)}
                  placeholder="Nhập hướng dẫn bổ sung cho AI..."
                  rows={14}
                  style={{ ...fieldStyle, minHeight: 260, resize: "vertical", fontFamily: "inherit" }}
                />
              </label>
              <div style={{ display: "flex", justifyContent: "space-between", color: draft.length > 4000 ? "var(--danger)" : "var(--fg-muted)", fontSize: 12 }}>
                <span>Chỉ nội dung bổ sung; prompt hệ thống cốt lõi không hiển thị ở đây.</span>
                <span>{draft.length} / 4000</span>
              </div>
              <div style={{ marginTop: 12, color: "var(--fg-muted)", fontSize: 12 }}>
                {versionMeta(activeVersion)}
              </div>
            </div>
          )}

          {errorMsg && <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 12, whiteSpace: "pre-wrap" }}>{errorMsg}</div>}
        </main>

        {history && (
          <aside style={{ width: 350, flexShrink: 0, borderLeft: "1px solid var(--border)", padding: 12, overflowY: "auto" }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Lịch sử phiên bản</div>
            {history.length === 0 ? (
              <div style={{ color: "var(--fg-muted)", fontSize: 12 }}>Chưa có phiên bản nào.</div>
            ) : history.map(version => (
              <section key={version.id} style={{ border: "1px solid var(--border)", borderRadius: 4, padding: 10, marginBottom: 8, fontSize: 12 }}>
                <div style={{ fontWeight: 600 }}>Phiên bản {version.versionNumber}</div>
                <div style={{ color: "var(--fg-muted)", marginTop: 3 }}>{version.createdByFullName} · {formatDate(version.createdAt)}</div>
                {version.restoredFromId && <div style={{ color: "var(--fg-muted)", marginTop: 3 }}>Khôi phục từ phiên bản #{version.restoredFromId}</div>}
                <pre style={{ margin: "8px 0", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit", maxHeight: 120, overflowY: "auto" }}>{version.content || "(trống)"}</pre>
                <button onClick={() => void restore(version)} disabled={saving} className="tb-btn">Khôi phục</button>
              </section>
            ))}
          </aside>
        )}
      </div>

      <StatusBar
        left={<span>{tab === "GLOBAL" ? "Prompt chung" : selectedReport?.label ?? "Theo báo cáo"}</span>}
        right={<span>Prompt bổ sung cho phân tích AI</span>}
      />
    </>
  );
}

const fieldLabelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  marginBottom: 12,
  fontSize: 12,
  fontWeight: 500,
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  border: "1px solid var(--border)",
  borderRadius: 4,
  background: "var(--window-bg)",
  color: "var(--fg)",
};

function tabButtonStyle(active: boolean): React.CSSProperties {
  return {
    border: "none",
    borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
    background: "transparent",
    padding: "8px 12px",
    color: active ? "var(--accent)" : "var(--fg-muted)",
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
  };
}
