"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
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
import { DialogComponent } from "@syncfusion/ej2-react-popups";
import { DropDownListComponent } from "@syncfusion/ej2-react-dropdowns";
import type { ChangeEventArgs as DropDownChangeEventArgs } from "@syncfusion/ej2-dropdowns";
import { ensureSyncfusionLicense } from "@/lib/syncfusion-license";
import { WinToolbar, TB } from "@/components/ui/WinToolbar";
import { Field } from "@/components/ui/DetailPanel";
import { StatusBar } from "@/components/ui/StatusBar";
import { LoadingBar, ErrorBar } from "@/components/ui/ResourceBars";
import { ChromeIcons } from "@/components/desktop/icons";
import { accessApi } from "@/lib/api/access";
import { useResource } from "@/lib/http/useResource";
import { formatApiError } from "@/lib/http/formatError";
import type { StaffAccountRow, StaffAccountDetail } from "@/types/api/access";

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
  const [lastSelectedId, setLastSelectedId] = useState<number | null>(null);

  const handleRowSelected = useCallback(
    (args: { data: StaffAccountRow | StaffAccountRow[] }) => {
      const row = Array.isArray(args.data) ? args.data[0] : args.data;
      if (row?.id) {
        setLastSelectedId(row.id);
      }
    },
    []
  );

  // ── Dialog state ──────────────────────────────────────────────────────────
  const isCreate = selectedAccountId === 0;
  const dialogOpen = selectedAccountId !== null;

  const [form, setForm] = useState<{
    username: string;
    password: string;
    fullName: string;
    phone: string;
    email: string;
    roleId: number | null;
    isActive: boolean;
    isLocked: boolean;
  }>({
    username: "",
    password: "",
    fullName: "",
    phone: "",
    email: "",
    roleId: null,
    isActive: true,
    isLocked: false,
  });
  const [saveError, setSaveError] = useState<string | null>(null);

  type CheckTree = { nodes: { id: string; text: string; expanded?: boolean; child?: { id: string; text: string }[] }[]; checked: string[] };
  const [pageTree, setPageTree] = useState<CheckTree>({ nodes: [], checked: [] });
  const [permTree, setPermTree] = useState<CheckTree>({ nodes: [], checked: [] });
  const [pageTreeVersion, setPageTreeVersion] = useState(0);
  const [permTreeVersion, setPermTreeVersion] = useState(0);
  const [bottomTab, setBottomTab] = useState<"menu" | "perm">("menu");
  const pageTreeRef = useRef<TreeViewComponent | null>(null);
  const permTreeRef = useRef<TreeViewComponent | null>(null);

  const currentIndex = useMemo(
    () => accounts.findIndex((a) => a.id === selectedAccountId),
    [accounts, selectedAccountId]
  );

  useEffect(() => {
    if (selectedAccountId === null) return;
    if (selectedAccountId === 0) {
      setForm({
        username: "",
        password: "",
        fullName: "",
        phone: "",
        email: "",
        roleId: roleId ?? roles[0]?.id ?? null,
        isActive: true,
        isLocked: false,
      });
      return;
    }
    let active = true;
    accessApi.getAccount(selectedAccountId).then((res) => {
      if (!active || !res.isSuccess || !res.data) return;
      const d: StaffAccountDetail = res.data;
      setForm({
        username: d.username,
        password: "",
        fullName: d.fullName,
        phone: d.phone ?? "",
        email: d.email ?? "",
        roleId: d.roleId,
        isActive: d.isActive,
        isLocked: d.isLocked,
      });
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId]);

  useEffect(() => {
    if (selectedAccountId === null || selectedAccountId === 0) {
      setPageTree({ nodes: [], checked: [] });
      setPageTreeVersion(v => v + 1);
      setPermTree({ nodes: [], checked: [] });
      setPermTreeVersion(v => v + 1);
      return;
    }
    let active = true;
    accessApi.getPageAccess(selectedAccountId).then(res => {
      if (!active || !res.isSuccess || !res.data) return;
      const checked: string[] = [];
      const nodes = res.data.modules.map(m => ({
        id: `m-${m.code}`, text: m.name, expanded: true,
        child: m.pages.map(p => { if (p.granted) checked.push(p.code); return { id: p.code, text: p.name }; }),
      }));
      setPageTree({ nodes, checked });
      setPageTreeVersion(v => v + 1);
    });
    accessApi.getPermissions(selectedAccountId).then(res => {
      if (!active || !res.isSuccess || !res.data) return;
      const checked: string[] = [];
      const nodes = res.data.groups.map(g => ({
        id: `g-${g.code}`, text: g.name, expanded: true,
        child: g.permissions.map(p => { if (p.granted) checked.push(p.code); return { id: p.code, text: p.name }; }),
      }));
      setPermTree({ nodes, checked });
      setPermTreeVersion(v => v + 1);
    });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId]);

  const gotoIndex = useCallback(
    (i: number) => {
      if (i >= 0 && i < accounts.length) setSelectedAccountId(accounts[i].id);
    },
    [accounts]
  );

  const closeDialog = useCallback(() => {
    setSelectedAccountId(null);
    setSaveError(null);
  }, []);

  const handleApplyRoleDefault = useCallback(async () => {
    const role = roles.find(r => r.id === form.roleId);
    if (!role) return;
    if (bottomTab === "menu") {
      const res = await accessApi.getRolePageDefault(role.code);
      if (res.isSuccess && res.data) {
        setPageTree(t => ({ ...t, checked: res.data!.pageCodes }));
        setPageTreeVersion(v => v + 1);
      }
    } else {
      const res = await accessApi.getRolePermissionDefault(role.code);
      if (res.isSuccess && res.data) {
        setPermTree(t => ({ ...t, checked: res.data!.permissionCodes }));
        setPermTreeVersion(v => v + 1);
      }
    }
  }, [roles, form.roleId, bottomTab]);

  const handleResetPassword = useCallback(async () => {
    if (selectedAccountId === null || selectedAccountId === 0) return;
    const pwd = window.prompt("Mật khẩu mới (≥ 6 ký tự):");
    if (!pwd) return;
    const res = await accessApi.resetPassword(selectedAccountId, pwd);
    if (!res.isSuccess) {
      setSaveError(formatApiError(res));
      return;
    }
    window.alert("Đã đặt lại mật khẩu.");
  }, [selectedAccountId]);

  const collectCheckedCodes = (ref: React.RefObject<TreeViewComponent | null>): string[] => {
    const ids = (ref.current?.getAllCheckedNodes() ?? []) as string[];
    return ids.filter(id => !id.startsWith("m-") && !id.startsWith("g-")); // leaf codes only
  };

  const handleSave = useCallback(async () => {
    setSaveError(null);
    if (!form.fullName.trim() || !form.roleId) { setSaveError("Họ tên và vai trò là bắt buộc."); return; }
    if (isCreate && (!form.username.trim() || form.password.length < 6)) {
      setSaveError("Tên đăng nhập bắt buộc và mật khẩu ≥ 6 ký tự."); return;
    }

    let accountId = selectedAccountId!;
    if (isCreate) {
      const res = await accessApi.createAccount({
        username: form.username.trim(), password: form.password, fullName: form.fullName.trim(),
        phone: form.phone || null, email: form.email || null, roleId: form.roleId,
      });
      if (!res.isSuccess || !res.data) { setSaveError(formatApiError(res)); return; }
      accountId = res.data.id;
    } else {
      const res = await accessApi.updateAccount(accountId, {
        fullName: form.fullName.trim(), phone: form.phone || null, email: form.email || null,
        roleId: form.roleId, isActive: form.isActive, isLocked: form.isLocked,
      });
      if (!res.isSuccess) { setSaveError(formatApiError(res)); return; }
    }

    const pageRes = await accessApi.setPageAccess(accountId, collectCheckedCodes(pageTreeRef));
    if (!pageRes.isSuccess) { setSaveError(formatApiError(pageRes)); return; }

    const permRes = await accessApi.setPermissions(accountId, collectCheckedCodes(permTreeRef));
    if (!permRes.isSuccess) { setSaveError(formatApiError(permRes)); return; }

    closeDialog();
    accountsRes.reload();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, isCreate, selectedAccountId, closeDialog, accountsRes]);

  // ── Toolbar handlers ──────────────────────────────────────────────────────
  const handleAdd = useCallback(() => {
    setSelectedAccountId(0); // 0 = new account sentinel for detail dialog (Task 13)
  }, []);

  const handleEdit = useCallback(() => {
    // Re-open the detail dialog for the last grid row the user selected.
    if (lastSelectedId) {
      setSelectedAccountId(lastSelectedId);
    }
  }, [lastSelectedId]);

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
            <TB icon={ChromeIcons.Plus} onClick={handleAdd} disabled={roles.length === 0}>
              Thêm
            </TB>
            <TB
              icon={ChromeIcons.Edit}
              onClick={handleEdit}
              disabled={!lastSelectedId}
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

      {/* Detail dialog */}
      {dialogOpen && (
        <DialogComponent
          width="760px"
          header={
            isCreate
              ? "Tạo tài khoản mới"
              : `Chi tiết người dùng: ${form.fullName}`
          }
          visible={dialogOpen}
          showCloseIcon
          beforeClose={closeDialog}
          isModal
        >
          {/* Dialog toolbar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 0",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <button className="tb-btn" onClick={handleSave}>
              💾 Lưu
            </button>
            <button className="tb-btn" onClick={closeDialog}>
              ↩ Bỏ qua
            </button>
            {!isCreate && (
              <button className="tb-btn" onClick={handleResetPassword}>
                🔑 Reset mật khẩu
              </button>
            )}
            {!isCreate && currentIndex >= 0 && (
              <span
                style={{
                  marginLeft: "auto",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <button
                  className="tb-btn"
                  disabled={currentIndex <= 0}
                  onClick={() => gotoIndex(currentIndex - 1)}
                >
                  ◀
                </button>
                <span>
                  {currentIndex + 1} / {accounts.length}
                </span>
                <button
                  className="tb-btn"
                  disabled={currentIndex >= accounts.length - 1}
                  onClick={() => gotoIndex(currentIndex + 1)}
                >
                  ▶
                </button>
              </span>
            )}
          </div>

          {/* Form body */}
          <div style={{ display: "flex", gap: 16, padding: "12px 0" }}>
            {/* Left — fields */}
            <div style={{ flex: 1 }}>
              <Field label="Họ tên *">
                <input
                  value={form.fullName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fullName: e.target.value }))
                  }
                />
              </Field>
              <Field label="Tên đăng nhập *">
                <input
                  value={form.username}
                  disabled={!isCreate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, username: e.target.value }))
                  }
                />
              </Field>
              {isCreate && (
                <Field label="Mật khẩu *">
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, password: e.target.value }))
                    }
                  />
                </Field>
              )}
              <Field label="Điện thoại">
                <input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                />
              </Field>
              <Field label="Email">
                <input
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </Field>
              <div style={{ marginTop: 8, display: "flex", gap: 16 }}>
                <label>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, isActive: e.target.checked }))
                    }
                  />{" "}
                  Kích hoạt
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={form.isLocked}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, isLocked: e.target.checked }))
                    }
                  />{" "}
                  Khoá
                </label>
              </div>
            </div>

            {/* Right — role selector */}
            <div
              style={{
                width: 220,
                borderLeft: "1px solid var(--border)",
                paddingLeft: 16,
              }}
            >
              <div className="label">VAI TRÒ</div>
              <DropDownListComponent
                dataSource={roles.map((r) => ({ text: r.name, value: r.id }))}
                fields={{ text: "text", value: "value" }}
                value={form.roleId ?? undefined}
                change={(e: DropDownChangeEventArgs) =>
                  setForm((f) => ({ ...f, roleId: e.value as number }))
                }
              />
            </div>
          </div>

          {saveError && (
            <ErrorBar text={saveError} onRetry={() => setSaveError(null)} />
          )}

          {/* Phân quyền — 2 tab tách rõ */}
          <div style={{ marginTop: 12, border: "1px solid var(--border-strong)", borderRadius: 6, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "stretch", background: "var(--accent-bg)", borderBottom: "1px solid var(--border-strong)" }}>
              {([
                { key: "menu", label: "Truy cập trang (Module / Page)" },
                { key: "perm", label: "Quyền chức năng (Permission)" },
              ] as const).map(t => {
                const on = bottomTab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setBottomTab(t.key)}
                    style={{
                      padding: "8px 16px", fontSize: 13, cursor: "pointer", border: "none",
                      background: on ? "#fff" : "transparent",
                      color: on ? "var(--accent)" : "#71717a",
                      fontWeight: on ? 700 : 500,
                      borderBottom: on ? "2px solid var(--accent)" : "2px solid transparent",
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
              <button className="tb-btn" style={{ marginLeft: "auto", alignSelf: "center", marginRight: 8 }} onClick={handleApplyRoleDefault}>
                ⟳ Áp dụng mặc định theo vai trò
              </button>
            </div>

            <div style={{ padding: "6px 12px", fontSize: 11, color: "#71717a", background: "#fafafa", borderBottom: "1px solid var(--border)" }}>
              {bottomTab === "menu"
                ? "Tick cả module để cấp toàn bộ trang trong đó, hoặc mở module ra tick từng trang. Dấu − = cấp một phần."
                : "Tick cả nhóm để cấp toàn bộ quyền trong nhóm, hoặc mở nhóm ra tick từng quyền. Dấu − = cấp một phần."}
            </div>

            <div style={{ maxHeight: 260, overflow: "auto", padding: 8 }}>
              {bottomTab === "menu" ? (
                <TreeViewComponent
                  key={`pagetree-${selectedAccountId}-${pageTreeVersion}`}
                  ref={pageTreeRef}
                  fields={{ dataSource: pageTree.nodes as unknown as { [k: string]: object }[], id: "id", text: "text", expanded: "expanded", child: "child" as never }}
                  showCheckBox
                  autoCheck
                  checkedNodes={pageTree.checked}
                />
              ) : (
                <TreeViewComponent
                  key={`permtree-${selectedAccountId}-${permTreeVersion}`}
                  ref={permTreeRef}
                  fields={{ dataSource: permTree.nodes as unknown as { [k: string]: object }[], id: "id", text: "text", expanded: "expanded", child: "child" as never }}
                  showCheckBox
                  autoCheck
                  checkedNodes={permTree.checked}
                />
              )}
            </div>
          </div>
        </DialogComponent>
      )}
    </div>
  );
}
