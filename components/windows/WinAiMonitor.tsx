"use client";

import { useState } from "react";
import { WinToolbar, TB } from "@/components/ui/WinToolbar";
import { DetailPanel } from "@/components/ui/DetailPanel";
import { StatusBar } from "@/components/ui/StatusBar";
import { LoadingBar, OfflineBar, ErrorBar } from "@/components/ui/ResourceBars";
import { ChromeIcons } from "@/components/desktop/icons";
import { Markdown } from "@/components/ai/Markdown";
import { aiMonitorApi } from "@/lib/api/aiMonitor";
import { useResource } from "@/lib/http/useResource";
import { formatApiError } from "@/lib/http/formatError";
import type { AiConvTrace, AiMessageTrace, AiToolCallTrace } from "@/types/api/aiMonitor";

function fmtDateTime(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString("vi-VN");
}

function prettyJson(raw: string | null): string {
  if (!raw) return "";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

const ROLE_LABEL: Record<AiMessageTrace["role"], string> = {
  USER: "Người dùng",
  ASSISTANT: "Trợ lý AI",
  TOOL_CALL: "Gọi công cụ",
  SYSTEM: "Hệ thống",
};

function roleBadgeStyle(role: AiMessageTrace["role"]): React.CSSProperties {
  switch (role) {
    case "USER":
      return { background: "#eff6ff", color: "var(--info)" };
    case "ASSISTANT":
      return { background: "#f0fdf4", color: "#15803d" };
    case "TOOL_CALL":
      return { background: "#fef3c7", color: "var(--warning)" };
    default:
      return { background: "#f4f4f5", color: "var(--fg-muted)" };
  }
}

function StatCard({ label, value, danger }: { label: string; value: React.ReactNode; danger?: boolean }) {
  return (
    <div
      style={{
        flex: "1 1 0",
        minWidth: 110,
        padding: "10px 12px",
        borderRadius: 6,
        border: "1px solid var(--border)",
        background: "var(--panel-bg)",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 600, color: danger ? "var(--danger)" : "var(--fg)" }}>{value}</span>
    </div>
  );
}

function ToolCallCard({ tc }: { tc: AiToolCallTrace }) {
  const failed = tc.status !== "SUCCESS";
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 6,
        padding: "8px 10px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        background: "var(--panel-bg)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
        <span style={{ fontWeight: 600 }}>{tc.toolName}</span>
        <span style={{ color: failed ? "var(--danger)" : "#15803d" }}>{tc.status}</span>
        <span style={{ color: "var(--fg-muted)" }}>{tc.latencyMs != null ? `${tc.latencyMs}ms` : "—"}</span>
        <span style={{ color: "var(--fg-muted)", marginLeft: "auto" }}>{fmtDateTime(tc.createdAt)}</span>
      </div>
      {tc.errorMessage && (
        <div style={{ color: "var(--danger)", fontSize: 11, whiteSpace: "pre-wrap" }}>{tc.errorMessage}</div>
      )}
      <details>
        <summary style={{ fontSize: 11, color: "var(--fg-muted)", cursor: "pointer" }}>Input</summary>
        <pre className="max-h-40 overflow-auto text-xs" style={{ margin: "4px 0 0", padding: 6, background: "#f4f4f5", borderRadius: 4 }}>
          {prettyJson(tc.inputJson)}
        </pre>
      </details>
      {tc.outputJson && (
        <details>
          <summary style={{ fontSize: 11, color: "var(--fg-muted)", cursor: "pointer" }}>Output</summary>
          <pre className="max-h-40 overflow-auto text-xs" style={{ margin: "4px 0 0", padding: 6, background: "#f4f4f5", borderRadius: 4 }}>
            {prettyJson(tc.outputJson)}
          </pre>
        </details>
      )}
    </div>
  );
}

function MessageRow({ msg }: { msg: AiMessageTrace }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 3, ...roleBadgeStyle(msg.role) }}>
          {ROLE_LABEL[msg.role] ?? msg.role}
        </span>
        <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>{fmtDateTime(msg.createdAt)}</span>
        {msg.tokenCount != null && <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>{msg.tokenCount} token</span>}
        {msg.hasVisualization && <span title="Có trực quan hóa">📊</span>}
      </div>

      {msg.role === "ASSISTANT" && msg.content && <Markdown text={msg.content} />}
      {msg.role !== "ASSISTANT" && msg.content && (
        <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{msg.content}</div>
      )}

      {msg.toolCalls.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
          {msg.toolCalls.map(tc => (
            <ToolCallCard key={tc.id} tc={tc} />
          ))}
        </div>
      )}
    </div>
  );
}

export function WinAiMonitor() {
  const [days, setDays] = useState<7 | 30>(7);
  const stats = useResource(() => aiMonitorApi.stats(days), { deps: [days] });
  const convList = useResource(() => aiMonitorApi.conversations(100), { deps: [] });
  const items = convList.data ?? [];

  const [collapsed, setCollapsed] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [trace, setTrace] = useState<AiConvTrace | null>(null);
  const [loadingTrace, setLoadingTrace] = useState(false);
  const [traceError, setTraceError] = useState<string | null>(null);

  async function selectConversation(id: number) {
    setSelectedId(id);
    setTrace(null);
    setTraceError(null);
    setLoadingTrace(true);
    const res = await aiMonitorApi.trace(id);
    setLoadingTrace(false);
    if (res.isSuccess) {
      setTrace(res.data);
    } else {
      setTraceError(formatApiError(res));
    }
  }

  const s = stats.data;
  const sortedMessages = trace ? [...trace.messages].sort((a, b) => a.sequenceNumber - b.sequenceNumber) : [];

  return (
    <>
      <WinToolbar
        left={
          <>
            <TB icon={ChromeIcons.Refresh} onClick={() => { stats.reload(); convList.reload(); }}>
              Làm mới
            </TB>
            <div className="tb-divider" />
            <TB kind={days === 7 ? "primary" : "default"} onClick={() => setDays(7)}>7 ngày</TB>
            <TB kind={days === 30 ? "primary" : "default"} onClick={() => setDays(30)}>30 ngày</TB>
          </>
        }
        right={<TB icon={ChromeIcons.Help}>Trợ giúp</TB>}
      />

      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "var(--window-chrome)" }}>
        {stats.loading && <LoadingBar text="Đang tải thống kê..." />}
        {stats.isOffline && <OfflineBar onRetry={() => stats.reload()} />}
        {stats.isApiError && <ErrorBar text={stats.error ?? ""} onRetry={() => stats.reload()} />}
        {s && (
          <>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <StatCard label="Số cuộc trò chuyện" value={s.conversationCount} />
              <StatCard label="Lượt gọi công cụ" value={s.toolCallCount} />
              <StatCard
                label="Tỉ lệ lỗi công cụ"
                value={`${(s.toolErrorRate * 100).toFixed(1)}%`}
                danger={s.toolErrorRate > 0}
              />
              <StatCard label="Độ trễ TB" value={`${s.avgToolLatencyMs.toFixed(0)}ms`} />
              <StatCard label="p95" value={s.p95ToolLatencyMs != null ? `${s.p95ToolLatencyMs}ms` : "—"} />
              <StatCard label="Tổng token" value={s.totalTokens.toLocaleString()} />
            </div>
            {s.topTools.length > 0 && (
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>Công cụ dùng nhiều:</span>
                {s.topTools.map(t => (
                  <span
                    key={t.toolName}
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 12,
                      background: "#f4f4f5",
                      color: "var(--fg)",
                    }}
                  >
                    {t.toolName} × {t.count}
                    {t.errorCount > 0 && <span style={{ color: "var(--danger)" }}> ({t.errorCount} lỗi)</span>}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="win-body">
        <DetailPanel title="Cuộc trò chuyện" collapsed={collapsed} onToggle={() => setCollapsed(c => !c)}>
          {convList.loading && <LoadingBar text="Đang tải danh sách..." />}
          {convList.isOffline && <OfflineBar onRetry={() => convList.reload()} />}
          {convList.isApiError && <ErrorBar text={convList.error ?? ""} onRetry={() => convList.reload()} />}
          {!convList.loading && items.length === 0 && !convList.isApiError && !convList.isOffline && (
            <div style={{ color: "var(--fg-muted)", fontSize: 12, padding: 8 }}>Chưa có cuộc trò chuyện nào.</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {items.map(item => (
              <button
                key={item.id}
                onClick={() => selectConversation(item.id)}
                style={{
                  textAlign: "left",
                  padding: "8px 10px",
                  borderRadius: 4,
                  border: "1px solid",
                  borderColor: item.id === selectedId ? "var(--accent)" : "transparent",
                  background: item.id === selectedId ? "#eff6ff" : "transparent",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.title ?? "(không tiêu đề)"}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--fg-muted)",
                      background: "#f4f4f5",
                      borderRadius: 3,
                      padding: "1px 5px",
                    }}
                  >
                    {item.status}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>
                  {item.ownerName ?? "—"} · {item.messageCount} tin nhắn · {fmtDateTime(item.updatedAt)}
                </span>
              </button>
            ))}
          </div>
        </DetailPanel>

        <div className="data-list" style={{ overflowY: "auto" }}>
          {loadingTrace && <LoadingBar text="Đang tải nội dung..." />}
          {traceError && <ErrorBar text={traceError} onRetry={() => selectedId && selectConversation(selectedId)} />}
          {!loadingTrace && !trace && !traceError && (
            <div style={{ color: "var(--fg-muted)", fontSize: 12, padding: 12 }}>
              Chọn một cuộc trò chuyện từ danh sách để xem chi tiết.
            </div>
          )}
          {trace && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", background: "var(--window-chrome)" }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{trace.title ?? "(không tiêu đề)"}</div>
                <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>
                  {trace.ownerName ?? "—"} · {trace.status} · bắt đầu {fmtDateTime(trace.startedAt)}
                  {trace.endedAt && <> · kết thúc {fmtDateTime(trace.endedAt)}</>}
                </div>
              </div>
              {sortedMessages.length === 0 ? (
                <div style={{ color: "var(--fg-muted)", fontSize: 12, padding: 12 }}>Không có tin nhắn.</div>
              ) : (
                sortedMessages.map(msg => <MessageRow key={msg.id} msg={msg} />)
              )}
            </div>
          )}
        </div>
      </div>

      <StatusBar
        left={
          <>
            <span>{items.length} cuộc trò chuyện</span>
            {trace && (
              <>
                <span>·</span>
                <span>{sortedMessages.length} tin nhắn</span>
              </>
            )}
            {(convList.isOffline || stats.isOffline) && (
              <>
                <span>·</span>
                <span style={{ color: "var(--warning)" }}>offline</span>
              </>
            )}
          </>
        }
        right={<span>Nhật ký hoạt động Trợ lý AI</span>}
      />
    </>
  );
}
