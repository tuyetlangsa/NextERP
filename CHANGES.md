# NextERP — Changelog

Branch: `main`

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
