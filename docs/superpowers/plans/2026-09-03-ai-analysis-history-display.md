# Concise AI Report History Messages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide the generated report JSON in restored AI conversation bubbles while preserving the full stored message for backend model context.

**Architecture:** Add one pure frontend formatter that recognizes only the fixed message envelope produced by `buildAnalysisMessage` and returns the existing concise report label. Apply it to restored `USER` turns inside the shared `useAiChat.openSession` mapping, leaving assistant messages, API contracts, database content, and the live `sendFresh` path unchanged.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Node strict assertions, `tsx`.

## Global Constraints

- This change is frontend-only.
- Do not change the backend request or response contract.
- Do not add or migrate database columns.
- Do not modify the stored message or the message sent to the model.
- Apply the display behavior to both the AI dock and the full AI window through their shared `useAiChat` hook.
- Only messages matching the generated report-analysis envelope may be shortened; ordinary text and manually pasted JSON remain unchanged.

---

## File Structure

- Create `components/ai/chatDisplay.ts`: pure conversion from stored user content to display text.
- Create `components/ai/chatDisplay.test.ts`: focused executable assertions for generated, ordinary, JSON, and malformed messages.
- Modify `components/ai/useAiChat.ts`: apply the formatter to restored `USER` turns only.
- Modify `package.json`: expose the focused test command.

### Task 1: Format restored report-analysis user messages

**Files:**
- Create: `components/ai/chatDisplay.ts`
- Create: `components/ai/chatDisplay.test.ts`
- Modify: `components/ai/useAiChat.ts:3-6,83-88`
- Modify: `package.json:5-11`

**Interfaces:**
- Consumes: `buildAnalysisMessage(reportName: string, data: unknown): string` from `lib/ai/analyzeBus.ts` as the canonical generated-message shape in the test.
- Produces: `toChatDisplayText(content: string): string` for use while mapping restored `USER` turns.

- [ ] **Step 1: Write the failing formatter test**

Create `components/ai/chatDisplay.test.ts`:

```ts
import assert from "node:assert/strict";
import { buildAnalysisMessage } from "../../lib/ai/analyzeBus";
import { toChatDisplayText } from "./chatDisplay";

const generated = buildAnalysisMessage("Doanh thu", {
  totalRevenue: 1_250_000,
  daily: [{ day: "2026-09-03", revenue: 1_250_000 }],
});

assert.equal(
  toChatDisplayText(generated),
  '📊 Phân tích báo cáo "Doanh thu"',
);

const ordinary = "Hóa đơn số 68 có phí phục vụ bao nhiêu?";
assert.equal(toChatDisplayText(ordinary), ordinary);

const pastedJson = '{"reportName":"Doanh thu","totalRevenue":1250000}';
assert.equal(toChatDisplayText(pastedJson), pastedJson);

const malformed = 'Đây là dữ liệu báo cáo "Doanh thu" của nhà hàng nhưng không có dữ liệu đính kèm.';
assert.equal(toChatDisplayText(malformed), malformed);
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx tsx components/ai/chatDisplay.test.ts
```

Expected: FAIL because `components/ai/chatDisplay.ts` does not exist.

- [ ] **Step 3: Implement the pure display formatter**

Create `components/ai/chatDisplay.ts`:

```ts
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
```

This deliberately requires both the exact generated prefix and JSON section marker. It does not shorten arbitrary JSON or partially matching user text.

- [ ] **Step 4: Run the formatter test to verify it passes**

Run:

```bash
npx tsx components/ai/chatDisplay.test.ts
```

Expected: exits with code 0 and prints no assertion error.

- [ ] **Step 5: Apply the formatter only when restoring user turns**

In `components/ai/useAiChat.ts`, import the formatter:

```ts
import { toChatDisplayText } from "@/components/ai/chatDisplay";
```

Change the `openSession` mapping to:

```ts
setTurns(
  data.turns.map((turn) => ({
    role: turn.role === "USER" ? "user" : "ai",
    text: turn.role === "USER" ? toChatDisplayText(turn.content) : turn.content,
    visualizations: turn.visualizations ?? undefined,
  }))
);
```

Do not change `deliver` or `sendFresh`: the live report-analysis path already renders its explicit `displayText` correctly.

- [ ] **Step 6: Add the focused package script**

In `package.json`, add the script while retaining existing scripts:

```json
"test:ai-chat-display": "tsx components/ai/chatDisplay.test.ts"
```

- [ ] **Step 7: Run focused and neighboring verification**

Run:

```bash
npm run test:ai-chat-display
npm run test:ai-visualization
npx tsc --noEmit
```

Expected: all three commands exit with code 0.

- [ ] **Step 8: Review the final diff against the scope**

Run:

```bash
git diff --check
git diff -- components/ai/chatDisplay.ts components/ai/chatDisplay.test.ts components/ai/useAiChat.ts package.json
```

Confirm that the diff contains no backend, API-contract, database, `buildAnalysisMessage`, or visualization behavior changes.

- [ ] **Step 9: Commit the implementation**

```bash
git add package.json components/ai/chatDisplay.ts components/ai/chatDisplay.test.ts components/ai/useAiChat.ts
git commit -m "fix(ai): hide report JSON in restored chats"
```
