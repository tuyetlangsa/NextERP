// components/reports/ReportFilterBar.tsx
"use client";

import { DatePickerComponent } from "@syncfusion/ej2-react-calendars";
import { DropDownListComponent } from "@syncfusion/ej2-react-dropdowns";

/**
 * Sentinel value for the "Tất cả …" option. Syncfusion treats `undefined`/`null`
 * as "no selection" and shows a blank box, so the All option needs a real value.
 * Entity ids start at 1, so 0 is safe. Mapped back to `undefined` on change.
 */
const ALL = 0;

export interface ReportFilterValues {
  fromDate: Date;
  toDate: Date;
  counterId?: number;
  areaId?: number;
  shiftId?: number;
  categoryId?: number;
}

interface LookupItem {
  id: number;
  name: string;
}

interface Props {
  value: ReportFilterValues;
  onChange: (v: ReportFilterValues) => void;
  visibleFilters?: {
    counter?: boolean;
    area?: boolean;
    shift?: boolean;
    category?: boolean;
  };
  counters?: LookupItem[];
  areas?: LookupItem[];
  shifts?: LookupItem[];
  categories?: LookupItem[];
}

export function ReportFilterBar({
  value,
  onChange,
  visibleFilters = {},
  counters,
  areas,
  shifts,
  categories,
}: Props) {
  const v = visibleFilters;

  return (
    // Syncfusion date/dropdown roots default to width:100% (block). As direct flex
    // children each fills the row and wraps → one filter per line. An explicit `width`
    // prop (renders inline-style) keeps them narrow so they line up horizontally.
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50 text-sm">
      <DatePickerComponent
        value={value.fromDate}
        format="dd/MM/yyyy"
        width={140}
        change={(args: any) => args.value && onChange({ ...value, fromDate: args.value })}
      />
      <span className="text-gray-400">{"→"}</span>
      <DatePickerComponent
        value={value.toDate}
        format="dd/MM/yyyy"
        width={140}
        change={(args: any) => args.value && onChange({ ...value, toDate: args.value })}
      />
      {v.counter !== false && (
        <DropDownListComponent
          dataSource={[{ id: ALL, name: "Tất cả quầy" } as any, ...(counters ?? [])]}
          fields={{ text: "name", value: "id" }}
          value={(value.counterId ?? ALL) as any}
          width={150}
          change={(args: any) => onChange({ ...value, counterId: args.value || undefined })}
        />
      )}
      {v.area !== false && (
        <DropDownListComponent
          dataSource={[{ id: ALL, name: "Tất cả khu" } as any, ...(areas ?? [])]}
          fields={{ text: "name", value: "id" }}
          value={(value.areaId ?? ALL) as any}
          width={150}
          change={(args: any) => onChange({ ...value, areaId: args.value || undefined })}
        />
      )}
      {v.shift !== false && (
        <DropDownListComponent
          dataSource={[{ id: ALL, name: "Tất cả ca" } as any, ...(shifts ?? [])]}
          fields={{ text: "name", value: "id" }}
          value={(value.shiftId ?? ALL) as any}
          width={150}
          change={(args: any) => onChange({ ...value, shiftId: args.value || undefined })}
        />
      )}
      {v.category !== false && (
        <DropDownListComponent
          dataSource={[{ id: ALL, name: "Tất cả danh mục" } as any, ...(categories ?? [])]}
          fields={{ text: "name", value: "id" }}
          value={(value.categoryId ?? ALL) as any}
          width={150}
          change={(args: any) => onChange({ ...value, categoryId: args.value || undefined })}
        />
      )}
    </div>
  );
}

export function defaultFilterValues(): ReportFilterValues {
  const now = new Date();
  return {
    fromDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30),
    toDate: now,
  };
}
