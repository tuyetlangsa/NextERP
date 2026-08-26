import assert from "node:assert/strict";
import {
  AiPromptRequestController,
  rebasePromptDrafts,
  scopeKey,
} from "./analysisPromptWindowController";
import type { AiPromptSettings, AiPromptVersion } from "@/types/api/ai";

type Deferred<T> = {
  promise: Promise<T>;
  resolve(value: T): void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(nextResolve => { resolve = nextResolve; });
  return { promise, resolve };
}

function version(id: number, content: string): AiPromptVersion {
  return { id, content, versionNumber: id, restoredFromId: null, createdByFullName: "Owner", createdAt: "2026-08-26T00:00:00Z" };
}

function settings(globalContent: string, reportContent = "report-server"): AiPromptSettings {
  return {
    global: version(1, globalContent),
    reportTypes: [{ code: "TOP_ORDER_STAFF_BY_ITEM", label: "Top nhân viên", active: version(2, reportContent) }],
  };
}

const settingsRequests: Deferred<ReturnType<typeof success<AiPromptSettings>>>[] = [];
const historyRequests: Deferred<ReturnType<typeof success<AiPromptVersion[]>>>[] = [];
const controller = new AiPromptRequestController({
  getSettings: () => {
    const request = deferred<ReturnType<typeof success<AiPromptSettings>>>();
    settingsRequests.push(request);
    return request.promise;
  },
  history: () => {
    const request = deferred<ReturnType<typeof success<AiPromptVersion[]>>>();
    historyRequests.push(request);
    return request.promise;
  },
});

function success<T>(data: T) {
  return { isSuccess: true as const, data };
}

async function run() {
  const olderSettings = controller.loadSettings();
  const newerSettings = controller.loadSettings();
  settingsRequests[1].resolve(success(settings("new")));
  const latestSettings = await newerSettings;
  assert.ok(latestSettings?.data);
  assert.equal(latestSettings.data.global?.content, "new");
  settingsRequests[0].resolve(success(settings("old")));
  assert.equal(await olderSettings, null, "an older settings response must not overwrite the latest response");

  const oldScopeHistory = controller.loadHistory({ scope: "GLOBAL" });
  controller.invalidateHistory();
  const currentScopeHistory = controller.loadHistory({ scope: "REPORT", reportType: "TOP_ORDER_STAFF_BY_ITEM" });
  historyRequests[1].resolve(success([version(4, "report-current")]));
  const history = await currentScopeHistory;
  assert.ok(history?.data);
  assert.equal(history?.scopeKey, "REPORT:TOP_ORDER_STAFF_BY_ITEM");
  assert.equal(history.data[0].content, "report-current");
  historyRequests[0].resolve(success([version(3, "global-stale")]));
assert.equal(await oldScopeHistory, null, "history from an invalidated scope must be ignored");

  const disposedRequest = deferred<ReturnType<typeof success<AiPromptSettings>>>();
  const disposalController = new AiPromptRequestController({
    getSettings: () => disposedRequest.promise,
    history: () => Promise.resolve(success([])),
  });
  const disposedSettings = disposalController.loadSettings();
  disposalController.dispose();
  disposedRequest.resolve(success(settings("after-unmount")));
  assert.equal(await disposedSettings, null, "an unmounted window must ignore its pending settings response");

  const drafts = rebasePromptDrafts(
    { GLOBAL: "global-draft", "REPORT:TOP_ORDER_STAFF_BY_ITEM": "report-draft" },
    new Set(["REPORT:TOP_ORDER_STAFF_BY_ITEM"]),
    settings("global-server", "report-server"),
  );
  assert.equal(drafts.GLOBAL, "global-server");
  assert.equal(drafts[scopeKey({ scope: "REPORT", reportType: "TOP_ORDER_STAFF_BY_ITEM" })], "report-draft");

  const committed = rebasePromptDrafts(
    drafts,
    new Set(["REPORT:TOP_ORDER_STAFF_BY_ITEM"]),
    settings("global-server", "report-committed"),
    "REPORT:TOP_ORDER_STAFF_BY_ITEM",
  );
  assert.equal(committed["REPORT:TOP_ORDER_STAFF_BY_ITEM"], "report-committed");
}

void run();
