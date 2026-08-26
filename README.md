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

## Báo cáo top nhân viên theo món

`WinReports` có tab **Top nhân viên theo món**, nằm sau **Món hàng**. Tab gọi
`reportsApi.topOrderStaffByItem()` với ngày/quầy/khu và nhận response nested theo snapshot món.
UI giữ response nested và dựng master-detail theo món. Danh sách bên trái hỗ trợ search/sort/filter;
panel bên phải hiển thị tối đa ba nhân viên sản lượng dương bằng thanh ngang. Dòng 0 bị bỏ khỏi
leaderboard, dòng âm nằm trong cảnh báo hoàn món. Ngưỡng gợi ý đào tạo chéo là tổng từ 5 và top 1 từ
80%; dữ liệu dưới 5 chỉ gắn “Ít dữ liệu”.

Sản lượng là net signed từ order item không huỷ của ticket đã đóng; refund âm vẫn được tính. Phần trăm
API có hai chữ số thập phân, UI dùng một chữ số thập phân; top ba phần trăm có thể không bằng 100%. Tab không hỗ trợ
PDF/Excel export. Kiểm helper bằng:

```bash
npm run test:top-order-staff
```

Các contract AI/reporting backend có giới hạn detail rows và permission riêng theo tool; UI không được
tự tổng hợp detail đã truncate để suy ra KPI. Xem `RPOM_REPORTING_MODULE_GUIDE.md` ở repository gốc
để biết ma trận quyền, nguồn invoice so với operational và giới hạn payload.

## Quản lý prompt phân tích AI

Window **Bối cảnh phân tích AI** chỉ hiện và cho mở với vai trò `OWNER` hoặc `ADMIN_VENDOR`. Màn hình
giữ giao diện đơn giản gồm đúng hai tab:

- **Prompt chung** sửa phần bổ sung `GLOBAL` dùng cho mọi báo cáo.
- **Theo báo cáo** chọn một trong 11 mã `REVENUE_SUMMARY`, `REVENUE`, `TICKET_LIST`, `ITEM_SALES`,
  `CATEGORY`, `ITEM`, `TOP_ORDER_STAFF_BY_ITEM`, `TOP_SELLERS`, `SHIFT`, `INGREDIENT`, `STOCK_ALERT`
  rồi sửa phần bổ sung riêng của báo cáo đó.

Mỗi ô tối đa 4.000 ký tự. Lưu nội dung rỗng là xoá phần bổ sung bằng một phiên bản rỗng mới; dữ liệu
luôn append-only. Nút **Xem lịch sử** tải đúng scope đang chọn theo từng trang 20 phiên bản; nút
**Tải thêm** dùng cursor của server để nối các phiên bản cũ hơn mà không làm mất khả năng khôi phục.
Mỗi mục hiển thị số phiên bản/người tạo/thời điểm/nội dung; **Khôi phục** yêu cầu xác nhận rồi tạo
phiên bản active mới, không sửa bản cũ. Prompt
hệ thống cốt lõi và profile báo cáo cố định vẫn thuộc source backend, không hiển thị, không sao chép và
không seed vào trường editable.

Frontend gọi đúng các route:

| Thao tác | Route |
|---|---|
| Tải cấu hình | `GET /api/erp/ai-analysis-prompts` |
| Lưu phiên bản | `PUT /api/erp/ai-analysis-prompts` |
| Xem lịch sử | `GET /api/erp/ai-analysis-prompts/history?scope=...&reportType=...&pageSize=20&beforeVersionNumber=...` trả `{ items, nextBeforeVersionNumber }` |
| Khôi phục | `POST /api/erp/ai-analysis-prompts/{id}/restore` |

Khi bấm **Phân tích bằng AI**, frontend gửi `reportContext` có `reportType`, `filters`,
`selectedItemId` (nếu có) và toàn bộ `data` đang tải tới `POST /api/ai/chat` trong một cuộc trò chuyện
mới. Bubble và lịch sử người dùng chỉ hiện nhãn `Phân tích báo cáo ...`; JSON thô không được đưa vào
text hiển thị. Backend giới hạn toàn bộ raw HTTP body ở 256 KiB trước khi bind JSON, rồi giới hạn
`reportContext` canonical ở 128.000 ký tự; context cho model là 24.000 ký tự, depth 12 và chỉ cắt theo
whole record hợp lệ. Metadata included/total cho biết phạm vi thực tế. Cuộc trò chuyện báo cáo
cũ giữ snapshot dữ liệu/prompt cũ khi hỏi tiếp, còn cuộc trò chuyện mới lấy phiên bản prompt mới.
Report analysis không có tool; chat thủ công như `Doanh thu hôm nay` vẫn dùng các data tool được cấp
quyền.

Tab **Top nhân viên theo món** dùng bố cục master-detail: danh sách món bên trái hỗ trợ tìm, sắp xếp,
lọc và bàn phím; chi tiết bên phải hiển thị tổng sản lượng thuần, tối đa ba nhân viên có sản lượng
dương, tỷ lệ, cảnh báo hoàn món và nhận định phân bố dữ liệu. Sản lượng chưa chuẩn hoá theo ca, giờ hay
cơ hội bán, vì vậy UI và AI không được gọi đây là đánh giá hiệu suất/kỹ năng hoặc gắn nhãn nhân viên
tốt/xấu, mạnh/yếu.

Kiểm các contract liên quan bằng:

```bash
npm run test:page-access
npm run test:ai-analysis-prompts
npm run test:ai-report-context
npm run test:top-order-staff
```

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
