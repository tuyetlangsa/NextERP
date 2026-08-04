"use client";

import { useEffect, useRef, useState } from "react";
import { WinToolbar, TB } from "@/components/ui/WinToolbar";
import { DetailPanel, Field } from "@/components/ui/DetailPanel";
import { StatusBar } from "@/components/ui/StatusBar";
import { LoadingBar, OfflineBar, ErrorBar } from "@/components/ui/ResourceBars";
import { ChromeIcons } from "@/components/desktop/icons";
import { aiKnowledgeApi } from "@/lib/api/aiKnowledge";
import { useResource } from "@/lib/http/useResource";
import { formatApiError } from "@/lib/http/formatError";
import type { KnowledgeDetail, KnowledgeSummary, KnowledgeUpsert } from "@/types/api/ai";

type Draft = {
  title: string;
  content: string;
  isActive: boolean;
};

function formatUpdatedAt(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString("vi-VN");
}

function validateDraft(draft: Draft): string | null {
  const title = draft.title.trim();
  if (!title) return "Tiêu đề là bắt buộc.";
  if (title.length > 200) return "Tiêu đề tối đa 200 ký tự.";
  const content = draft.content.trim();
  if (!content) return "Nội dung là bắt buộc.";
  return null;
}

export function WinAiKnowledge() {
  const list = useResource(() => aiKnowledgeApi.list(), { deps: [] });
  const items = list.data ?? [];

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const initSelectedRef = useRef(false);
  useEffect(() => {
    if (!initSelectedRef.current && items.length > 0) {
      initSelectedRef.current = true;
      selectItem(items[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  async function selectItem(id: number) {
    setSelectedId(id);
    setErrorMsg(null);
    setLoadingDetail(true);
    const res = await aiKnowledgeApi.get(id);
    setLoadingDetail(false);
    if (res.isSuccess) {
      const detail: KnowledgeDetail = res.data;
      setDraft({ title: detail.title, content: detail.content, isActive: detail.isActive });
    } else {
      setErrorMsg(formatApiError(res));
    }
  }

  const handleCreate = () => {
    setSelectedId(null);
    setDraft({ title: "", content: "", isActive: true });
    setErrorMsg(null);
  };

  const handleSave = async () => {
    if (!draft) return;
    const validation = validateDraft(draft);
    if (validation) {
      setErrorMsg(validation);
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    const body: KnowledgeUpsert = {
      title: draft.title.trim(),
      content: draft.content.trim(),
      isActive: draft.isActive,
    };
    const res = selectedId
      ? await aiKnowledgeApi.update(selectedId, body)
      : await aiKnowledgeApi.create(body);

    if (res.isSuccess) {
      await list.reload();
      setSelectedId(res.data.id);
    } else {
      setErrorMsg(formatApiError(res));
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    const sel = items.find(i => i.id === selectedId);
    if (!window.confirm(`Xoá quy trình "${sel?.title ?? ""}"?`)) return;
    setSaving(true);
    setErrorMsg(null);
    const res = await aiKnowledgeApi.remove(selectedId);
    if (res.isSuccess) {
      initSelectedRef.current = false;
      await list.reload();
      setSelectedId(null);
      setDraft(null);
    } else {
      setErrorMsg(formatApiError(res));
    }
    setSaving(false);
  };

  return (
    <>
      <WinToolbar
        left={
          <>
            <TB icon={ChromeIcons.Plus} onClick={handleCreate}>Thêm quy trình</TB>
            <TB icon={ChromeIcons.Save} onClick={handleSave} kind="primary" disabled={!draft || saving}>
              Lưu
            </TB>
            <TB icon={ChromeIcons.Trash} onClick={handleDelete} kind="danger" disabled={!selectedId || saving}>
              Xoá
            </TB>
            <div className="tb-divider" />
            <TB icon={ChromeIcons.Refresh} onClick={() => list.reload()}>Làm mới</TB>
          </>
        }
        right={<TB icon={ChromeIcons.Help}>Trợ giúp</TB>}
      />

      <div className="win-body">
        <DetailPanel
          title="Danh sách quy trình"
          collapsed={collapsed}
          onToggle={() => setCollapsed(c => !c)}
        >
          {list.loading && <LoadingBar text="Đang tải danh sách..." />}
          {list.isOffline && <OfflineBar onRetry={() => list.reload()} />}
          {list.isApiError && <ErrorBar text={list.error ?? ""} onRetry={() => list.reload()} />}
          {!list.loading && items.length === 0 && !list.isApiError && !list.isOffline && (
            <div style={{ color: "var(--fg-muted)", fontSize: 12, padding: 8 }}>
              Chưa có quy trình nào. Bấm &quot;Thêm quy trình&quot; để tạo mới.
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {items.map(item => (
              <button
                key={item.id}
                onClick={() => selectItem(item.id)}
                className="knowledge-list-item"
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
                  <span style={{ fontSize: 13, fontWeight: 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.title}
                  </span>
                  {!item.isActive && (
                    <span style={{ fontSize: 10, color: "var(--warning)", background: "#fef3c7", borderRadius: 3, padding: "1px 5px" }}>
                      tắt
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>
                  Cập nhật: {formatUpdatedAt(item.updatedAt)}
                </span>
              </button>
            ))}
          </div>
        </DetailPanel>

        <div className="data-list" style={{ padding: 16, overflowY: "auto" }}>
          {loadingDetail && <LoadingBar text="Đang tải nội dung..." />}
          {draft ? (
            <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", height: "100%" }}>
              <Field label="Tiêu đề" required>
                <input
                  value={draft.title}
                  onChange={e => setDraft({ ...draft, title: e.target.value })}
                  placeholder="vd: Quy trình xử lý khách hủy bàn"
                />
              </Field>
              <Field label="Nội dung" required>
                <textarea
                  value={draft.content}
                  onChange={e => setDraft({ ...draft, content: e.target.value })}
                  placeholder="Mô tả chi tiết quy trình / nghiệp vụ..."
                  rows={18}
                  style={{ resize: "vertical", minHeight: 320, fontFamily: "inherit" }}
                />
              </Field>
              <Field label="Đang áp dụng">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={e => setDraft({ ...draft, isActive: e.target.checked })}
                />
              </Field>
              {errorMsg && (
                <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 8, whiteSpace: "pre-wrap" }}>
                  {errorMsg}
                </div>
              )}
              <div style={{ marginTop: 16, padding: 10, background: "#f4f4f5", borderRadius: 4, fontSize: 11, color: "var(--fg-muted)" }}>
                Nội dung này được AI dùng để trả lời câu hỏi nghiệp vụ/quy trình của nhà hàng.
              </div>
            </div>
          ) : (
            <div style={{ color: "var(--fg-muted)", fontSize: 12, padding: 12 }}>
              Chọn một quy trình từ danh sách, hoặc bấm &quot;Thêm quy trình&quot;.
            </div>
          )}
        </div>
      </div>

      <StatusBar
        left={
          <>
            <span>{items.length} quy trình</span>
            <span>·</span>
            <span>{items.filter(i => i.isActive).length} đang áp dụng</span>
            {list.isOffline && <><span>·</span><span style={{ color: "var(--warning)" }}>offline</span></>}
          </>
        }
        right={<span>Tri thức nghiệp vụ — dùng cho Trợ lý AI</span>}
      />
    </>
  );
}
