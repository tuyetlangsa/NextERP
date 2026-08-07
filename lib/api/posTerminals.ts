"use client";

import { http } from "@/lib/http/client";
import type { PosTerminal, PosTerminalRegisterResult } from "@/types/api/posTerminal";

export interface PosTerminalListQuery {
  search?: string;
  isActive?: boolean;
}

export interface PosTerminalUpsert {
  name: string;
}

export const posTerminalsApi = {
  list: (q: PosTerminalListQuery = {}) =>
    http.get<PosTerminal[]>("/api/pos-terminals", { params: q }),
  get: (id: number) => http.get<PosTerminal>(`/api/pos-terminals/${id}`),
  create: (body: PosTerminalUpsert) =>
    http.post<PosTerminalRegisterResult>("/api/pos-terminals", body),
  update: (id: number, body: PosTerminalUpsert) =>
    http.put<{ id: number; name: string }>(`/api/pos-terminals/${id}`, body),
  inactivate: (id: number) =>
    http.post<{ id: number; isActive: boolean }>(`/api/pos-terminals/${id}/inactivate`),
};
