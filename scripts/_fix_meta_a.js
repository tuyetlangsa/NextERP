const fs = require("fs");
const tsxPath = "components/windows/WinSchedule.tsx";
let tsx = fs.readFileSync(tsxPath, "utf8");
const tsxRe = /<div className="sched-detail-meta">[\s\S]*?<\/div>\s*\n\s*<div className="sched-detail-grid-card">/;
const tsxNeu = [
  '<div className="sched-detail-meta">',
  '              <div className="sched-detail-meta-item">',
  '                <span className="k">Ngay thang</span>',
  '                <span>{weekRangeLabel(detail.weekStartDate)}</span>',
  '              </div>',
  '              <div className="sched-detail-meta-item">',
  '                <span className="k">Loai</span>',
  '                {detail.generationType ? (',
  '                  <span className={`sched-type-pill type-${detail.generationType.toLowerCase()}`}>',
  '                    {generationLabel}',
  '                  </span>',
  '                ) : (',
  '                  <span>—</span>',
  '                )}',
  '              </div>',
  '              <div className="sched-detail-meta-item">',
  '                <span className="k">Mau template</span>',
  '                <span>{sourceTemplateName}</span>',
  '              </div>',
  '              <div className="sched-detail-meta-item">',
  '                <span className="k">Trang thai</span>',
  '                <span className={`sched-status-pill status-${detail.status.toLowerCase()}`}>',
  '                  <span className="sched-status-dot" aria-hidden />',
  '                  {SCHEDULE_STATUS_LABELS[detail.status]}',
  '                </span>',
  '              </div>',
  '            </div>',
  '',
  '            <div className="sched-detail-grid-card">',
].join("\n");
if (!tsxRe.test(tsx)) { console.error("tsx meta not found"); process.exit(1); }
tsx = tsx.replace(tsxRe, tsxNeu);
tsx = tsx.replace("Ngay thang", "Ngày tháng").replace(">Loai<", ">Loại<").replace("Mau template", "Mẫu template").replace("Trang thai", "Trạng thái");
fs.writeFileSync(tsxPath, tsx);
console.log("tsx ok");