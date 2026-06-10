"use client";

import { http } from "@/lib/http/client";
import type {
  ChoiceCategoryDetail,
  ChoiceCategoryListRow,
  ChoiceCategoryModifiersReplaceRequest,
  ChoiceCategoryModifiersReplaceResult,
  ChoiceCategoryUpsert,
} from "@/types/api/choice";
import type { ListQuery } from "./restaurant";

export const choiceCategoriesApi = {
  list: (q: ListQuery = {}) =>
    http.get<ChoiceCategoryListRow[]>("/api/choice-categories", { params: q }),
  get: (id: number) => http.get<ChoiceCategoryDetail>(`/api/choice-categories/${id}`),
  create: (body: ChoiceCategoryUpsert) =>
    http.post<ChoiceCategoryDetail>("/api/choice-categories", body),
  update: (id: number, body: ChoiceCategoryUpsert) =>
    http.put<ChoiceCategoryDetail>(`/api/choice-categories/${id}`, body),
  remove: (id: number) => http.delete<null>(`/api/choice-categories/${id}`),
  replaceModifiers: (id: number, body: ChoiceCategoryModifiersReplaceRequest) =>
    http.put<ChoiceCategoryModifiersReplaceResult>(
      `/api/choice-categories/${id}/modifiers`,
      body
    ),
};
