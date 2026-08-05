import { http } from "@/lib/http/client";
import type {
  ConfigValueItem,
  RoundingConfigItem,
  BatchUpdateConfigValuesRequest,
  BatchUpdateRoundingConfigsRequest,
} from "@/types/api/configuration";

export const configValuesApi = {
  list: () => http.get<ConfigValueItem[]>("/api/configs"),
  batchUpdate: (body: BatchUpdateConfigValuesRequest) =>
    http.patch<unknown>("/api/configs", body),
};

export const roundingConfigsApi = {
  list: () => http.get<RoundingConfigItem[]>("/api/rounding-configs"),
  batchUpdate: (body: BatchUpdateRoundingConfigsRequest) =>
    http.patch<unknown>("/api/rounding-configs", body),
};
