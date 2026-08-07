"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pencil,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Upload,
  RefreshCcw,
  X,
} from "lucide-react";
import { LoadingBar, ErrorBar } from "@/components/ui/ResourceBars";
import { TemplateConfirmDialog } from "@/components/schedule/TemplateConfirmDialog";
import { ClearableTextField } from "@/components/devices/ClearableTextField";
import { DeviceTokenDialog } from "@/components/devices/DeviceTokenDialog";
import { customerDisplaysApi } from "@/lib/api/customerDisplays";
import { posTerminalsApi } from "@/lib/api/posTerminals";
import { useResource } from "@/lib/http/useResource";
import { formatApiError } from "@/lib/http/formatError";
import { uploadToCloudinary } from "@/lib/upload/cloudinary";
import type { CustomerDisplay } from "@/types/api/customerDisplay";

const PAGE_SIZE = 10;

type Banner = { kind: "error" | "info"; text: string } | null;
type FormState = { mode: "create" } | { mode: "edit"; row: CustomerDisplay } | null;

function formatDMY(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("vi-VN");
}

export function CustomerDisplayPanel() {
  const displaysRes = useResource(() => customerDisplaysApi.list());
  const terminalsRes = useResource(() => posTerminalsApi.list({ isActive: true }));
  const list = displaysRes.data ?? [];
  const availableTerminals = useMemo(
    () => (terminalsRes.data ?? []).filter(t => !t.hasDisplay),
    [terminalsRes.data]
  );

  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);

  const [form, setForm] = useState<FormState>(null);
  const [formName, setFormName] = useState("");
  const [formIdleMediaUrl, setFormIdleMediaUrl] = useState("");
  const [formPosTerminalId, setFormPosTerminalId] = useState<number | null>(null);
  const [posDropdownOpen, setPosDropdownOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [toggleConfirm, setToggleConfirm] = useState<CustomerDisplay | null>(null);
  const [tokenResult, setTokenResult] = useState<{ title: string; token: string } | null>(null);

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return list.slice(start, start + PAGE_SIZE);
  }, [list, safePage]);

  useEffect(() => setPage(1), [list.length]);

  const selectedTerminal = availableTerminals.find(t => t.id === formPosTerminalId) ?? null;

  const openCreate = () => {
    setBanner(null);
    setFormName("");
    setFormIdleMediaUrl("");
    setFormPosTerminalId(null);
    setPosDropdownOpen(false);
    setForm({ mode: "create" });
  };

  const openEdit = (row: CustomerDisplay) => {
    setBanner(null);
    setFormName(row.name);
    setFormIdleMediaUrl(row.idleMediaUrl ?? "");
    setPosDropdownOpen(false);
    setForm({ mode: "edit", row });
  };

  const closeForm = () => {
    if (busy) return;
    setForm(null);
    setPosDropdownOpen(false);
  };

  const submitForm = async () => {
    if (!form) return;
    const name = formName.trim();
    const idleMediaUrl = formIdleMediaUrl.trim() || null;

    if (!name) {
      setBanner({ kind: "error", text: "Tên màn là bắt buộc." });
      return;
    }

    if (form.mode === "create") {
      if (formPosTerminalId == null) {
        setBanner({ kind: "error", text: "Vui lòng chọn máy POS để kết nối." });
        return;
      }
      setBusy(true);
      const res = await customerDisplaysApi.create({ posTerminalId: formPosTerminalId, name, idleMediaUrl });
      setBusy(false);
      if (!res.isSuccess) {
        setBanner({ kind: "error", text: formatApiError(res) });
        return;
      }
      setForm(null);
      await Promise.all([displaysRes.reload(), terminalsRes.reload()]);
      setTokenResult({ title: "Mã token", token: res.data.deviceToken });
    } else {
      setBusy(true);
      const res = await customerDisplaysApi.update(form.row.id, { name, idleMediaUrl });
      setBusy(false);
      if (!res.isSuccess) {
        setBanner({ kind: "error", text: formatApiError(res) });
        return;
      }
      setForm(null);
      await displaysRes.reload();
      setBanner({ kind: "info", text: "Đã lưu màn hình khách." });
    }
  };

  const requestInactivate = (row: CustomerDisplay) => setToggleConfirm(row);

  const confirmInactivate = async () => {
    const row = toggleConfirm;
    if (!row) return;
    setBusy(true);
    const res = await customerDisplaysApi.inactivate(row.id);
    setBusy(false);
    setToggleConfirm(null);
    if (res.isSuccess) {
      await Promise.all([displaysRes.reload(), terminalsRes.reload()]);
      setBanner({ kind: "info", text: `Đã tắt màn "${row.name}".` });
    } else {
      setBanner({ kind: "error", text: formatApiError(res) });
    }
  };

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setBanner(null);
    try {
      const result = await uploadToCloudinary(file);
      setFormIdleMediaUrl(result.url);
    } catch (err) {
      setBanner({ kind: "error", text: err instanceof Error ? err.message : "Upload thất bại" });
    }
    setUploading(false);
  };

  return (
    <div className="tpl-panel">
      {banner && (
        <div className={banner.kind === "error" ? "sched-error" : "sched-info"}>{banner.text}</div>
      )}
      {(displaysRes.loading || terminalsRes.loading) && <LoadingBar text="Đang tải danh sách màn..." />}
      {displaysRes.isApiError && displaysRes.error && (
        <ErrorBar text={displaysRes.error} onRetry={() => displaysRes.reload()} />
      )}

      <button type="button" className="tpl-create-btn" onClick={openCreate} disabled={busy}>
        <Plus size={16} />
        Tạo màn mới
      </button>

      <div className="tpl-list-head">
        <h3 className="tpl-list-title">Danh sách màn</h3>
      </div>

      <div className="sched-list-card">
        <div className="sched-list-table-wrap">
          <table className="sched-list-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên màn</th>
                <th>Tên máy POS kết nối</th>
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
                  <td>{row.posTerminalName}</td>
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
              {paged.length === 0 && !displaysRes.loading && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", color: "var(--fg-muted)" }}>
                    Chưa có màn hình khách nào.
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
              <h3>{form.mode === "create" ? "Tạo màn mới" : "Chỉnh sửa màn hình khách"}</h3>
              <button type="button" className="tpl-icon-btn" onClick={closeForm} disabled={busy} aria-label="Đóng">
                <X size={18} />
              </button>
            </div>

            {form.mode === "create" ? (
              <div className="tpl-field">
                <span className="tpl-field-label">
                  Kết nối máy POS <span className="required" aria-hidden>*</span>
                </span>
                <div className="sched-week-picker">
                  <button
                    type="button"
                    className={`sched-week-trigger${selectedTerminal ? "" : " is-placeholder"}`}
                    disabled={busy || availableTerminals.length === 0}
                    onClick={() => setPosDropdownOpen(o => !o)}
                  >
                    <span>
                      {selectedTerminal
                        ? selectedTerminal.name
                        : availableTerminals.length === 0
                          ? "— Không có máy khả dụng —"
                          : "Chọn máy POS"}
                    </span>
                    <ChevronDown size={16} />
                  </button>
                  {posDropdownOpen && availableTerminals.length > 0 && (
                    <ul className="sched-week-menu sched-template-menu">
                      {availableTerminals.map(t => (
                        <li key={t.id}>
                          <button
                            type="button"
                            className={t.id === formPosTerminalId ? "is-selected" : ""}
                            onClick={() => {
                              setFormPosTerminalId(t.id);
                              setPosDropdownOpen(false);
                            }}
                          >
                            {t.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {availableTerminals.length === 0 && (
                  <p className="tpl-modal-sub">
                    Không có máy POS nào khả dụng để kết nối (đã liên kết hết hoặc chưa tạo máy).
                  </p>
                )}
              </div>
            ) : (
              <label className="tpl-field">
                <span className="tpl-field-label">Kết nối máy POS</span>
                <input className="tpl-input" value={form.row.posTerminalName} disabled />
              </label>
            )}

            <ClearableTextField
              label="Tên màn"
              required
              value={formName}
              placeholder="Nhập tên màn"
              disabled={busy}
              onChange={setFormName}
            />

            <div className="tpl-field">
              <span className="tpl-field-label">Thumbnail màn</span>
              <div className="tpl-input-row">
                <div className="tpl-input-wrap">
                  <input
                    className="tpl-input"
                    value={formIdleMediaUrl}
                    placeholder="Nhập URL ảnh/video cho màn hình chờ"
                    disabled={busy || uploading}
                    onChange={e => setFormIdleMediaUrl(e.target.value)}
                  />
                  {formIdleMediaUrl && (
                    <button
                      type="button"
                      className="tpl-input-clear"
                      onClick={() => setFormIdleMediaUrl("")}
                      aria-label="Xoá Thumbnail"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className="tpl-btn tpl-btn-outline"
                  onClick={handlePickFile}
                  disabled={busy || uploading}
                >
                  {formIdleMediaUrl ? <RefreshCcw size={14} /> : <Upload size={14} />}
                  {uploading ? "Đang tải..." : formIdleMediaUrl ? "Đổi ảnh" : "Tải ảnh lên"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={e => void handleFileChange(e)}
                />
              </div>
            </div>

            <div className="tpl-modal-foot">
              <div className="tpl-modal-foot-right" style={{ marginLeft: "auto" }}>
                <button type="button" className="tpl-btn tpl-btn-secondary" onClick={closeForm} disabled={busy}>
                  Hủy
                </button>
                <button
                  type="button"
                  className="tpl-btn tpl-btn-primary"
                  onClick={() => void submitForm()}
                  disabled={busy || uploading || !formName.trim() || (form.mode === "create" && formPosTerminalId == null)}
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
        title="Tắt màn hình khách"
        message={
          toggleConfirm
            ? `Bạn có chắc muốn tắt màn "${toggleConfirm.name}"? Sau khi tắt sẽ không thể bật lại.`
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
