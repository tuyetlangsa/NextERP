"use client";

import { useEffect } from "react";
import { useResource } from "@/lib/http/useResource";
import { reportsApi } from "@/lib/api/reports";
import { AnalyzeButton } from "@/components/reports/AnalyzeButton";
import { flattenTopOrderStaffRows } from "@/components/reports/topOrderStaffRows";
import {
  GridComponent,
  ColumnsDirective,
  ColumnDirective,
  Page,
  Sort,
  Inject,
} from "@syncfusion/ej2-react-grids";

export function TopOrderStaffTab({
  filters,
  onLoading,
  onError,
}: {
  filters: Record<string, unknown>;
  onLoading: (value: boolean) => void;
  onError: (error: string | null) => void;
}) {
  const result = useResource(
    () => reportsApi.topOrderStaffByItem(filters as any),
    { deps: [filters] },
  );

  useEffect(() => {
    onLoading(result.loading);
  }, [result.loading, onLoading]);

  useEffect(() => {
    onError(result.error);
  }, [result.error, onError]);

  if (result.data === null) return null;

  const data = result.data;
  const rows = flattenTopOrderStaffRows(data);

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-end px-1 pb-2">
        <AnalyzeButton reportName="Top nhân viên theo món" data={data} />
      </div>

      <p className="px-1 pb-3 text-sm text-gray-600">
        Sản lượng thuần là số lượng ròng có gán nhân viên tạo order, gồm cả hoàn món không bị huỷ
        nên có thể âm. Chỉ đối chiếu với tab Món hàng khi không có order cũ thiếu người tạo; nếu
        lọc Quầy/Khu, dữ liệu phiếu phải trùng snapshot hoá đơn. Tổng tỷ lệ top 3 có thể không bằng
        100% vì còn nhân viên khác hoặc có hoàn món.
      </p>

      {rows.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-400">
          Không có dữ liệu
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <GridComponent
            dataSource={rows}
            allowSorting
            allowPaging
            pageSettings={{ pageSize: 50 }}
            height="100%"
          >
            <ColumnsDirective>
              <ColumnDirective field="id" isPrimaryKey visible={false} />
              <ColumnDirective field="itemCode" headerText="Mã món" width="110" />
              <ColumnDirective field="itemName" headerText="Tên món" width="200" />
              <ColumnDirective field="uomCode" headerText="Đơn vị tính" width="100" />
              <ColumnDirective
                field="totalQuantity"
                headerText="Sản lượng thuần"
                width="130"
                textAlign="Right"
                format="N2"
              />
              <ColumnDirective
                field="rank"
                headerText="Hạng"
                width="80"
                textAlign="Right"
              />
              <ColumnDirective field="staffName" headerText="Nhân viên" width="180" />
              <ColumnDirective
                field="staffQuantity"
                headerText="SL nhân viên"
                width="120"
                textAlign="Right"
                format="N2"
              />
              <ColumnDirective
                field="percentageOfItemQuantity"
                headerText="% sản lượng món"
                width="140"
                textAlign="Right"
                format="N1"
              />
            </ColumnsDirective>
            <Inject services={[Page, Sort]} />
          </GridComponent>
        </div>
      )}
    </div>
  );
}
