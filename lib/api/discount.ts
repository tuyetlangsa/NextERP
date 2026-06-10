"use client";

import { http } from "@/lib/http/client";
import type {
  DiscountPolicyDetail,
  DiscountPolicyListRow,
  DiscountPolicySaveResult,
  DiscountPolicyUpsert,
  DiscountType,
} from "@/types/api/discount";
import type { ListQuery } from "./restaurant";

export interface DiscountPolicyListQuery extends ListQuery {
  discountType?: DiscountType;
}

export const discountPoliciesApi = {
  list: (q: DiscountPolicyListQuery = {}) =>
    http.get<DiscountPolicyListRow[]>("/api/discount-policies", { params: q }),
  get: (id: number) => http.get<DiscountPolicyDetail>(`/api/discount-policies/${id}`),
  create: (body: DiscountPolicyUpsert) =>
    http.post<DiscountPolicySaveResult>("/api/discount-policies", body),
  update: (id: number, body: DiscountPolicyUpsert) =>
    http.put<DiscountPolicySaveResult>(`/api/discount-policies/${id}`, body),
  remove: (id: number) => http.delete<null>(`/api/discount-policies/${id}`),
};
