const fs = require("fs");

{
  const p = "D:/Study/FPTU/SU26_CapstoneProject/code/fe/NextERP/components/windows/WinSchedule.tsx";
  let s = fs.readFileSync(p, "utf8");
  const re = /<div className="sched-detail-meta">[\s\S]*?<\/div>\s*\n\s*<div className="sched-detail-grid-card">/;
  const neu = `<div className="sched-detail-meta">
              <div className="sched-detail-meta-item">
                <span className="k">Ngày tháng</span>
                <span>{weekRangeLabel(detail.weekStartDate)}</span>
              </div>
              <div className="sched-detail-meta-item">
                <span className="k">Loại</span>
                {detail.generationType ? (
                  <span className={\`sched-type-pill type-\${detail.generationType.toLowerCase()}\`}>
                    {generationLabel}
                  </span>
                ) : (
                  <span>—</span>
                )}
              </div>
              <div className="sched-detail-meta-item">
                <span className="k">Mẫu template</span>
                <span>{sourceTemplateName}</span>
              </div>
              <div className="sched-detail-meta-item">
                <span className="k">Trạng thái</span>
                <span className={\`sched-status-pill status-\${detail.status.toLowerCase()}\`}>
                  <span className="sched-status-dot" aria-hidden />
                  {SCHEDULE_STATUS_LABELS[detail.status]}
                </span>
              </div>
            </div>

            <div className="sched-detail-grid-card">`;
  if (!re.test(s)) throw new Error("meta block not found in WinSchedule");
  s = s.replace(re, neu);
  fs.writeFileSync(p, s);
  console.log("tsx reordered");
}

{
  const p = "D:/Study/FPTU/SU26_CapstoneProject/code/fe/NextERP/app/globals.css";
  let s = fs.readFileSync(p, "utf8");
  const re = /\/\* sched-detail-meta-layout-v2 \*\/\r?\n\.sched-detail-meta \{[\s\S]*?@media \(max-width: 900px\) \{\r?\n  \/\* sched-detail-meta-layout-v2 \*\/\r?\n\.sched-detail-meta \{\r?\n    grid-template-columns: repeat\(2, max-content\);\r?\n  \}\r?\n\}/;
  const neu = `/* sched-detail-meta-layout-v2 */
.sched-detail-meta {
  display: grid;
  grid-template-columns: max-content max-content;
  align-items: center;
  column-gap: 48px;
  row-gap: 8px;
  font-size: 13px;
  flex-shrink: 0;
  width: fit-content;
  max-width: 100%;
}
.sched-detail-meta-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.sched-detail-meta .k {
  display: inline-block;
  min-width: 110px;
  color: #737373;
  white-space: nowrap;
}`;
  if (!re.test(s)) throw new Error("css meta block not found");
  s = s.replace(re, neu);
  fs.writeFileSync(p, s);
  console.log("css updated to 2x2");
}
