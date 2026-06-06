"use client";

import { DataManager, CustomDataAdaptor, Query } from "@syncfusion/ej2-data";
import { http } from "@/lib/http/client";
import { formatApiError } from "@/lib/http/formatError";
import type { BaseResponse } from "@/lib/http/types";

/**
 * Build a Syncfusion `DataManager` whose Custom Adaptor delegates every CRUD
 * to the project's HTTP client (`lib/http/client`). The Grid becomes the
 * source of truth — Add/Edit/Delete toolbar buttons hit the backend directly
 * and the Grid refreshes itself afterward. No `key` bump / no manual reload.
 *
 * Each callback in `CustomDataAdaptor` follows the pattern documented by
 * Syncfusion: receive an `option` carrying `data` + `onSuccess`/`onFailure`
 * callbacks; the Grid waits on them to refresh internal state.
 *
 * The handlers below are **resource-shaped**:
 *   - `list()`      → GET full list (no server paging in v1).
 *   - `create(row)` → POST and return the new row to the Grid.
 *   - `update(id, row)` → PUT and return the updated row.
 *   - `remove(id)`  → DELETE; return `null` is fine (Grid only needs ack).
 *
 * Implementations must adapt the project's `BaseResponse<T>` envelope:
 * `isSuccess === false` → call `onFailure(error)` so Grid surfaces the error
 * and aborts the inline-edit state (row stays in edit mode for retry).
 */
export interface ResourceHandlers<TRow, TUpsert> {
  list: () => Promise<BaseResponse<TRow[]>>;
  create: (body: TUpsert) => Promise<BaseResponse<TRow>>;
  update: (id: number, body: TUpsert) => Promise<BaseResponse<TRow>>;
  remove: (id: number) => Promise<BaseResponse<unknown>>;
  /** Convert the Grid row (plain JS object from inline edit) → API upsert DTO. */
  toUpsert: (row: TRow) => TUpsert;
  /** Primary key field — must match the Grid's `isPrimaryKey` column. */
  keyField?: string;
}

/**
 * Syncfusion delivers CRUD payloads as a JSON-encoded string in `option.data`
 * wrapped in the UrlAdaptor envelope (`{ value, action, key, keyColumn, table }`).
 * We parse it here so handlers see clean row objects.
 */
interface AdaptorOption {
  data: string | object;
  onSuccess: (result: unknown) => void;
  onFailure: (err: unknown) => void;
}

interface CrudEnvelope<TRow> {
  value?: TRow;
  key?: number | string;
  keyColumn?: string;
  action?: "insert" | "update" | "remove";
}

function parseEnvelope<TRow>(raw: string | object): CrudEnvelope<TRow> {
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as CrudEnvelope<TRow>; }
    catch { return {}; }
  }
  return (raw ?? {}) as CrudEnvelope<TRow>;
}

export function buildDataManager<TRow extends { id?: number }, TUpsert>(
  handlers: ResourceHandlers<TRow, TUpsert>
): DataManager {
  const adaptor = new CustomDataAdaptor({
    getData: async (option: AdaptorOption) => {
      try {
        const res = await handlers.list();
        if (res.isSuccess) {
          option.onSuccess({ result: res.data, count: res.data.length });
        } else {
          option.onFailure(formatApiError(res));
        }
      } catch (e) {
        option.onFailure(e);
      }
    },
    addRecord: async (option: AdaptorOption) => {
      try {
        const env = parseEnvelope<TRow>(option.data);
        if (!env.value) { option.onFailure("Thiếu dữ liệu khi tạo mới"); return; }
        const res = await handlers.create(handlers.toUpsert(env.value));
        if (res.isSuccess) option.onSuccess(res.data);
        else option.onFailure(formatApiError(res));
      } catch (e) {
        option.onFailure(e);
      }
    },
    updateRecord: async (option: AdaptorOption) => {
      try {
        const env = parseEnvelope<TRow>(option.data);
        const row = env.value;
        if (!row) { option.onFailure("Thiếu dữ liệu khi cập nhật"); return; }
        const id = row.id;
        if (id === undefined) { option.onFailure("Thiếu ID khi cập nhật"); return; }
        const res = await handlers.update(id, handlers.toUpsert(row));
        if (res.isSuccess) option.onSuccess(res.data);
        else option.onFailure(formatApiError(res));
      } catch (e) {
        option.onFailure(e);
      }
    },
    deleteRecord: async (option: AdaptorOption) => {
      try {
        const env = parseEnvelope<TRow>(option.data);
        const key = env.key;
        const id = typeof key === "number" ? key : Number(key);
        if (!Number.isFinite(id)) { option.onFailure("ID xoá không hợp lệ"); return; }
        const res = await handlers.remove(id);
        if (res.isSuccess) {
          // Syncfusion's processResponse derefs `data.result` unconditionally,
          // so passing `null` crashes the Grid silently. An empty object is
          // enough acknowledgement that the delete succeeded.
          option.onSuccess({});
        } else {
          option.onFailure(res.detail || res.title || "Xoá thất bại");
        }
      } catch (e) {
        option.onFailure(e);
      }
    },
  });

  return new DataManager({ adaptor });
}

// Re-export for callers that want to build their own Query (e.g. server paging).
export { Query, http };
