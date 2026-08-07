"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X } from "lucide-react";
import { LoadingBar, ErrorBar } from "@/components/ui/ResourceBars";
import { TemplateConfirmDialog } from "@/components/schedule/TemplateConfirmDialog";
import { ClearableTextField } from "@/components/devices/ClearableTextField";
import { DeviceTokenDialog } from "@/components/devices/DeviceTokenDialog";
import { posTerminalsApi } from "@/lib/api/posTerminals";
import { useResource } from "@/lib/http/useResource";
import { formatApiError } from "@/lib/http/formatError";
import type { PosTerminal } from "@/types/api/posTerminal";

const PAGE_SIZE = 10;

type Banner = { kind: "error" | "info"; text: string } | null;
type FormState = { mode: "create" } | { mode: "edit"; row: PosTerminal } | null;

function formatDMY(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("vi-VN");
}

export function PosTerminalPanel() {
  const listRes = useResource(() => posTerminalsApi.list());
  const list = listRes.data ?? [];

  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);

  const [form, setForm] = useState<FormState>(null);
  const [formName, setFormName] = useState("");

  const [toggleConfirm, setToggleConfirm] = useState<PosTerminal | null>(null);
  const [tokenResult, setTokenResult] = useState<{ title: string; token: string } | null>(null);

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return list.slice(start, start + PAGE_SIZE);
  }, [list, safePage]);

  useEffect(() => setPage(1), [list.length]);

  const openCreate = () => {
    setBanner(null);
    setFormName("");
    setForm({ mode: "create" });
  };

  const openEdit = (row: PosTerminal) => {
    setBanner(null);
    setFormName(row.name);
    setForm({ mode: "edit", row });
  };

  const closeForm = () => {
    if (busy) return;
    setForm(null);
  };

  const submitForm = async () => {
    if (!form) return;
    const name = formName.trim();
    if (!name) {
      setBanner({ kind: "error", text: "Tên máy là bắt buộc." });
      return;
    }
    setBusy(true);
    if (form.mode === "create") {
      const res = await posTerminalsApi.create({ name });
      setBusy(false);
      if (!res.isSuccess) {
        setBanner({ kind: "error", text: formatApiError(res) });
        return;
      }
      setForm(null);
      await listRes.reload();
      setTokenResult({ title: `Mã ${res.data.name}`, token: res.data.deviceToken });
    } else {
      const res = await posTerminalsApi.update(form.row.id, { name });
      setBusy(false);
      if (!res.isSuccess) {
        setBanner({ kind: "error", text: formatApiError(res) });
        return;
      }
      setForm(null);
      await listRes.reload();
      setBanner({ kind: "info", text: "Đã lưu máy POS bán hàng." });
    }
  };

  const requestInactivate = (row: PosTerminal) => setToggleConfirm(row);

  const confirmInactivate = async () => {
    const row = toggleConfirm;
    if (!row) return;
    setBusy(true);
    const res = await posTerminalsApi.inactivate(row.id);
    setBusy(false);
    setToggleConfirm(null);
    if (res.isSuccess) {
      await listRes.reload();
      setBanner({ kind: "info", text: `Đã tắt máy "${row.name}".` });
    } else {
      setBanner({ kind: "error", text: formatApiError(res) });
    }
  };

  return (
    <div className="tpl-panel">
      {banner && (
        <div className={banner.kind === "error" ? "sched-error" : "sched-info"}>{banner.text}</div>
      )}
      {listRes.loading && <LoadingBar text="Đang tải danh sách máy..." />}
      {listRes.isApiError && listRes.error && (
        <ErrorBar text={listRes.error} onRetry={() => listRes.reload()} />
      )}

      <button type="button" className="tpl-create-btn" onClick={openCreate} disabled={busy}>
        <Plus size={16} />
        Tạo máy mới
      </button>

      <div className="tpl-list-head">
        <h3 className="tpl-list-title">Danh sách máy</h3>
      </div>

      <div className="sched-list-card">
        <div className="sched-list-table-wrap">
          <table className="sched-list-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên POS</th>
                <th>Kết nối màn</th>
                <th>Trạng thái</th>
                <th>Thời gian tạo</th>
                <th>Cập nhật</th>
                <th className="sched-col-actions">Hoạt động</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(row => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.name}</td>
                  <td>{row.hasDisplay ? "Có" : "Không"}</td>
                  <td>
                    <div className="pos-status-cell">
                      <input
                        type="checkbox"
                        className="cbx"
                        checked={row.isActive}
                        disabled={busy || !row.isActive}
                        title={row.isActive ? "Bấm để tắt" : "Không thể bật lại sau khi tắt"}
                        onClick={e => {
                          e.preventDefault();
                          if (row.isActive) requestInactivate(row);
                        }}
                        onChange={() => {}}
                        aria-label={`Trạng thái ${row.name}`}
                      />
                      <span className={`sched-status-pill ${row.isActive ? "status-active" : "status-inactive"}`}>
                        <span className="sched-status-dot" aria-hidden />
                        {row.isActive ? "Hoạt động" : "Đã tắt"}
                      </span>
                    </div>
                  </td>
                  <td>{formatDMY(row.createdAt)}</td>
                  <td>{row.createdAt === row.updatedAt ? "----" : formatDMY(row.updatedAt)}</td>
                  <td className="sched-col-actions">
                    <div className="tpl-row-actions">
                      <button
                        type="button"
                        className="tpl-icon-btn"
                        title="Sửa"
                        disabled={busy}
                        onClick={() => openEdit(row)}
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && !listRes.loading && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", color: "var(--fg-muted)" }}>
                    Chưa có máy POS bán hàng nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="tpl-pager">
          <div className="tpl-pager-nav">
            <button
              type="button"
              className="tpl-pager-btn"
              disabled={safePage <= 1}
              onClick={() => setPage(1)}
              aria-label="Trang đầu"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              type="button"
              className="tpl-pager-btn"
              disabled={safePage <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              aria-label="Trang trước"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="tpl-pager-page is-current">{safePage}</span>
            <button
              type="button"
              className="tpl-pager-btn"
              disabled={safePage >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              aria-label="Trang sau"
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              className="tpl-pager-btn"
              disabled={safePage >= totalPages}
              onClick={() => setPage(totalPages)}
              aria-label="Trang cuối"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
          <div className="tpl-pager-info">
            {safePage} trang ({list.length} dữ liệu)
          </div>
        </div>
      </div>

      {form && (
        <div className="tpl-modal-backdrop" role="presentation" onClick={closeForm}>
          <div
            className="tpl-modal"
            role="dialog"
            aria-modal="true"
            onClick={e => e.stopPropagation()}
          >
            <div className="tpl-modal-head">
              <h3>{form.mode === "create" ? "Tạo máy mới" : "Chỉnh sửa máy POS"}</h3>
              <button type="button" className="tpl-icon-btn" onClick={closeForm} disabled={busy} aria-label="Đóng">
                <X size={18} />
              </button>
            </div>
            <ClearableTextField
              label="Tên máy"
              required
              value={formName}
              placeholder="Nhập tên máy"
              disabled={busy}
              onChange={setFormName}
            />
            <div className="tpl-modal-foot">
              <div className="tpl-modal-foot-right" style={{ marginLeft: "auto" }}>
                <button type="button" className="tpl-btn tpl-btn-secondary" onClick={closeForm} disabled={busy}>
                  Hủy
                </button>
                <button
                  type="button"
                  className="tpl-btn tpl-btn-primary"
                  onClick={() => void submitForm()}
                  disabled={busy || !formName.trim()}
                >
                  {busy ? "Đang xử lý..." : form.mode === "create" ? "Tạo" : "Lưu"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <TemplateConfirmDialog
        open={toggleConfirm !== null}
        title="Tắt máy POS bán hàng"
        message={
          toggleConfirm
            ? `Bạn có chắc muốn tắt máy "${toggleConfirm.name}"? Sau khi tắt sẽ không thể bật lại.`
            : ""
        }
        confirmLabel="Tắt"
        busy={busy}
        onCancel={() => {
          if (!busy) setToggleConfirm(null);
        }}
        onConfirm={() => void confirmInactivate()}
      />

      <DeviceTokenDialog
        open={tokenResult !== null}
        title={tokenResult?.title ?? ""}
        token={tokenResult?.token ?? ""}
        onClose={() => setTokenResult(null)}
      />
    </div>
  );
}
