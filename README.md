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

## Backend wiring (chưa làm)

Hiện tại tất cả data là mock. Khi tích hợp Rpom-backend:
- Login → `POST /api/auth/login` (BE đã có) — lưu JWT
- Wrap fetch trong client với `Authorization: Bearer <token>`
- Mỗi window tự gọi endpoint master data của mình

Spec backend đầy đủ: `../docs/RPOM_Logical_ERD.md`, `../docs/RPOM_Pricing_Spec.md`.

## Lưu ý quan trọng

- **Next.js 16** có breaking changes so với 14/15. Đọc `node_modules/next/dist/docs/` trước khi viết route handler / server action.
- **Syncfusion grid** dùng `actionBegin` / `actionComplete` cho validation. Async validation gọi BE: `args.cancel = true` rồi await fetch.
- **CSS override** Syncfusion ở `app/globals.css` cuối file (`.e-grid` selectors). Sửa theme thì sửa ở đó, đừng đụng theme bootstrap5-dark gốc.
