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
import { authApi } from "@/lib/api/auth";
import { useResource } from "@/lib/http/useResource";
import { formatApiError } from "@/lib/http/formatError";
import type {
  StaffAccountRow,
  StaffAccountDetail,
  PageModuleGroup,
  PermissionGroupRow,
} from "@/types/api/access";

ensureSyncfusionLicense();

type TreeNode = {
  id: string;
  text: string;
  expanded?: boolean;
  child?: TreeNode[];
};

type CheckTreeNode = {
  id: string;
  text: string;
  expanded?: boolean;
  child: { id: string; text: string }[];
};

type CheckTree = { nodes: CheckTreeNode[]; checked: string[] };

function buildPageTree(modules: PageModuleGroup[], useGrants: boolean): CheckTree {
  const checked: string[] = [];
  const nodes = modules.map((m) => ({
    id: `m-${m.code}`,
    text: m.name,
    expanded: false,
    child: m.pages.map((p) => {
      if (useGrants && p.granted) checked.push(p.code);
      return { id: p.code, text: p.name };
    }),
  }));
  return { nodes, checked };
}

function buildPermTree(groups: PermissionGroupRow[], useGrants: boolean): CheckTree {
  const checked: string[] = [];
  const nodes = groups.map((g) => ({
    id: `g-${g.code}`,
    text: g.name,
    expanded: false,
    child: g.permissions.map((p) => {
      if (useGrants && p.granted) checked.push(p.code);
      return { id: p.code, text: p.name };
    }),
  }));
  return { nodes, checked };
}

/** Apply leaf codes to a checkbox tree without remounting (preserves expand/collapse). */
function applyCheckedLeaves(
  ref: React.RefObject<TreeViewComponent | null>,
  leafCodes: string[]
) {
  requestAnimationFrame(() => {
    const tree = ref.current;
    if (!tree) return;
    tree.uncheckAll();
    if (leafCodes.length > 0) tree.checkAll(leafCodes);
  });
}

const CHECK_TREE_FIELDS: FieldsSettingsModel = {
  id: "id",
  text: "text",
  child: "child" as never,
  expanded: "expanded",
};

const EMPTY_ACCOUNTS: StaffAccountRow[] = [];

export function WinStaffAccount() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [dialogTarget, setDialogTarget] = useState<HTMLElement | null>(null);
  const gridRef = useRef<GridComponent | null>(null);

  const bindHostRef = useCallback((node: HTMLDivElement | null) => {
    hostRef.current = node;
    if (node) setDialogTarget(node);
  }, []);
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
  const accountItems = accountsRes.data?.items;
  const totalCount = accountsRes.data?.totalCount ?? 0;

  const selectedRole = useMemo(
    () => (roleId != null ? roles.find((r) => r.id === roleId) ?? null : null),
    [roles, roleId]
  );

  // Client-side fallback when API returns unfiltered rows.
  const displayAccounts = useMemo(() => {
    if (!accountItems) return EMPTY_ACCOUNTS;
    if (!selectedRole) return accountItems;
    return accountItems.filter((a) => a.roleCode === selectedRole.code);
  }, [accountItems, selectedRole]);

  const displayCount = selectedRole ? displayAccounts.length : totalCount;

  // ── Role tree data (flat list — reliable click/select vs nested under "Tất cả") ──
  const treeData = useMemo<TreeNode[]>(() => {
    const total = roles.reduce((s, r) => s + r.accountCount, 0);
    return [
      { id: "all", text: `Tất cả (${total})` },
      ...roles.map((r) => ({
        id: `r-${r.id}`,
        text: `${r.name} (${r.accountCount})`,
      })),
    ];
  }, [roles]);

  const treeFields: FieldsSettingsModel = useMemo(
    () => ({
      dataSource: treeData as unknown as { [key: string]: object }[],
      id: "id",
      text: "text",
    }),
    [treeData]
  );

  const roleTreeRef = useRef<TreeViewComponent | null>(null);

  const applyRoleFilter = useCallback((raw: string | number | undefined | null) => {
    if (raw === undefined || raw === null || raw === "") return;
    const id = String(raw);
    setRoleId(id === "all" ? null : Number(id.replace(/^r-/, "")));
  }, []);

  const handleTreeSelect = useCallback(
    (args: { nodeData?: { id?: string | number }; node?: HTMLElement }) => {
      if (args.nodeData?.id != null) {
        applyRoleFilter(args.nodeData.id);
        return;
      }
      const tree = roleTreeRef.current;
      if (tree && args.node) {
        const data = tree.getNode(args.node) as { id?: string | number } | undefined;
        applyRoleFilter(data?.id);
      }
    },
    [applyRoleFilter]
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
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const [resetPwdOpen, setResetPwdOpen] = useState(false);
  const [resetPwdForm, setResetPwdForm] = useState({ password: "", confirm: "" });
  const [resetPwdError, setResetPwdError] = useState<string | null>(null);
  const [resetPwdSubmitting, setResetPwdSubmitting] = useState(false);

  type CheckTreeState = CheckTree;
  const [pageTree, setPageTree] = useState<CheckTreeState>({ nodes: [], checked: [] });
  const [permTree, setPermTree] = useState<CheckTreeState>({ nodes: [], checked: [] });
  const [bottomTab, setBottomTab] = useState<"menu" | "perm">("menu");
  const pageTreeRef = useRef<TreeViewComponent | null>(null);
  const permTreeRef = useRef<TreeViewComponent | null>(null);

  const currentIndex = useMemo(
    () => displayAccounts.findIndex((a) => a.id === selectedAccountId),
    [displayAccounts, selectedAccountId]
  );

  const pageTreeFields = useMemo<FieldsSettingsModel>(
    () => ({
      ...CHECK_TREE_FIELDS,
      dataSource: pageTree.nodes as unknown as { [key: string]: object }[],
    }),
    [pageTree.nodes]
  );

  const permTreeFields = useMemo<FieldsSettingsModel>(
    () => ({
      ...CHECK_TREE_FIELDS,
      dataSource: permTree.nodes as unknown as { [key: string]: object }[],
    }),
    [permTree.nodes]
  );

  const loadAccessTrees = useCallback(async (catalogAccountId: number, useGrants: boolean) => {
    const [pageRes, permRes] = await Promise.all([
      accessApi.getPageAccess(catalogAccountId),
      accessApi.getPermissions(catalogAccountId),
    ]);
    if (pageRes.isSuccess && pageRes.data) {
      setPageTree(buildPageTree(pageRes.data.modules, useGrants));
    }
    if (permRes.isSuccess && permRes.data) {
      setPermTree(buildPermTree(permRes.data.groups, useGrants));
    }
  }, []);

  const resolveCatalogAccountId = useCallback(async (): Promise<number | null> => {
    if (lastSelectedId) return lastSelectedId;
    if (accountItems?.[0]?.id) return accountItems[0].id;
    const meRes = await authApi.me();
    if (meRes.isSuccess && meRes.data?.staffAccountId) return meRes.data.staffAccountId;
    return null;
  }, [lastSelectedId, accountItems]);

  // Syncfusion modal on document.body collapses %-height grids behind it — refresh after overlay toggles.
  useEffect(() => {
    const id = requestAnimationFrame(() => gridRef.current?.refresh());
    return () => cancelAnimationFrame(id);
  }, [dialogOpen, resetPwdOpen, displayAccounts]);

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
    if (selectedAccountId === null) return;

    if (selectedAccountId === 0) {
      let active = true;
      (async () => {
        const catalogId = await resolveCatalogAccountId();
        if (!active || catalogId == null) {
          setPageTree({ nodes: [], checked: [] });
          setPermTree({ nodes: [], checked: [] });
          return;
        }
        await loadAccessTrees(catalogId, false);
      })();
      return () => {
        active = false;
      };
    }

    let active = true;
    loadAccessTrees(selectedAccountId, true);
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId, loadAccessTrees, resolveCatalogAccountId]);

  const gotoIndex = useCallback(
    (i: number) => {
      if (i >= 0 && i < displayAccounts.length) setSelectedAccountId(displayAccounts[i].id);
    },
    [displayAccounts]
  );

  const closeDialog = useCallback(() => {
    setSelectedAccountId(null);
    setSaveError(null);
    setSaveSuccess(null);
    setResetPwdOpen(false);
  }, []);

  const handleDialogBeforeClose = useCallback(
    (args: { cancel?: boolean }) => {
      args.cancel = true;
      closeDialog();
    },
    [closeDialog]
  );

  const handleApplyRoleDefault = useCallback(async () => {
    const role = roles.find(r => r.id === form.roleId);
    if (!role) return;
    if (bottomTab === "menu") {
      const res = await accessApi.getRolePageDefault(role.code);
      if (res.isSuccess && res.data) {
        const codes = res.data.pageCodes;
        setPageTree(t => ({ ...t, checked: codes }));
        applyCheckedLeaves(pageTreeRef, codes);
      }
    } else {
      const res = await accessApi.getRolePermissionDefault(role.code);
      if (res.isSuccess && res.data) {
        const codes = res.data.permissionCodes;
        setPermTree(t => ({ ...t, checked: codes }));
        applyCheckedLeaves(permTreeRef, codes);
      }
    }
  }, [roles, form.roleId, bottomTab]);

  const openResetPassword = useCallback(() => {
    setResetPwdForm({ password: "", confirm: "" });
    setResetPwdError(null);
    setSaveSuccess(null);
    setResetPwdOpen(true);
  }, []);

  const closeResetPassword = useCallback(() => {
    setResetPwdOpen(false);
    setResetPwdForm({ password: "", confirm: "" });
    setResetPwdError(null);
    setResetPwdSubmitting(false);
  }, []);

  const submitResetPassword = useCallback(async () => {
    if (selectedAccountId === null || selectedAccountId === 0) return;
    setResetPwdError(null);
    const pwd = resetPwdForm.password;
    const confirm = resetPwdForm.confirm;
    if (pwd.length < 6) {
      setResetPwdError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    if (pwd !== confirm) {
      setResetPwdError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setResetPwdSubmitting(true);
    const res = await accessApi.resetPassword(selectedAccountId, pwd);
    setResetPwdSubmitting(false);
    if (!res.isSuccess) {
      setResetPwdError(formatApiError(res));
      return;
    }
    closeResetPassword();
    setSaveSuccess(`Đã đặt lại mật khẩu cho tài khoản ${form.username}.`);
  }, [selectedAccountId, resetPwdForm, form.username, closeResetPassword]);

  const collectCheckedCodes = (ref: React.RefObject<TreeViewComponent | null>): string[] => {
    const ids = (ref.current?.getAllCheckedNodes() ?? []) as string[];
    return ids.filter(id => !id.startsWith("m-") && !id.startsWith("g-")); // leaf codes only
  };

  const handleSave = useCallback(async () => {
    setSaveError(null);
    setSaveSuccess(null);
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
    rolesRes.reload();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, isCreate, selectedAccountId, closeDialog, accountsRes, rolesRes]);

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
    <div ref={bindHostRef} style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
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
            ref={roleTreeRef}
            key={`roles-tree-${roles.length}`}
            fields={treeFields}
            nodeSelected={handleTreeSelect}
            nodeClicked={handleTreeSelect}
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
          <div style={{ flex: 1, overflow: "hidden", minHeight: 120 }}>
            <GridComponent
              ref={gridRef}
              dataSource={displayAccounts}
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
                <span>{displayCount} tài khoản</span>
                {selectedRole ? (
                  <span>· {selectedRole.name}</span>
                ) : (
                  <span>· tất cả vai trò</span>
                )}
              </>
            }
          />
        </div>
      </div>

      {/* Detail dialog — always mounted; Syncfusion breaks if wrapped in {open && ...} */}
      <DialogComponent
        width="760px"
        cssClass="staff-account-dialog"
        target={dialogTarget ?? undefined}
        header={
          isCreate
            ? "Tạo tài khoản mới"
            : `Chi tiết người dùng: ${form.fullName}`
        }
        visible={dialogOpen}
        showCloseIcon
        beforeClose={handleDialogBeforeClose}
        isModal
      >
        {dialogOpen ? (
          <div className="staff-account-dialog-body" style={{ position: "relative" }}>
          <div className="staff-account-dialog-toolbar">
            <button type="button" className="tb-btn primary" onClick={handleSave}>
              Lưu
            </button>
            <button type="button" className="tb-btn" onClick={closeDialog}>
              Bỏ qua
            </button>
            {!isCreate && (
              <button type="button" className="tb-btn" onClick={openResetPassword}>
                Reset mật khẩu
              </button>
            )}
            {!isCreate && currentIndex >= 0 && (
              <div className="staff-account-dialog-nav" style={{ marginLeft: "auto" }}>
                <button
                  type="button"
                  className="tb-btn"
                  disabled={currentIndex <= 0}
                  onClick={() => gotoIndex(currentIndex - 1)}
                >
                  Trước
                </button>
                <span>
                  {currentIndex + 1} / {displayAccounts.length}
                </span>
                <button
                  type="button"
                  className="tb-btn"
                  disabled={currentIndex >= displayAccounts.length - 1}
                  onClick={() => gotoIndex(currentIndex + 1)}
                >
                  Sau
                </button>
              </div>
            )}
          </div>

          {saveSuccess && (
            <div className="staff-account-dialog-alert success">
              <span>{saveSuccess}</span>
              <button
                type="button"
                className="staff-account-dialog-alert-dismiss"
                onClick={() => setSaveSuccess(null)}
              >
                Đóng
              </button>
            </div>
          )}

          {saveError && (
            <div className="staff-account-dialog-alert error">
              <span>{saveError}</span>
              <button
                type="button"
                className="staff-account-dialog-alert-dismiss"
                onClick={() => setSaveError(null)}
              >
                Đóng
              </button>
            </div>
          )}

          <div className="staff-account-dialog-form">
            <div className="staff-account-dialog-form-main">
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
              <div className="staff-account-dialog-checks">
                <label>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, isActive: e.target.checked }))
                    }
                  />
                  Kích hoạt
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={form.isLocked}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, isLocked: e.target.checked }))
                    }
                  />
                  Khoá
                </label>
              </div>
            </div>

            <div className="staff-account-dialog-form-side">
              <Field label="Vai trò">
                <DropDownListComponent
                  dataSource={roles.map((r) => ({ text: r.name, value: r.id }))}
                  fields={{ text: "text", value: "value" }}
                  value={form.roleId ?? undefined}
                  change={(e: DropDownChangeEventArgs) =>
                    setForm((f) => ({ ...f, roleId: e.value as number }))
                  }
                />
              </Field>
            </div>
          </div>

          <div className="staff-account-dialog-perms">
            <div className="staff-account-dialog-perms-tabs">
              {([
                { key: "menu", label: "Truy cập trang" },
                { key: "perm", label: "Quyền chức năng" },
              ] as const).map(t => {
                const on = bottomTab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    className={`staff-account-dialog-perms-tab${on ? " active" : ""}`}
                    onClick={() => setBottomTab(t.key)}
                  >
                    {t.label}
                  </button>
                );
              })}
              <div className="staff-account-dialog-toolbar-spacer" />
              <button
                type="button"
                className="tb-btn"
                style={{ alignSelf: "center", marginRight: 8 }}
                onClick={handleApplyRoleDefault}
              >
                Áp dụng mặc định theo vai trò
              </button>
            </div>

            <div className="staff-account-dialog-perms-hint">
              {bottomTab === "menu"
                ? "Tick cả module để cấp toàn bộ trang trong đó, hoặc mở module ra tick từng trang. Dấu − = cấp một phần."
                : "Tick cả nhóm để cấp toàn bộ quyền trong nhóm, hoặc mở nhóm ra tick từng quyền. Dấu − = cấp một phần."}
            </div>

            <div className="staff-account-dialog-perms-tree">
              {bottomTab === "menu" ? (
                pageTree.nodes.length === 0 ? (
                  <div style={{ padding: 12, fontSize: 12, color: "#71717a" }}>
                    {isCreate ? "Đang tải danh mục trang..." : "Không có dữ liệu trang."}
                  </div>
                ) : (
                  <TreeViewComponent
                    key={`pagetree-${selectedAccountId}-${pageTree.nodes.length}`}
                    ref={pageTreeRef}
                    cssClass="access-check-tree"
                    fields={pageTreeFields}
                    showCheckBox
                    autoCheck
                    loadOnDemand={false}
                    fullRowSelect={false}
                    checkedNodes={pageTree.checked}
                  />
                )
              ) : permTree.nodes.length === 0 ? (
                <div style={{ padding: 12, fontSize: 12, color: "#71717a" }}>
                  {isCreate ? "Đang tải danh mục quyền..." : "Không có dữ liệu quyền."}
                </div>
              ) : (
                <TreeViewComponent
                  key={`permtree-${selectedAccountId}-${permTree.nodes.length}`}
                  ref={permTreeRef}
                  cssClass="access-check-tree"
                  fields={permTreeFields}
                  showCheckBox
                  autoCheck
                  loadOnDemand={false}
                  fullRowSelect={false}
                  checkedNodes={permTree.checked}
                />
              )}
            </div>
          </div>

          {resetPwdOpen && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 10,
                background: "rgba(0,0,0,0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={closeResetPassword}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="reset-pwd-title"
                style={{
                  background: "#fff",
                  borderRadius: 8,
                  padding: "16px 20px",
                  width: 400,
                  maxWidth: "92vw",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                  border: "1px solid var(--border-strong)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  id="reset-pwd-title"
                  style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}
                >
                  Đặt lại mật khẩu
                </div>
                <p style={{ fontSize: 12, color: "var(--fg-muted)", margin: "0 0 12px" }}>
                  Tài khoản: <strong>{form.username}</strong>
                  {form.fullName ? ` — ${form.fullName}` : ""}
                </p>
                <Field label="Mật khẩu mới *">
                  <input
                    type="password"
                    value={resetPwdForm.password}
                    autoFocus
                    autoComplete="off"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    onChange={(e) =>
                      setResetPwdForm((f) => ({ ...f, password: e.target.value }))
                    }
                    placeholder="Tối thiểu 6 ký tự"
                  />
                </Field>
                <Field label="Xác nhận mật khẩu *">
                  <input
                    type="password"
                    value={resetPwdForm.confirm}
                    autoComplete="off"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    onChange={(e) =>
                      setResetPwdForm((f) => ({ ...f, confirm: e.target.value }))
                    }
                    placeholder="Nhập lại mật khẩu mới"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !resetPwdSubmitting) {
                        e.preventDefault();
                        void submitResetPassword();
                      }
                    }}
                  />
                </Field>
                {resetPwdError && (
                  <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 4 }}>
                    {resetPwdError}
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    justifyContent: "flex-end",
                    marginTop: 16,
                    paddingTop: 12,
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <button
                    type="button"
                    className="tb-btn"
                    onClick={closeResetPassword}
                    disabled={resetPwdSubmitting}
                  >
                    Huỷ
                  </button>
                  <button
                    type="button"
                    className="tb-btn primary"
                    disabled={resetPwdSubmitting}
                    onClick={() => void submitResetPassword()}
                  >
                    {resetPwdSubmitting ? "Đang lưu..." : "Xác nhận"}
                  </button>
                </div>
              </div>
            </div>
          )}
          </div>
        ) : null}
      </DialogComponent>
    </div>
  );
}
