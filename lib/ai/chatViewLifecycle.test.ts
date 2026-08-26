import assert from "node:assert/strict";
import { AiChatRequestController } from "./chatViewLifecycle";
import type { ConversationDetail, ConversationSummary, SendChatResponse } from "@/types/api/ai";

type Result<T> = { isSuccess: boolean; data: T | null; detail: string | null };
type Deferred<T> = { promise: Promise<T>; resolve(value: T): void };

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => { resolve = nextResolve; });
  return { promise, resolve };
}

function success<T>(data: T): Result<T> {
  return { isSuccess: true, data, detail: null };
}

const chats: Array<{ signal: AbortSignal; request: Deferred<Result<SendChatResponse>> }> = [];
const lists: Array<{ signal: AbortSignal; request: Deferred<Result<ConversationSummary[]>> }> = [];
const details: Array<{ id: number; signal: AbortSignal; request: Deferred<Result<ConversationDetail>> }> = [];
const controller = new AiChatRequestController({
  chat: (_body, options) => {
    const request = deferred<Result<SendChatResponse>>();
    chats.push({ signal: options?.signal as AbortSignal, request });
    return request.promise;
  },
  listConversations: (options) => {
    const request = deferred<Result<ConversationSummary[]>>();
    lists.push({ signal: options?.signal as AbortSignal, request });
    return request.promise;
  },
  getConversation: (id, options) => {
    const request = deferred<Result<ConversationDetail>>();
    details.push({ id, signal: options?.signal as AbortSignal, request });
    return request.promise;
  },
});

async function run() {
  const oldChat = controller.deliver({ message: "old view" });
  assert.equal(chats[0].signal.aborted, false);
  controller.invalidateView();
  assert.equal(chats[0].signal.aborted, true, "starting a new view must abort its active delivery");
  chats[0].request.resolve(success({ conversationId: 1, narrative: "late", visualizations: [] }));
  assert.equal(await oldChat, null, "a late chat response must not repopulate a cleared view");

  const crossConversationChat = controller.deliver({ message: "must not append to history" });
  const firstOpen = controller.openConversation(11);
  assert.equal(chats[1].signal.aborted, true, "opening history must abort a delivery from the previous view");
  const secondOpen = controller.openConversation(22);
  assert.equal(details[0].signal.aborted, true, "a newer session open must abort the earlier detail request");
  assert.equal(details[1].signal.aborted, false);
  details[1].request.resolve(success({ conversationId: 22, title: "Latest", turns: [] }));
  assert.equal((await secondOpen)?.data?.conversationId, 22);
  details[0].request.resolve(success({ conversationId: 11, title: "Stale", turns: [] }));
  assert.equal(await firstOpen, null, "rapid session opens must be latest-wins even if responses are reversed");
  chats[1].request.resolve(success({ conversationId: 12, narrative: "wrong conversation", visualizations: [] }));
  assert.equal(await crossConversationChat, null, "a chat response cannot append to a session opened afterward");

  const pendingDetail = controller.openConversation(44);
  const manualSupersedingDetail = controller.deliver({ message: "new manual conversation" });
  assert.equal(details[2].signal.aborted, true, "manual delivery must supersede a session detail that is still loading");
  chats[2].request.resolve(success({ conversationId: 45, narrative: "manual wins", visualizations: [] }));
  assert.equal((await manualSupersedingDetail)?.data?.conversationId, 45);
  details[2].request.resolve(success({ conversationId: 44, title: "Too late", turns: [] }));
  assert.equal(await pendingDetail, null, "late detail cannot overwrite a manually started conversation");

  const firstList = controller.refreshSessions();
  const secondList = controller.refreshSessions();
  assert.equal(lists[0].signal.aborted, true, "refreshing sessions must abort the superseded list request");
  lists[1].request.resolve(success([]));
  assert.deepEqual((await secondList)?.data, []);
  lists[0].request.resolve(success([]));
  assert.equal(await firstList, null);

  const hiddenList = controller.refreshSessions();
  controller.invalidateSessions();
  assert.equal(lists[2].signal.aborted, true, "hiding session history must abort its list request");
  lists[2].request.resolve(success([]));
  assert.equal(await hiddenList, null);

  const activeChat = controller.deliver({ message: "logout" });
  const activeList = controller.refreshSessions();
  const activeDetail = controller.openConversation(33);
  controller.dispose();
  assert.equal(chats[3].signal.aborted, true);
  assert.equal(lists[3].signal.aborted, true);
  assert.equal(details[3].signal.aborted, true);
  chats[3].request.resolve(success({ conversationId: 2, narrative: "late logout", visualizations: [] }));
  lists[3].request.resolve(success([]));
  details[3].request.resolve(success({ conversationId: 33, title: "Logged out", turns: [] }));
  assert.equal(await activeChat, null);
  assert.equal(await activeList, null);
  assert.equal(await activeDetail, null);
}

void run();
