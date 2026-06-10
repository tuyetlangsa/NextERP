"use client";

import { http } from "@/lib/http/client";
import type { SetMenuConfig, SetMenuUpsert, SetMenuUpsertResult } from "@/types/api/setMenu";

export const setMenuApi = {
  get: (itemId: number) => http.get<SetMenuConfig>(`/api/items/${itemId}/set-menu`),
  upsert: (itemId: number, body: SetMenuUpsert) =>
    http.put<SetMenuUpsertResult>(`/api/items/${itemId}/set-menu`, body),
  remove: (itemId: number) => http.delete<null>(`/api/items/${itemId}/set-menu`),
};
