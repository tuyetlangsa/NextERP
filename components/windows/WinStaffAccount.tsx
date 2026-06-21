"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  ColumnDirective,
  ColumnsDirective,
  Filter,
  GridComponent,
  Inject,
  Sort,
} from "@syncfusion/ej2-react-grids";
import {
  TreeViewComponent,
  type FieldsSettingsModel,
} from "@syncfusion/ej2-react-navigations";
import { ensureSyncfusionLicense } from "@/lib/syncfusion-license";
import { WinToolbar, TB } from "@/components/ui/WinToolbar";
import { StatusBar } from "@/components/ui/StatusBar";
import { LoadingBar, ErrorBar } from "@/components/ui/ResourceBars";
import { ChromeIcons } from "@/components/desktop/icons";
import { accessApi } from "@/lib/api/access";
import { useResource } from "@/lib/http/useResource";
import type { StaffAccountRow } from "@/types/api/access";

ensureSyncfusionLicense();

type TreeNode = {
  id: string;
  text: string;
  expanded?: boolean;
  child?: TreeNode[];
};

export function WinStaffAccount() {
  // ── Resources ────────────────────────────────────────────────────────────
  const rolesRes = useResource(() => accessApi.listRoles());
  const roles = rolesRes.data?.roles ?? [];

  const [roleId, setRoleId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const searchRef = useRef(search);
  searchRef.current = search;

  const accountsRes = useResource(
    () =>
      accessApi.listAccounts({
        roleId: roleId ?? undefined,
        search: search.trim() || undefined,
        pageNumber: 1,
        pageSize: 200,
      }),
    { deps: [roleId, search] }
  );
  const accounts = accountsRes.data?.items ?? [];
  const totalCount = accountsRes.data?.totalCount ?? 0;

  // ── Role tree data ────────────────────────────────────────────────────────
  const treeData = useMemo<TreeNode[]>(
    () => [
      {
        id: "all",
        text: `Tất cả (${roles.reduce((s, r) => s + r.accountCount, 0)})`,
        expanded: true,
        child: roles.map((r) => ({
          id: `r-${r.id}`,
          text: `${r.name} (${r.accountCount})`,
        })),
      },
    ],
    [roles]
  );

  const treeFields: FieldsSettingsModel = useMemo(
    () => ({
      dataSource: treeData as unknown as { [key: string]: object }[],
      id: "id",
      text: "text",
      child: "child" as never,
    }),
    [treeData]
  );

  const handleTreeSelect = useCallback(
    (args: { nodeData: { id: string | number } }) => {
      const raw = String(args.nodeData.id);
      setRoleId(raw === "all" ? null : Number(raw.replace("r-", "")));
    },
    []
  );

  // ── Grid selection ────────────────────────────────────────────────────────
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null
  );

  const handleRowSelected = useCallback(
    (args: { data: StaffAccountRow | StaffAccountRow[] }) => {
      const row = Array.isArray(args.data) ? args.data[0] : args.data;
      if (row?.id) setSelectedAccountId(row.id);
    },
    []
  );

  // ── Toolbar handlers ──────────────────────────────────────────────────────
  const handleAdd = useCallback(() => {
    setSelectedAccountId(0); // 0 = new account sentinel for detail dialog (Task 13)
  }, []);

  const handleEdit = useCallback(() => {
    // selectedAccountId is already set via rowSelected; no-op if nothing selected
  }, []);

  const handleRefresh = useCallback(() => {
    rolesRes.reload();
    accountsRes.reload();
  }, [rolesRes, accountsRes]);

  // ── Status cell template ──────────────────────────────────────────────────
  const statusTemplate = useCallback(
    (r: StaffAccountRow) =>
      r.isLocked ? "🔒 Khoá" : r.isActive ? "● Hoạt động" : "○ Vô hiệu",
    []
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Toolbar */}
      <WinToolbar
        left={
          <>
            <TB icon={ChromeIcons.Plus} onClick={handleAdd}>
              Thêm
            </TB>
            <TB
              icon={ChromeIcons.Edit}
              onClick={handleEdit}
              disabled={!selectedAccountId}
            >
              Sửa
            </TB>
            <div className="tb-divider" />
            <TB icon={ChromeIcons.Refresh} onClick={handleRefresh}>
              Làm mới
            </TB>
          </>
        }
        right={
          <input
            className="tb-search"
            placeholder="🔍 Tìm username / họ tên"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "4px 8px",
              border: "1px solid var(--border-strong)",
              borderRadius: 4,
              fontSize: 12,
              width: 220,
            }}
          />
        }
      />

      {/* Body */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Left — Role tree */}
        <div
          style={{
            width: 220,
            borderRight: "1px solid var(--border)",
            overflow: "auto",
            flexShrink: 0,
          }}
        >
          {rolesRes.loading && <LoadingBar text="Đang tải vai trò..." />}
          {rolesRes.isApiError && (
            <ErrorBar
              text={rolesRes.error ?? "Lỗi tải danh sách vai trò"}
              onRetry={rolesRes.reload}
            />
          )}
          <TreeViewComponent
            key={`roles-tree-${roles.length}`}
            fields={treeFields}
            nodeSelected={handleTreeSelect}
          />
        </div>

        {/* Right — Account grid */}
        <div
          style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
        >
          {accountsRes.loading && <LoadingBar text="Đang tải tài khoản..." />}
          {accountsRes.isApiError && (
            <ErrorBar
              text={accountsRes.error ?? "Lỗi tải danh sách tài khoản"}
              onRetry={accountsRes.reload}
            />
          )}
          <div style={{ flex: 1, overflow: "hidden" }}>
            <GridComponent
              key={`accounts-${roleId}-${accounts.length}`}
              dataSource={accounts}
              allowSorting
              allowFiltering
              filterSettings={{ type: "Menu" }}
              rowSelected={handleRowSelected}
              height="100%"
            >
              <ColumnsDirective>
                <ColumnDirective
                  field="id"
                  headerText="ID"
                  width="60"
                  isPrimaryKey
                  visible={false}
                />
                <ColumnDirective
                  field="username"
                  headerText="Tên đăng nhập"
                  width="160"
                />
                <ColumnDirective
                  field="fullName"
                  headerText="Họ tên"
                  width="220"
                />
                <ColumnDirective
                  field="phone"
                  headerText="Điện thoại"
                  width="130"
                />
                <ColumnDirective
                  field="roleName"
                  headerText="Vai trò"
                  width="130"
                />
                <ColumnDirective
                  field="isActive"
                  headerText="Trạng thái"
                  width="120"
                  template={statusTemplate}
                />
              </ColumnsDirective>
              <Inject services={[Sort, Filter]} />
            </GridComponent>
          </div>

          <StatusBar
            left={
              <>
                <span>{totalCount} tài khoản</span>
                {!roleId && <span>· tất cả vai trò</span>}
              </>
            }
          />
        </div>
      </div>

      {/* Detail dialog — mounted in Task 13 when selectedAccountId !== null */}
    </div>
  );
}
