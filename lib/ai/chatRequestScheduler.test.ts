import assert from "node:assert/strict";
import {
  ChatRequestScheduler,
  createFreshChatRequest,
  createManualChatRequest,
} from "./chatRequestScheduler";

const structuredReport = {
  message: "Phân tích báo cáo Tồn kho",
  conversationId: 12,
  reportContext: {
    reportType: "STOCK_ALERT" as const,
    filters: {},
    data: [{ itemId: 7 }],
  },
};

const manual = createManualChatRequest("Theo dõi tiếp", 12);
assert.deepEqual(manual, { message: "Theo dõi tiếp", conversationId: 12 });

const fresh = createFreshChatRequest(structuredReport);
assert.equal(fresh.conversationId, undefined);
assert.deepEqual(fresh.reportContext, structuredReport.reportContext);

const scheduler = new ChatRequestScheduler<{ id: string }>();

// A manual chat is already in flight. A report-analysis request must be retained
// rather than clearing the active thread and disappearing.
assert.equal(scheduler.beginManual(), true);
assert.equal(scheduler.beginFresh({ id: "report-1" }), null);
assert.deepEqual(scheduler.complete(), { id: "report-1" });
assert.equal(scheduler.complete(), null);

// Multiple report clicks are delivered FIFO once the current request completes.
assert.deepEqual(scheduler.beginFresh({ id: "report-2" }), { id: "report-2" });
assert.equal(scheduler.beginFresh({ id: "report-3" }), null);
assert.equal(scheduler.beginFresh({ id: "report-4" }), null);
assert.deepEqual(scheduler.complete(), { id: "report-3" });
assert.deepEqual(scheduler.complete(), { id: "report-4" });
assert.equal(scheduler.complete(), null);

// Manual send behavior remains explicit: a follow-up cannot start until the
// active send completes, then can start normally.
assert.equal(scheduler.beginManual(), true);
assert.equal(scheduler.beginManual(), false);
assert.equal(scheduler.complete(), null);
assert.equal(scheduler.beginManual(), true);
