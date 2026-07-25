/**
 * Smoke test — week helpers cho module lịch làm việc.
 * Backend chỉ nhận Thứ 2 ≥ tuần sau, nên phần tính tuần phải đúng tuyệt đối.
 * Run: npx tsx scripts/test-schedule.ts
 */

import {
  endOfWeek,
  formatIsoDate,
  nextMonday,
  parseIsoDate,
  shortTime,
  startOfWeek,
  weekDays,
  weekLabel,
} from "../lib/schedule/dates";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}

console.log("\n=== Schedule week helpers ===\n");

const sat = new Date(2026, 6, 25); // Sat 25/07/2026
const mon = startOfWeek(sat);
assert(formatIsoDate(mon) === "2026-07-20", `startOfWeek(Sat 25/07) = 20/07 (${formatIsoDate(mon)})`);

const sunOfWeek = new Date(2026, 6, 26); // Sun 26/07 vẫn thuộc tuần bắt đầu 20/07
assert(formatIsoDate(startOfWeek(sunOfWeek)) === "2026-07-20", "Chủ nhật thuộc tuần Thứ 2 trước đó");

assert(formatIsoDate(endOfWeek(mon)) === "2026-07-26", "endOfWeek = Chủ nhật cùng tuần");

const next = nextMonday(sat);
assert(formatIsoDate(next) === "2026-07-27", `nextMonday(25/07) = 27/07 (${formatIsoDate(next)})`);
assert(next.getDay() === 1, "nextMonday luôn là Thứ 2");
assert(next > sat, "nextMonday luôn ở tương lai");

const days = weekDays("2026-07-20");
assert(days.length === 7, "weekDays trả 7 ngày");
assert(days[0].label === "T2" && days[6].label === "CN", "cột chạy từ T2 đến CN");
assert(days[6].iso === "2026-07-26", "ngày cuối là 26/07");
assert(
  days.every(d => formatIsoDate(parseIsoDate(d.iso)) === d.iso),
  "parseIsoDate/formatIsoDate round-trip không lệch ngày",
);

assert(weekLabel("2026-07-20") === "20/07 - 26/07/2026", `weekLabel: ${weekLabel("2026-07-20")}`);
assert(shortTime("09:00:00") === "09:00", "shortTime cắt giây");
assert(shortTime(undefined) === "", "shortTime chịu được undefined");

// Chuẩn hoá ngày người dùng chọn giữa tuần → Thứ 2, đúng như payload gửi backend.
const normalized = formatIsoDate(startOfWeek(parseIsoDate("2026-08-06"))); // Thu
assert(normalized === "2026-08-03", `chuẩn hoá 06/08 (T5) → 03/08 (T2): ${normalized}`);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
