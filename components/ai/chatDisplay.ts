const REPORT_ANALYSIS_PREFIX = 'Đây là dữ liệu báo cáo "';
const REPORT_DATA_MARKER = "\n\nDỮ LIỆU:\n```json\n";

export function toChatDisplayText(content: string): string {
  if (!content.startsWith(REPORT_ANALYSIS_PREFIX) || !content.includes(REPORT_DATA_MARKER)) {
    return content;
  }

  const reportNameEnd = content.indexOf('"', REPORT_ANALYSIS_PREFIX.length);
  if (reportNameEnd < 0) {
    return content;
  }

  const reportName = content.slice(REPORT_ANALYSIS_PREFIX.length, reportNameEnd).trim();
  if (!reportName) {
    return content;
  }

  return `📊 Phân tích báo cáo "${reportName}"`;
}
