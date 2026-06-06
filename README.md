# RPOM NextERP — Admin Console

Web quản trị cho **RPOM (Restaurant POS & Operations Management)**. Dùng cho Owner / Manager / Admin để cấu hình master data, pricing, nhân sự, báo cáo.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS 4** — utility primitives
- **Syncfusion EJ2 React** (Community license) — Grid, Schedule, Tree, Dropdowns, Inputs, Popups
- **Lucide React** — icon set cho chrome/UI
- **Linear-mono dark aesthetic** — palette zinc, Helvetica Neue, dense rows 36px

## Kiến trúc UI

**Window-desktop metaphor** — mỗi module mở 1 cửa sổ riêng có thể drag, min/max/close. Có taskbar + start menu + desktop icons như Windows.

```
app/
  layout.tsx        — root layout
  page.tsx          — login → desktop shell switch
  globals.css       — Linear-mono palette + Syncfusion theme override

components/
  auth/LoginScreen        — 2-step: username/password → counter picker
  desktop/
    DesktopShell          — shell + window state + desktop icons
    AppWindow             — draggable titlebar + window controls
    StartMenu             — module launcher
    Taskbar               — taskbar + clock + user chip
    icons.tsx             — Lucide icon registry
  ui/
    WinToolbar            — top toolbar with TB buttons
    DetailPanel + Field   — left detail panel + form field primitives
  windows/
    WinKhu                — sample: Area master data with Syncfusion Grid

data/
  mock.ts                 — mock Counter + Area cho dev
  subsystems.ts           — danh sách module + group

types/
  domain.ts               — Counter, Area, Subsystem, AppWindowState, SessionUser

lib/
  syncfusion-license.ts   — license register (env: NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY)
```

## Chạy

```bash
npm install
npm run dev          # http://localhost:3000
```

Build:
```bash
npm run build
npm run start
```

## Syncfusion license

Đây là **Community license** (free, revenue < $1M, ≤ 5 dev).

1. Đăng ký tại https://syncfusion.com/account và lấy license key
2. Tạo `.env.local`:
   ```
   NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY=<key của bạn>
   ```
3. License auto-register khi load module có Syncfusion component (xem `lib/syncfusion-license.ts`)

Nếu chưa có key, dev vẫn chạy được nhưng có banner "Trial" trên Syncfusion components.

## Patterns UI lõi (cho devs khác làm theo)

| Pattern | File mẫu | Khi nào dùng |
|---|---|---|
| List + Detail + Audit Log | `components/windows/WinKhu.tsx` | ~70% master data screens |
| Tree + List + Detail | (sẽ build cho Items, Set Menu) | Item catalog, Pricing |
| Inline editable rows | (sẽ build cho Modifier) | Choice Categories, Discount conditions |
| Window-desktop metaphor | `components/desktop/*` | Mọi module |

## Thêm 1 module mới

1. Tạo file `components/windows/Win<Name>.tsx` theo pattern `WinKhu`
2. Register vào `components/desktop/DesktopShell.tsx` → `WIN_REGISTRY`
3. Update `data/subsystems.ts` — set `win: "Win<Name>"` cho row tương ứng (đổi từ `null`)
4. Thêm icon mapping ở `components/desktop/icons.tsx` nếu cần

## Backend wiring

Tất cả master-data window đã kết nối Rpom-backend qua `lib/http/client.ts` (axios + `BaseResponse<T>` envelope + JWT). Spec backend đầy đủ ở `../docs/RPOM_Logical_ERD.md`, `../docs/RPOM_Pricing_Spec.md`, `../docs/RPOM_Versioning_Strategy.md`.

## Lưu ý quan trọng

- **Next.js 16** có breaking changes so với 14/15. Đọc `node_modules/next/dist/docs/` trước khi viết route handler / server action.
- **CSS override** Syncfusion ở `app/globals.css` cuối file (`.e-grid`, `.e-treeview` selectors). Sửa theme thì sửa ở đó, đừng đụng theme bootstrap5 gốc.

### Syncfusion Grid — 2 patterns đang dùng

1. **DataManager + CustomDataAdaptor** *(canonical, dùng cho master-data CRUD chuẩn)*
   - Helper: `lib/syncfusion/dataManager.ts` → `buildDataManager({ list, create, update, remove, toUpsert })`.
   - Grid là source of truth. Add/Edit/Delete trên toolbar tự gọi BE qua adaptor; Grid tự refresh.
   - Đang dùng: `WinPricing` PriceTable Grid.
   - 3 lesson đào từ source `node_modules/@syncfusion/ej2-data/src/`:
     * Callbacks trong `CustomDataAdaptor` là **`option.onSuccess` / `option.onFailure`** (không phải `success`/`fail`).
     * `option.data` là **JSON string** wrap envelope `{ value: row, action, key, keyColumn }` — phải parse + extract `.value` cho create/update, `.key` cho delete.
     * Không bao giờ truyền `null` vào `onSuccess` — Syncfusion `processResponse` deref `data.result` không guard sẽ crash âm thầm; truyền `{}` cho delete.

2. **Hybrid `actionBegin` intercept + `useResource`** *(khi flow phức tạp, vd cần dialog cho field cấu trúc)*
   - Đang dùng: PriceVariant Grid (Time/Day/Area scope phải mở dialog), pivot Item × Variant (Batch mode + bulk upsert).
   - Pattern: `args.cancel = true` → gọi `priceXxxApi.create/update/delete` thủ công → `await tablesRes.reload()` → bump `key` Grid để remount.

### TreeView

- Dùng `nodeTemplate` (function trả JSX) để render custom icon — không xài `iconCss`. Pass thêm field như `count` vào data node nếu cần badge.
- Stable `useCallback(nodeTemplate, [])` + stable `useMemo(treeFields, [data])` — pass fresh prop mỗi render sẽ làm tree re-mount → flicker.
- CSS đã override `.e-fullrow { display: none }` để highlight không tràn pane (xem `globals.css`).

### Error display

- `lib/http/formatError.ts` → `formatApiError(res)` extract `extensions.errors[].description` cho validation, fallback `detail/title` cho conflict / business rule.
- Mọi `setErrorMsg(...)` trong Win* nên gọi `formatApiError(res)` thay vì `res.detail || res.title`.
