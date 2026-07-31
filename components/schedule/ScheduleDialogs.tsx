"use client";

import { useEffect, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { ScheduleWeekPicker } from "@/components/schedule/ScheduleWeekPicker";
import type { ScheduleTemplateRow } from "@/types/api/schedule";

interface CreateProps {
  open: boolean;
  earliestWeek: string;
  templates: ScheduleTemplateRow[];
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (weekStartDate: string, templateId: number) => void;
  onGoTemplates?: () => void;
}

export function CreateScheduleDialog({
  open,
  earliestWeek,
  templates,
  busy,
  error,
  onClose,
  onSubmit,
  onGoTemplates,
}: CreateProps) {
  const [week, setWeek] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setWeek(null);
    setTemplateId(null);
    setTemplateOpen(false);
  }, [open]);

  if (!open) return null;

  const selectedTemplate = templates.find(t => t.id === templateId) ?? null;

  return (
    <div className="tpl-modal-backdrop" role="presentation" onClick={busy ? undefined : onClose}>
      <div className="tpl-modal sched-create-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="tpl-modal-head">
          <h3>Tạo lịch mới</h3>
          <button type="button" className="tpl-icon-btn" onClick={onClose} disabled={busy} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <label className="tpl-field">
          <span className="tpl-field-label">Ngày tháng</span>
          <ScheduleWeekPicker
            value={week}
            minWeek={earliestWeek}
            disabled={busy}
            placeholder="Chọn ngày tháng"
            onChange={setWeek}
          />
        </label>

        <div className="tpl-field">
          <span className="tpl-field-label">Template</span>
          <div className="sched-week-picker">
            <button
              type="button"
              className={`sched-week-trigger${selectedTemplate ? "" : " is-placeholder"}`}
              disabled={busy || templates.length === 0}
              onClick={() => setTemplateOpen(o => !o)}
            >
              <span>
                {selectedTemplate
                  ? `${selectedTemplate.name} (${selectedTemplate.lineCount} dòng)`
                  : templates.length === 0
                    ? "— Chưa có template —"
                    : "Chọn template"}
              </span>
              <ChevronDown size={16} />
            </button>
            {templateOpen && templates.length > 0 && (
              <ul className="sched-week-menu sched-template-menu">
                {templates.map(t => (
                  <li key={t.id}>
                    <button
                      type="button"
                      className={t.id === templateId ? "is-selected" : ""}
                      onClick={() => {
                        setTemplateId(t.id);
                        setTemplateOpen(false);
                      }}
                    >
                      {t.name} ({t.lineCount} dòng)
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {templates.length === 0 && (
          <p className="tpl-modal-sub">
            Chưa có template đang hoạt động.{" "}
            {onGoTemplates && (
              <button type="button" className="sched-link-btn" onClick={onGoTemplates}>
                Tạo template trước
              </button>
            )}
          </p>
        )}

        {error && <div className="sched-dialog-error">{error}</div>}

        <div className="tpl-modal-foot">
          <div className="tpl-modal-foot-right" style={{ marginLeft: "auto" }}>
            <button type="button" className="tpl-btn tpl-btn-secondary" onClick={onClose} disabled={busy}>
              Hủy
            </button>
            <button
              type="button"
              className="tpl-btn tpl-btn-primary"
              disabled={busy || week == null || templateId == null}
              onClick={() => week != null && templateId != null && onSubmit(week, templateId)}
            >
              {busy ? "Đang tạo..." : "Tạo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DupProps {
  open: boolean;
  sourceWeekLabel: string;
  earliestWeek: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (weekStartDate: string) => void;
}

export function DuplicateScheduleDialog({
  open,
  sourceWeekLabel,
  earliestWeek,
  busy,
  error,
  onClose,
  onSubmit,
}: DupProps) {
  const [week, setWeek] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setWeek(null);
  }, [open]);

  if (!open) return null;

  return (
    <div className="tpl-modal-backdrop" role="presentation" onClick={busy ? undefined : onClose}>
      <div className="tpl-modal sched-create-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="tpl-modal-head">
          <h3>Nhân bản lịch mới từ {sourceWeekLabel}</h3>
          <button type="button" className="tpl-icon-btn" onClick={onClose} disabled={busy} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <label className="tpl-field">
          <span className="tpl-field-label">Ngày tháng</span>
          <ScheduleWeekPicker
            value={week}
            minWeek={earliestWeek}
            disabled={busy}
            placeholder="Chọn ngày tháng"
            onChange={setWeek}
          />
        </label>

        {error && <div className="sched-dialog-error">{error}</div>}

        <div className="tpl-modal-foot">
          <div className="tpl-modal-foot-right" style={{ marginLeft: "auto" }}>
            <button type="button" className="tpl-btn tpl-btn-secondary" onClick={onClose} disabled={busy}>
              Hủy
            </button>
            <button
              type="button"
              className="tpl-btn tpl-btn-primary"
              disabled={busy || week == null}
              onClick={() => week != null && onSubmit(week)}
            >
              {busy ? "Đang tạo..." : "Tạo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

