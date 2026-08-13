# NextERP — Changelog

Branch: `main`

---

## 0. Sửa 2 lỗi của lưới công thức inline — 2026-08-13

**① `col.edit.create is not a function` khi bấm Add.**
Module `Edit` của Syncfusion trộn editor dựng sẵn (`create`/`read`/`write`) vào `column.edit` **một lần duy nhất lúc khởi tạo** (`ej2-grids.es5.js:49677`). Mọi thứ React áp lại sau đó đều ghi đè object đã trộn bằng literal `{ params }` trơ — và lần sửa ô kế tiếp ném lỗi (`create` hay `read`, tuỳ cái nào chạm trước).
Đo được: cột `materialItemId` còn `editKeys: ["params"]`, `create` = `undefined`, trong khi cột khác giữ `["parent","params"]`.
Sửa: chuyển **toàn bộ định nghĩa cột** ra cấp module và truyền vào lưới bằng một mảng `columns` ổn định thay vì `<ColumnDirective>` con. Cùng một identity qua mọi lần render ⇒ React không áp lại ⇒ bản trộn sống sót. Hệ quả: cột không thể closure vào state, nên dữ liệu chúng cần nằm ở `LOOKUPS` cấp module, cập nhật trong `useEffect` (**không** trong lúc render — chính việc chạm vào các object này khi render đã gây ra lỗi).

**② "Không thể thay đổi nguyên liệu của dòng công thức" khi chỉ sửa SL.**
`PUT /api/items/{itemId}/bom/{id}` nhận **cả dòng**, không phải patch: handler so `materialItemId` + `uomId` nhận được với giá trị đang lưu và **từ chối nếu khác** (`UpdateBomLine.cs:59-70`). FE gửi mỗi `{quantity, isActive}` → hai trường kia về 0 → luôn dính bẫy đó.
**Lỗi có sẵn từ trước**, không phải do đợt viết lại — code cũ cũng gửi thiếu y hệt, tức sửa SL của dòng công thức **chưa bao giờ chạy**.
Đo trực tiếp trên API: payload cũ → **400 `BomLine.CannotChangeMaterial`**; payload đủ 4 trường → **200**, SL 60→61 (đã khôi phục về 60).

**Kèm theo**: dòng thêm mới tự lấy đơn vị gốc của nguyên liệu nếu `uomId` còn trống lúc Lưu. Trước đó nó chỉ được điền qua sự kiện `cellSaved`, nên phụ thuộc vào việc lưới có bắn đúng sự kiện cho ô đó hay không.

**Đã kiểm end-to-end** ở 1280×648: thêm dòng → chọn nguyên liệu → SL 7.5 → Lưu → persist với `uomId` tự điền; lưới còn 2 dòng, không lỗi. Dữ liệu test đã xoá khỏi DB.

---

## 0. Quét toàn bộ 26 window ở 1280×648 — 4 lỗi thật — 2026-08-13

Dựng bộ đo tự động (headless Chrome qua CDP, viewport ghim **1280×648** = màn 1920×1080 ở scale 150%), mở lần lượt từng window, chọn một nhóm + một dòng để pane chi tiết render, rồi đếm phần tử **bị cắt ngoài khung mà không ancestor nào cuộn tới được**. Kết quả: **6 window bị cờ**, trong đó **4 lỗi thật**.

**① Cây danh mục tự cắt mất phần đuôi — nặng nhất.**
Syncfusion ship `.e-treeview` với `overflow: hidden`. Bị ép trong flex column, nó cắt phần thừa của **chính nó** và báo ra ngoài là "không có gì tràn" — nên pane bao ngoài (có `overflow: auto`) thấy `scrollHeight === clientHeight` và **không cuộn**. Mọi nhóm hàng bên dưới nếp gấp là **không cách nào tới được**.
Đo: `Công thức chế biến` treeview client **461** / scroll **780** → mất **319px**. `Bảng giá bán` mất **538px**.
Sửa: `.e-treeview { overflow: visible }` — để cây lấy đúng chiều cao tự nhiên, trả việc cuộn về cho pane. Sau sửa: `.user-tree` scroll 500 → **819**, cuộn được.
Không khoá vào `.user-tree` vì `WinPricing` / `WinStaffAccount` tự bọc div riêng — lỗi là của cây, không phải của vỏ.

**② Lưới có phân trang đẩy thanh số trang ra ngoài.**
`height="100%"` khiến Syncfusion tính vùng cuộn theo cả pane rồi **gắn thêm pager bên dưới** → số trang nằm dưới mép, bấm không được, và trên màn thấp thì mấy dòng cuối đi theo.
Đo `Tồn kho`: pager **+24px** ngoài khung → sau sửa **−28px** (nằm trong). Sửa: `.data-list > .e-grid { min-height: 0 }` — một luật cho cả **16 window** dùng `.data-list`.

**③ Root của window dùng `height: 100%` trong flex column.**
`100%` tính theo **cả** `.win` (608px) chứ không phải phần còn lại sau thanh tiêu đề (568px) → tràn 39px. `WinPricing.tsx:520` và `WinReports.tsx:115`. Sửa: `flex: 1; min-height: 0`.

**④ Hồi quy do chính đợt sửa sáng nay.**
Đổi `ItemBomTab` từ `height={260}` sang `height="100%"` làm lưới nguyên liệu co sập trong pane hẹp của `WinRecipe` — đo được `e-content` client **0** / scroll 40, tức **không còn dòng nào**. Sửa: khung lưới có sàn `minHeight: 240` (không phải 0), và pane của `WinRecipe` trả về `overflow: auto` để với tới phần vượt sàn. Sau sửa: content **72px**.

**Hai cờ là dương tính giả**, đã siết lại bộ đo: nhánh cây đang thu gọn (bị ancestor `height: 0; overflow: hidden` che) và header lưới Syncfusion (cắt có chủ đích, cuộn ngang đồng bộ với body).

**Kết quả cuối: 25/25 window mở được đều sạch** — 0 phần tử ngoài khung, 0 vùng cuộn co sập. (`Sơ đồ bàn` chưa làm, không mở được.)

Bộ đo giữ ở scratchpad (`cdp.mjs`, `scan-all.mjs`) — chạy lại được mà không cần extension trình duyệt.

---

## 0. Cửa sổ ERP luôn toàn màn hình — 2026-08-13

Bỏ hẳn chế độ cửa sổ nổi: không còn kéo thả, không còn nút Phóng to/Khôi phục, không còn kích thước riêng từng cửa sổ. Mở lên là chiếm trọn desktop. Thanh tiêu đề chỉ còn **Thu nhỏ** và **Đóng** (thu nhỏ giữ lại vì đó là cách taskbar chuyển giữa các cửa sổ đang mở).

**Lý do**: chế độ nổi buộc mọi màn phải bố cục đúng ở *kích thước bất kỳ* — mà thực tế là không. Thu đủ nhỏ là pane bị cắt, nội dung biến mất sau mép. Một kích thước duy nhất xoá sạch cả lớp vấn đề đó, và không màn ERP nào được lợi từ việc đặt cạnh màn khác.

**Lợi ích kèm theo — vá đúng lỗ hổng còn lại của bản responsive hôm nay**: `@media (max-height: 820px)` khoá theo **viewport**, không theo cửa sổ. Trước đây cửa sổ nhỏ trên màn cao thì luật không áp dụng. Giờ cửa sổ **luôn bằng** viewport (trừ 40px taskbar), nên hai thứ trùng nhau — media query bám đúng cửa sổ trong mọi trường hợp.

**Dọn theo**: `AppWindowState` bỏ `pos`, `size`, `maximized` (không nơi nào đọc nữa); bỏ effect clamp khi resize và toàn bộ tính toán kích thước lúc mở; `.win-titlebar` đổi `cursor: move` → `default`.

**Đã kiểm trên trình duyệt**: cửa sổ 1842×948 trên viewport 1842×988 (đúng 100% − 40px taskbar), `.win.maximized` bật, thanh tiêu đề còn đúng 2 nút, `cursor: default`.

---

## 0. Responsive: ERP vỡ layout trên màn hình bị phóng đại — 2026-08-13

**Triệu chứng**: cùng một bản build, máy này bình thường, máy kia "mọi trang đều to quá", component che nhau, form create tràn khỏi cửa sổ, lưới dưới cùng bị cắt mất.

**Nguyên nhân gốc — không phải độ phân giải, mà là mức phóng đại của HĐH.** Windows ở 125–150% biến màn 1920×1080 thành viewport CSS chỉ ~1280×648. Toàn bộ layout ERP được dựng với giả định còn nhiều chỗ theo chiều dọc. Cả `globals.css` 3288 dòng chỉ có **đúng một** media query (`max-width: 720px`) — không có breakpoint nào theo chiều cao.

Ba lỗi kỹ thuật cụ thể:

**1. Bẫy `min-height: auto` của flexbox.** Con của flex column mặc định "không co dưới kích thước nội dung". Vùng cuộn thiếu `min-height: 0` sẽ **đẩy phần tử kế tiếp ra khỏi khung** thay vì tự cuộn. Đã vá: `.data-list`, `.detail-panel-body`, `.sched-grid-wrap`, cùng 3 container dọc inline trong `WinConfig`, `WinAreaMenuCategory`, `WinPricing`.

**1b. `.dgrid-wrap` cần điều ngược lại — một sàn, không phải số 0.**

`.dgrid-wrap` có `overflow: auto`. Theo spec flexbox, **automatic minimum size chỉ áp dụng cho hộp `overflow: visible`**; là vùng cuộn thì minimum tự động của nó bằng **0**. Nên `min-height: auto` không bảo vệ gì cả — trong pane bị quá tải (phần cố định 241px trong khung 211px) cả hai bảng nhận 0 ngay từ CSS gốc. Đó mới là bug gốc, và `min-height: 0` mà tôi đặt lúc đầu là **vô tác dụng** chứ không phải nguyên nhân.

Đo tại viewport 1280×648 (cửa sổ 1280×608) — đúng cỡ máy báo lỗi:

| `.dgrid-wrap` | chiều cao | pane |
|---|---|---|
| CSS gốc / `min-height: 0` | **0px, 0px** | 211→241 |
| `min-height: 120px` | **120px, 120px** | 310→482, cuộn ✅ |

Nơi nào cần khác thì đã tự đặt inline (`WinChoice` = 0 để cho co, `WinDiscountPolicy` = 180).

**2. Dialog cỡ cứng, không chặn chiều cao.** 6/7 dialog mở bằng `width="760px"`/`520px`/`820px`... không cái nào có `max-height`. Thêm một luật chung cho `.e-dialog`: `max-width: calc(100vw - 24px)`, `max-height: calc(100vh - 56px)`, thân dialog thành vùng cuộn duy nhất. Chặn ở đây thay vì ở từng nơi gọi, nên dialog viết sau không tái phạm được. Bề rộng px vẫn giữ khi còn vừa — luật này chỉ bao giờ thu nhỏ.

**3. Cửa sổ chỉ đo kích thước đúng một lần.** `AppWindow` chụp `w.size` vào `useState` rồi không đọc lại prop, nên kích thước đóng băng ở lúc mở. Đổi màn hình / đổi mức phóng đại sau đó là cửa sổ to hơn desktop, mép dưới và mép phải không với tới. Đã đọc thẳng từ prop, thêm clamp khi `resize` (chỉ thu nhỏ, không phóng to lại), và chặn cascade `+24px` không đẩy cửa sổ ra ngoài màn hình.

**Khác**: `.vsplit` (chỉ `WinSetMenu` dùng) đổi từ 50/50 sang 30/70 khi `max-height: 820px`. Lần đầu viết `flex: 1 1 30%` / `flex: 1.8 1 auto` — **đo ra 244/255, gần như vẫn đều**, vì grow chỉ chia phần dư sau các basis, mà basis `auto` của pane dưới là chiều cao nội dung. Đổi sang grow trên basis 0 (`flex: 3 1 0` / `flex: 7 1 0`) mới ra đúng **150/350** — pane trên là lưới phân trang, chịu được nhỏ; pane dưới xếp một form và hai bảng. Hai lưới chiều cao cứng (`ItemBomTab` 260px, `ItemUomConversionTab` 220px) chuyển sang co theo khung.

⚠️ **Chưa sửa**: `.sched-create-modal` cố tình đặt `overflow: visible !important; max-height: none` để dropdown bên trong không bị cắt — cap lại là cắt dropdown, không cap thì tràn màn hình. Sửa đúng phải cho dropdown render qua portal.

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