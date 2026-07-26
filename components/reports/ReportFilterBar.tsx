// components/reports/ReportFilterBar.tsx
"use client";

import { DatePickerComponent } from "@syncfusion/ej2-react-calendars";
import { DropDownListComponent } from "@syncfusion/ej2-react-dropdowns";

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
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50 text-sm">
      <DatePickerComponent
        value={value.fromDate}
        format="dd/MM/yyyy"
        change={(args: any) => args.value && onChange({ ...value, fromDate: args.value })}
        cssClass="w-32"
      />
      <span className="text-gray-400">{"→"}</span>
      <DatePickerComponent
        value={value.toDate}
        format="dd/MM/yyyy"
        change={(args: any) => args.value && onChange({ ...value, toDate: args.value })}
        cssClass="w-32"
      />
      {v.counter !== false && (
        <DropDownListComponent
          dataSource={[{ id: undefined, name: "Tất cả quầy" } as any, ...(counters ?? [])]}
          fields={{ text: "name", value: "id" }}
          value={value.counterId as any}
          change={(args: any) => onChange({ ...value, counterId: args.value || undefined })}
          cssClass="w-36"
        />
      )}
      {v.area !== false && (
        <DropDownListComponent
          dataSource={[{ id: undefined, name: "Tất cả khu" } as any, ...(areas ?? [])]}
          fields={{ text: "name", value: "id" }}
          value={value.areaId as any}
          change={(args: any) => onChange({ ...value, areaId: args.value || undefined })}
          cssClass="w-36"
        />
      )}
      {v.shift !== false && (
        <DropDownListComponent
          dataSource={[{ id: undefined, name: "Tất cả ca" } as any, ...(shifts ?? [])]}
          fields={{ text: "name", value: "id" }}
          value={value.shiftId as any}
          change={(args: any) => onChange({ ...value, shiftId: args.value || undefined })}
          cssClass="w-36"
        />
      )}
      {v.category !== false && (
        <DropDownListComponent
          dataSource={[{ id: undefined, name: "Tất cả DM" } as any, ...(categories ?? [])]}
          fields={{ text: "name", value: "id" }}
          value={value.categoryId as any}
          change={(args: any) => onChange({ ...value, categoryId: args.value || undefined })}
          cssClass="w-36"
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
