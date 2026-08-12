# NextERP — Changelog

Branch: `main`

---

## 0. Công thức chế biến: sửa nguyên liệu ngay trên lưới (`ItemBomTab`) — 2026-08-13

Bỏ form chi tiết phía trên lưới. Giờ thêm/sửa **inline** trong chính lưới nguyên liệu, chế độ `mode: "Batch"` (cùng mẫu với lưới pivot của `WinPricing`).

- **Thêm**: nút `Add` nằm **trên thanh công cụ của lưới**, chèn dòng trống ở đầu. Không còn nút "Thêm" rời bên ngoài.
- **Sửa**: gõ thẳng vào ô — SL (`numericedit`), Active (`booleanedit`).
- **Lưu / Xoá**: vẫn là hai nút ngoài như cũ. `Xoá` đánh dấu dòng đang chọn, `Lưu` mới thực sự commit tất cả (thêm + sửa + xoá) trong một lượt.
- **Nguyên liệu và Đơn vị chỉ đặt được lúc thêm mới** — `cellEdit` huỷ việc sửa hai cột này trên dòng đã lưu, vì `UpdateBomLine` chỉ nhận `quantity` + `isActive`; cho gõ vào sẽ hiện một thay đổi mà lệnh lưu âm thầm bỏ qua. Muốn đổi thì xoá dòng rồi thêm lại.
- **Dropdown Đơn vị phụ thuộc Nguyên liệu**: chọn nguyên liệu xong sẽ nạp base Uom + các quy đổi đang bật của nó (cache theo `materialItemId`, nạp khi cần). Không mặc định cứng về base — hiện có **60 dòng BOM** đang dùng đơn vị khác base.
- **Thứ tự commit**: xoá → sửa → thêm. Nhờ vậy xoá một nguyên liệu rồi thêm lại chính nó trong cùng một lần Lưu vẫn chạy, không đụng unique index.
- **Chặn trùng phía FE** trước khi gọi API, tính cả các dòng vừa đánh dấu xoá. Unique là `(SellableItemId, MaterialItemId)` — **không** gồm Uom — nên một nguyên liệu chỉ được một dòng dù đơn vị khác nhau.
- `grid.endEdit()` chạy trước khi đọc `getBatchChanges()`, để giá trị vừa gõ mà chưa rời ô không bị mất khi bấm thẳng vào Lưu.

---

## 0. Lưu tài khoản làm mất một nửa quyền (`WinStaffAccount`) — 2026-08-13

**Triệu chứng**: cập nhật Quyền chức năng → mất sạch Truy cập trang; cập nhật Truy cập trang → mất sạch Quyền chức năng.

**Nguyên nhân**: hai cây tick render bằng ternary — `bottomTab === "menu" ? <TreeView ref={pageTreeRef}/> : <TreeView ref={permTreeRef}/>` — nên **mỗi lúc chỉ một cây được mount**. Cây kia unmount, React set `ref.current = null`. Mà `handleSave` **luôn gọi cả hai** API, và `collectCheckedCodes` có `?? []`:

```ts
const ids = (ref.current?.getAllCheckedNodes() ?? []) as string[]   // null → []
```

→ `setPageAccess(id, [])`. Backend làm đúng replace-semantics: thay toàn bộ bằng rỗng = thu hồi hết. Không lỗi, không cảnh báo.

**Sửa** — hai lớp:
1. Cả hai cây **luôn mount**, cái không active ẩn bằng `display: none`. Ref sống cả hai. Đồng thời sửa luôn một lỗi ngầm khác: trước đây sửa tab này rồi chuyển sang tab kia là mất luôn phần vừa sửa.
2. `collectCheckedCodes` trả `null` (không phải `[]`) khi cây chưa mount; `handleSave` **bỏ qua** PUT tương ứng. Chặn nốt trường hợp danh mục tải lỗi (`nodes.length === 0`) — lúc đó không có gì trên màn hình đại diện cho ý muốn của người dùng, nên không được gửi gì cả.

**Backend vô can** — `SetStaffPageAccess` / `SetStaffPermissions` ghi hai bảng riêng, không đụng nhau.

⚠️ **Dữ liệu đã mất không tự khôi phục.** Tài khoản nào từng được sửa qua màn này đều đã bị xoá một nửa — phải cấp lại tay.

---

## 0. Khoá ĐVT gốc khi sửa hàng hoá (`WinItem`) — 2026-08-09

- Select **ĐVT** ở tab Thông tin `disabled` khi đang **sửa** (`isEdit = editingId != null`), kèm tooltip giải thích. Lúc **tạo mới** vẫn chọn bình thường.
- Lý do: tồn kho (`ItemStock`), sổ kho append-only (`StockMovement`), quy đổi đơn vị và dòng công thức (`BomLine`) đều tính theo đơn vị này mà **không** ghi lại chúng thuộc đơn vị nào — đổi sau khi tạo là làm sai toàn bộ số cũ chứ không quy đổi. Cần đơn vị gốc khác thì tạo hàng hoá mới.
- BE mới là chỗ chặn thật (`Item.BaseUomImmutable`); select `disabled` chỉ để giải thích cho người dùng.

---

## 0a. Custom-role CRUD in `WinStaffAccount` — 2026-07-20

- Role panel (thanh trái) thêm mini-toolbar **+ Tạo / Sửa / Xoá** vai trò + dialog Mã/Tên/Mô tả.
- System role bị **khoá**: nút Sửa/Xoá `disabled` khi role đang chọn là system (`isSystemRole`). Mã (Code) chỉ nhập lúc Tạo, khoá khi Sửa.
- Xoá chặn client nếu `accountCount > 0` (nhắc chuyển tài khoản trước); BE cũng chặn (`Role.InUse`).
- API: `accessApi.createRole/updateRole/deleteRole`; `RoleRow` thêm `description`.

---

## 0. Service Charge per Area (`WinServiceCharge`) — 2026-07-19

- **File**: `components/windows/WinServiceCharge.tsx` — window RIÊNG (không nhét vào WinArea).
- Grid liệt kê mọi khu, **group theo Quầy** (counterName), cột Phí PV (%) + VAT phí (%) + Kích hoạt.
- Panel phải: chỉnh 2 số cho khu đang chọn, validate `0..100`, Lưu → `PUT /api/areas/{id}/service-charge`.
- Load: `GET /api/areas/service-charges`.
- Đăng ký: `data/subsystems.ts` (`service-charge` → `win: "WinServiceCharge"`), `DesktopShell` WIN_REGISTRY. Page code `nexterp.service_charge` (đã bật seed ở BE).

### Types & API
- **Types**: `types/api/restaurant.ts` — `AreaServiceCharge`.
- **Service**: `lib/api/restaurant.ts` — `areaServiceChargesApi.list()`, `.update()`; `ServiceChargeUpdate`, `ServiceChargeUpdateResult`.

---

## 1. Set Menu Management (`WinSetMenu`)

- **File**: `components/windows/WinSetMenu.tsx`
- Grid bên trái: toàn bộ item Hàng bán, filter theo category tree.
- Cột checkbox per-row: tick = tạo set menu (PUT empty details), uncheck = gỡ (DELETE).
- Hàng đã là set menu: **in đậm** (`fontWeight: bold`).
- Tabs: "Tất cả" | "Đã là Set Menu" | "Chưa cấu hình".
- Panel dưới: mô tả + bảng Components (tên, SL, fixed/optional, display order) + bảng Choice Categories đính kèm.
- ItemPickerDialog: chọn component từ danh sách Hàng bán (loại trừ chính nó + đã chọn).
- Dialog đính kèm Choice Category: double-click để thêm.
- Save: `PUT /api/items/{id}/set-menu` replace-all details.
- Delete: `DELETE /api/items/{id}/set-menu` → gỡ set menu, item master không bị xoá.
- Load: `GET /api/items/{id}/set-menu` khi chọn item, hiện cả components + choice categories hiện có.

### Types & API
- **Types**: `types/api/setMenu.ts` — `SetMenuConfig`, `SetMenuDetailRow`, `SetMenuDetailInput`, `SetMenuUpsert`, `SetMenuUpsertResult`
- **Service**: `lib/api/setMenu.ts` — `setMenuApi.get()`, `.upsert()`, `.remove()`
- **Types update**: `types/api/menu.ts` — `ItemListRow` thêm `isSetMenu: boolean`

---

## 2. Choice Categories Management (`WinChoice`)

- **File**: `components/windows/WinChoice.tsx`
- Grid danh sách choice categories (tên, min/max choice, active).
- Panel phải: danh sách modifiers với extra price, min/max per modifier, display order.
- CRUD: create, update, delete choice category.
- Set modifiers: PUT replace-all modifiers cho 1 choice category.
- Item picker dialog cho modifier (chọn item để làm modifier).

### Types & API
- **Types**: `types/api/choice.ts` — `ChoiceCategoryListRow`, `ChoiceCategoryDetail`, `ChoiceCategoryUpsert`, `ModifierRow`, `ChoiceCategoryModifiersReplaceRequest`
- **Service**: `lib/api/choice.ts` — `choiceCategoriesApi.list()`, `.get()`, `.create()`, `.update()`, `.remove()`, `.replaceModifiers()`

---

## 3. Discount Policy Management (`WinDiscountPolicy`)

- **File**: `components/windows/WinDiscountPolicy.tsx`
- Grid danh sách discount policies (code, name, type, auto-apply, active).
- Panel phải: detail + danh sách conditions (threshold, item, area, apply type, value).
- CRUD: create, update, delete policy + conditions.
- ApplyType: PERCENT | FIXED.
- DiscountType: TicketThreshold | QuantityItem.

### Types & API
- **Types**: `types/api/discount.ts` — `DiscountPolicyListRow`, `DiscountPolicyDetail`, `DiscountPolicyConditionRow`, `DiscountPolicyUpsert`
- **Service**: `lib/api/discount.ts` — `discountApi.list()`, `.get()`, `.create()`, `.update()`, `.remove()`

---

## 4. Area Menu Category Mapping (`WinAreaMenuCategory`)

- **File**: `components/windows/WinAreaMenuCategory.tsx`
- Chọn area → tree category Hàng bán → tick category để map vào area.
- Save: PUT replace-all categories cho area.

---

## 5. Shared Components

### ItemPickerDialog
- **File**: `components/menu/ItemPickerDialog.tsx`
- Dialog dùng chung để chọn item từ danh sách Hàng bán.
- Params: `hangBanCategoryId`, `categories`, `excludeItemIds`.
- Callback `onSelect(item: ItemListRow)`.

### Category Tree Helper
- **File**: `lib/menu/hangBan.ts`
- `buildCategoryTreeNodes`: build tree `Map<parentId, Category[]>` từ flat list.
- `findHangBanCategoryId`: tìm root category có code "HANG_BAN".
- `isDescendantCategory`: check qua `path.startsWith()`.

---

## 6. Menu Types Update

- **File**: `types/api/menu.ts`
- `ItemListRow` thêm `isSetMenu: boolean` — backend `ListItems` trả về từ `x.SetMenu != null`.

---

## 7. HTTP & Auth

- `lib/http/client.ts`: axios instance → `NEXT_PUBLIC_RPOM_API_URL` (mặc định `http://localhost:5000`).
- `lib/http/formatError.ts`: map error codes → tiếng Việt.
- `lib/http/auth-storage.ts`: JWT token trong localStorage.
- `lib/http/types.ts`: `BaseResponse<T>`, `SuccessResponse`, `ErrorResponse`.
- `lib/http/useResource.ts`: hook `useResource(fetcher)` → `{ data, loading, error, reload }`.

---

## 8. Desktop Shell

- `components/desktop/DesktopShell.tsx`: window manager (mở/đóng cửa sổ ERP, taskbar).
- `components/desktop/icons.tsx`: Chrome-style SVG icons.
- `data/subsystems.ts`: danh sách phân hệ ERP (Thu ngân, Order, Bếp, Quản lý).

---

## 9. Backend API Routes (NextERP-facing)

### Items
| Method | Path | Auth |
|---|---|---|
| GET | `/api/items?categoryId=&isActive=&search=&pageNumber=&pageSize=` | `master_data:view` |
| GET | `/api/items/{id}` | `master_data:view` |
| POST | `/api/items` | `master_data:manage` |
| PUT | `/api/items/{id}` | `master_data:manage` |
| DELETE | `/api/items/{id}` | `master_data:manage` |

### Set Menu
| Method | Path | Auth |
|---|---|---|
| GET | `/api/items/{id}/set-menu` | `master_data:view` |
| PUT | `/api/items/{id}/set-menu` | `master_data:manage` |
| DELETE | `/api/items/{id}/set-menu` | `master_data:manage` |

### Choice Categories
| Method | Path | Auth |
|---|---|---|
| GET | `/api/choice-categories?search=&isActive=` | `master_data:view` |
| GET | `/api/choice-categories/{id}` | `master_data:view` |
| POST | `/api/choice-categories` | `master_data:manage` |
| PUT | `/api/choice-categories/{id}` | `master_data:manage` |
| DELETE | `/api/choice-categories/{id}` | `master_data:manage` |
| PUT | `/api/choice-categories/{id}/modifiers` | `master_data:manage` |

### Categories
| Method | Path | Auth |
|---|---|---|
| GET | `/api/categories?isActive=` | `master_data:view` |
| POST | `/api/categories` | `master_data:manage` |
| PUT | `/api/categories/{id}` | `master_data:manage` |
| DELETE | `/api/categories/{id}` | `master_data:manage` |

### Discount Policies
| Method | Path | Auth |
|---|---|---|
| GET | `/api/discount-policies?isActive=` | `master_data:view` |
| GET | `/api/discount-policies/{id}` | `master_data:view` |
| POST | `/api/discount-policies` | `master_data:manage` |
| PUT | `/api/discount-policies/{id}` | `master_data:manage` |
| DELETE | `/api/discount-policies/{id}` | `master_data:manage` |

### Areas
| Method | Path | Auth |
|---|---|---|
| GET | `/api/areas/{id}/menu-categories` | `master_data:view` |
| PUT | `/api/areas/{id}/menu-categories` | `master_data:manage` |

---

## 10. Environment

- `.env.local`: `NEXT_PUBLIC_RPOM_API_URL=http://localhost:5080`, Syncfusion license key.
- `NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY`: EJ2 Community license.