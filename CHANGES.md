# Rpom Backend — Changelog

Branch: `feature/cashier-pricing`

---

## 1. Print Backend (2026-07-01)

### 1.1 New Tables
- `print_jobs` — job queue consumed by the Print Service (polling + status update).
- `print_configs` — printer/auto-print configuration per counter/station.
- `print_templates` — .repx template catalog managed via ERP.

### 1.2 New Endpoints
| Area | Route | Permission |
|---|---|---|
| Print Service (internal) | `POST /api/print/jobs/poll` | `print:service_access` |
| Print Service (internal) | `POST /api/print/job| `print:service_access` |
| Print Service (internal) | `POST /api/print/printers/sync` | `print:service_access` |
| Print Service (internal) | `POST /api/print/printers/register` | `print:service_access` |
| Cashier | `GET/PUT /api/cashier/printers` | `print:config_manage` |
| Cashier | `GET/PUT /api/cashier/print-config` | `print:config_manage` |
| ERP | `GET/POST/PUT/DELETE /api/erp/print-templates` | `print:template_manage` |

### 1.3 Triggers
- **SendOrder** → enqueue BEP (kitchen) print job for each kitchen station that has items in the order.
- **CloseTicket** (`POST /api/cashier/tickets/{id}/payment`) → enqueue KET_THUC (bill) print job. Auto-print configurable via `print.auto_close_after_payment` system config (default `true`).

### 1.4 New Permissions
| Code | Group | Assigned To |
|---|---|---|
| `print:trigger` | Cashier | Cashier role |
| `print:config_manage` | Cashier | Cashier role |
| `print:template_manage` | MasterData | Owner role (via `allPermissions`) |
| `print:service_access` | Access | Owner role (internal service account only) |

Seeded in `AccessSeeder` + granted to demo Cashier accounts in `CashierDemoSeeder`.

---

## 2. Infrastructure

### 2.1 Transaction Pipeline (ACID)
- **File**: `src/Rpom.Application/Abstraction/Behaviors/TransactionPipelineBehavior.cs`
- Mọi `IBaseCommand` handler được auto-wrap trong DB transaction qua `CreateExecutionStrategy` (tương thích Npgsql EnableRetryOnFailure).
- Handler gọi `SaveChangesAsync` nhiều lần → tất cả atomic (all-or-nothing).

### 2.2 ConcurrencyVersionInterceptor
- **File**: `src/Rpom.Infrastructure/Database/ConcurrencyVersionInterceptor.cs`
- `SaveChangesInterceptor`: auto-increment `Version` trên mọi Modified entity.
- `ExceptionHandlingPipelineBehavior` catch `DbUpdateConcurrencyException` → 409.

### 2.3 GetMenu — Ancestor Categories
- **File**: `src/Rpom.Application/Cashier/GetMenu/GetMenu.cs:137-147`
- Sau khi filter visible categories, extract ancestor IDs từ `Path` của mỗi category.
- Include các ancestor còn thiếu vào response để FE build được drill-down tree.
- VD: "Bia" (DOUONG_BIA) path="1;3;4;" → ancestors [1,3] → thêm "Hàng bán" + "Đồ uống".

---

## 2. Cash Drawer

### 2.1 ShiftId trên CashDrawerSession
- **Entity**: `src/Rpom.Domain/Sales/CashDrawer/CashDrawerSession.cs`
- **FK**: `ShiftId → Shifts.Id` (Restrict)
- **Migration**: `20260607232923_AddShiftIdToCashDrawerSession`
- Mở ca (`OpenCashDrawer`) yêu cầu `ShiftId`, validate shift tồn tại + active.
- `GetCurrentCashDrawer` response trả `shiftId` + `shiftName`.

### 2.2 OpenTicket — ShiftId từ Drawer
- **File**: `src/Rpom.Application/Cashier/OpenTicket/OpenTicket.cs`
- Bỏ `ShiftId` khỏi request. Server tự suy từ OPEN cash drawer.
- `CashDrawerSessionId` và `ShiftId` được set từ drawer đang mở.

---

## 3. Order Item Lifecycle (4 APIs mới)

Tất cả handler trong `src/Rpom.Application/Cashier/{Action}OrderItem/`, endpoint trong `src/Rpom.Api/Endpoints/Cashier/Tickets/`.

| API | Route | Transition | Permission |
|---|---|---|---|
| **StartCook** | `POST .../order-items/start-cook` | PENDING → PROCESSING | `order_item:start_cooking` |
| **MarkReady** | `POST .../order-items/mark-ready` | PROCESSING → READY | `order_item:mark_ready` |
| **MarkDone** | `POST .../order-items/mark-done` | READY → DONE | `order_item:mark_done` |
| **Cancel** | `POST .../order-items/cancel` | PENDING → CANCELLED | `order_item:cancel_pending` |

### Business rules:
- **StartCook**: chỉ từ PENDING. Nếu Order đang SENT → bump lên PROCESSING.
- **MarkReady**: chỉ từ PROCESSING. No side effects.
- **MarkDone**: chỉ từ READY. Nếu TẤT CẢ OrderItem trên ticket đã terminal (DONE/CANCELLED) → đóng Order → DONE.
- **Cancel**: chỉ từ PENDING (đã nấu → refund, không cancel). Nếu tất cả terminal → đóng Order → DONE. Gọi `TicketRecomputeService` để cập nhật totals.
- Tất cả request body: `{ orderItemIds: number[] }` — batch support.
- Tất cả require table lock + ticket OPEN.

---

## 4. Set Menu Validator

### 4.1 SetMenuValidator — fixed duplicate qty bypass
- **File**: `src/Rpom.Application/Cashier/AddCartItem/SetMenuValidator.cs:69-82`
- Aggregate qty by modifier trước khi check `MinPerModifier ≤ qty ≤ MaxPerModifier`.
- Trước đây: gửi 2 dòng cùng modifier (mỗi dòng qty=1) → từng dòng pass, tổng qty=2 > MaxPerModifier=1 → bypass.
- Nay: `qtyByMod[itemId]` aggregate → check tổng.

### 4.2 SetModifiers — cross-validation
- **File**: `src/Rpom.Application/ChoiceCategories/SetModifiers/SetModifiers.cs:78-100`
- `MinPerModifier ≤ MaxPerModifier` (mỗi modifier)
- `MaxPerModifier ≤ MaxChoice` (của ChoiceCategory)
- `Σ MinPerModifier ≤ MaxChoice` (tổng min không vượt max của CC)
- Lỗi trong `ChoiceCategoryErrors.cs`.

---

## 5. GetTicketDetails — OrderingItem.vatPercent
- **File**: `src/Rpom.Application/Cashier/GetTicketDetails/GetTicketDetails.cs`
- `OrderingItem` record: thêm `VatPercent`.
- Cart item projection: thêm `c.VatPercent`.
- FE hiển thị % VAT trên mỗi dòng cart.

---

## 6. ListItems — isSetMenu flag
- **File**: `src/Rpom.Application/Items/ListItems/ListItems.cs`
- `Item` record thêm `bool IsSetMenu`.
- Projection: `IsSetMenu = x.SetMenu != null`.
- ERP filter "Đã là Set Menu" dùng flag này.

---

## 7. Permissions
- **File**: `src/Rpom.Application/Access/Permissions.cs`
- Thêm: `OrderItemMarkDone = "order_item:mark_done"` (POS group)
- Seed trong `AccessSeeder` + grant cho Cashier role trong `CashierDemoSeeder`.

---

## 8. Seed Data (CashierDemoSeeder + LookupSeeder)

### 8.1 Discount Policies (5 policies)
| Code | Type | Auto? | Condition | Apply |
|---|---|---|---|---|
| GIAM10 | TicketThreshold | Yes | Bill ≥200k/500k | 10%/15% PERCENT |
| GIAM100 | TicketThreshold | Yes | Bill ≥1M | 100k FIXED |
| GIAM_BIA | QuantityItem | No | 5 Heineken | 20% PERCENT |
| GIAM_PHO | QuantityItem | No | 3 Phở | 30k FIXED |
| GIAM_TUAN | TicketThreshold | No | Bill ≥500k Mon-Fri | 5% PERCENT |

### 8.2 VAT-included Items
- **Trà đá**: 5,000đ, VAT 10% included → basePrice ≈ 4,545đ
- **Cà phê đen**: 20,000đ, VAT 8% included → basePrice ≈ 18,519đ

### 8.3 Service Charge
- **Khu VIP**: `ServiceChargePercent = 5%`, `ServiceChargeVatPercent = 8%`

### 8.4 Set Menu
- **Combo Gà xối mỡ** (Cơm + Coca-Cola + Choice "Đổi nước")
- **Combo Phở bò tái** (Phở + Choice "Thêm món")

---

## 9. Tests

### 9.1 PricingIntegrationTests (7 tests)
- **File**: `tests/Rpom.Application.Tests/Cashier/PricingIntegrationTests.cs`
- `VatExcludedItem_HasCorrectPricing` — Phở 50k + 8% VAT = 108k
- `VatIncludedItem_HasCorrectPricing` — Trà đá 5k incl 10% = 5k
- `VatIncludedItem_MixedWithExcluded_SendOrder_TotalsMatch` — Phở + Trà đá = 113k
- `DiscountPercent_AutoApply_BillAboveThreshold` — 6 Phở ≥200k → 10% → 291.6k
- `DiscountFixed_AutoApply_BillAboveThreshold` — 20 Phở ≥1M → -100k → 972k
- `CancelOrderItem_RecomputesTicket` — Cancel 1/3 → 108k
- `PartialSend_KeptItemsInNewDraft` — Gửi partial → món còn lại ở draft mới

### 9.2 OrderingLoopTests (existing, updated)
- Cập nhật `OpenTicket.Command` bỏ ShiftId, drawer set `ShiftId`.

---

## 10. API Routes Summary

### Auth
| Method | Path | Auth |
|---|---|---|
| POST | `/api/auth/login` | AllowAnonymous |
| GET | `/api/auth/me` | Any authed |

### Lookups (pre-login)
| Method | Path | Auth |
|---|---|---|
| GET | `/api/lookups/counters` | AllowAnonymous |
| GET | `/api/lookups/kitchen-stations` | AllowAnonymous |
| GET | `/api/lookups/denominations` | Any authed |
| GET | `/api/lookups/shifts` | Any authed |

### Cash Drawer
| Method | Path | Auth |
|---|---|---|
| POST | `/api/cash-drawers` | `cash_drawer:open` |
| GET | `/api/cash-drawers/current?counterId=` | Any authed |

### Floor Plan & Tables
| Method | Path | Auth |
|---|---|---|
| GET | `/api/cashier/floor-plan?counterId=` | `cashier:floor_plan` |
| POST | `/api/cashier/tables/{id}/lock` | `ticket:open` |
| DELETE | `/api/cashier/tables/{id}/lock` | `ticket:open` |

### Tickets — CRUD
| Method | Path | Auth |
|---|---|---|
| POST | `/api/cashier/tickets` | `ticket:open` |
| GET | `/api/cashier/tickets/{id}` | `ticket:view_detail` |
| GET | `/api/cashier/tables/{id}/tickets` | `ticket:view_detail` |

### Cart — Order
| Method | Path | Auth |
|---|---|---|
| POST | `/api/cashier/tickets/{id}/cart-items` | `order:add_items` |
| PUT | `/api/cashier/tickets/{id}/cart-items/{cid}` | `order:add_items` |
| DELETE | `/api/cashier/tickets/{id}/cart-items/{cid}` | `order:add_items` |
| POST | `/api/cashier/tickets/{id}/send-order` | `order:send_kitchen` |

### Order Item Lifecycle
| Method | Path | Auth |
|---|---|---|
| POST | `/api/cashier/tickets/{id}/order-items/start-cook` | `order_item:start_cooking` |
| POST | `/api/cashier/tickets/{id}/order-items/mark-ready` | `order_item:mark_ready` |
| POST | `/api/cashier/tickets/{id}/order-items/mark-done` | `order_item:mark_done` |
| POST | `/api/cashier/tickets/{id}/order-items/cancel` | `order_item:cancel_pending` |

### Discount
| Method | Path | Auth |
|---|---|---|
| POST | `/api/cashier/tickets/{id}/apply-discount` | `ticket:apply_discount` |
| DELETE | `/api/cashier/tickets/{id}/discount` | `ticket:apply_discount` |

### Menu
| Method | Path | Auth |
|---|---|---|
| GET | `/api/cashier/menu?tableId=` | `cashier:view_menu` |

### Sync
| Method | Path | Auth |
|---|---|---|
| GET | `/api/sync/versions?scopes=` | Any authed |

---

## 11. Version Scopes

| Scope | Bumped by |
|---|---|
| `MENU` | Item, Category, Price thay đổi |
| `PRICING` | Discount apply/remove |
| `FLOOR_PLAN` | Ticket open/send/cancel/transfer/merge/split, Table lock/unlock, OrderItem lifecycle |
| `KITCHEN` | StartCook, MarkReady, MarkDone, CancelOrderItem |
| `ACCESS` | Staff/Permission changes |
| `CONFIG` | System config changes |

---

## 12. Transfer Table (E2)

- **Spec**: `~/CapstoneProject/docs/superpowers/specs/2026-06-13-transfer-table-design.md`
- **Use case**: `src/Rpom.Application/Cashier/TransferTable/TransferTable.cs`
- **Endpoint**: `POST /api/cashier/tickets/{ticketId:long}/transfer-table` body `{ targetTableId }`, perm `ticket:transfer`.
- Chuyển ticket OPEN sang bàn khác **cùng counter**; lock bàn nguồn; bàn đích → OCCUPIED, bàn nguồn giữ nguyên (defer free-bàn).
- **SENT OrderItem giữ nguyên giá** (snapshot, giống F2). Đổi Area → **clear sạch DRAFT cart** + service charge theo config.
- **Config mới** `transfer.use_target_area_service_charge` (BOOL, default `true`): true = re-snapshot SC từ Area đích + `TicketRecompute`; false = giữ SC của phiếu.
- **Errors mới**: `Ticket.TransferSameTable`, `Ticket.TransferCrossCounter`.
- **Tests**: `tests/Rpom.Application.Tests/Cashier/TransferTableTests.cs` (8 cases: same-area, cross-area SC true/false, not-open, same-table, cross-counter, no-lock, target-not-found).

---

## 13. Order rollup fix (Cancel/MarkDone)

- **Bug**: roll-up Order→DONE query item-status bằng projection **trước** `SaveChangesAsync` → item vừa đổi đọc ra state cũ → order kẹt SENT/PROCESSING. Thêm: check phạm vi cả ticket thay vì per-order.
- **Fix**: `src/Rpom.Application/Cashier/OrderRollup.cs` (helper per-order). `CancelOrderItem` + `MarkDoneOrderItem` SaveChanges trước rồi mới roll-up.
- **Tests**: +3 trong `PricingIntegrationTests.cs` (one-by-one cancel/markdone, multi-order batch).

---

## 14. Cancel Ticket (OPEN → CANCELLED)

- **Use case**: `src/Rpom.Application/Cashier/CancelTicket/CancelTicket.cs`
- **Endpoint**: `POST /api/cashier/tickets/{ticketId:long}/cancel` body `{ managerStaffId, cancellationReasonId, cancellationNote? }`, perm `ticket:cancel`.
- Huỷ nguyên phiếu OPEN khi **bill rỗng** (mọi OrderItem đã CANCELLED) và **không có payment** PENDING/SUCCESS. Manager (Owner/Manager, active) bắt buộc duyệt qua `managerStaffId`.
- Side effects: auto-drop DRAFT cart (order DRAFT → DELETED), set `CancelledAt`/`CancellationReasonId`/`CancellationNote`/`ManagerStaffId`, ghi AuditLog `CANCEL`, release table lock, bump `FLOOR_PLAN`. **Không** refund (đã chặn payment SUCCESS).
- **Errors mới**: `Ticket.HasActiveItems`, `Ticket.HasPendingPayment`, `Ticket.HasSuccessfulPayment`, `Ticket.InvalidCancellationReason`, `Ticket.InvalidManager`.
- **Permission**: grant `ticket:cancel` cho role **Cashier** (người giữ table lock gọi endpoint; manager duyệt trong body).
- **Tests**: +8 trong `PricingIntegrationTests.cs` (empty cancel + lock release + audit, active item blocked, after-all-cancelled OK, pending/success payment blocked, draft cart dropped, non-manager blocked, inactive reason blocked).

---

## 15. Discount Engine → Percent-Based (F2-style)

- **Spec**: `~/CapstoneProject/docs/superpowers/specs/2026-06-14-discount-percent-engine-design.md`
- Chuyển discount engine từ **frozen per-line amount** sang **percent-based**, re-derive mỗi recompute. Nguồn sự thật = `Ticket.DiscountPolicyId`.
- **`DiscountResolver`** (`src/Rpom.Application/Cashier/Pricing/DiscountResolver.cs`): pure, fixed→% (`fixedValue/currentSubtotal`), re-check điều kiện, cap ≤100.
- **`TicketRecomputeService`**: mỗi recompute re-derive % của policy đang gắn (attached-policy only, **không** re-select); tụt dưới ngưỡng → gỡ `DiscountPolicyId`; dòng net-âm → discount 0. **`PricingCalculator`** percent-only (bỏ `ForcedLineDiscountAmount`/`ForcedTicketDiscountAmount`).
- **`ApplyDiscountPolicy`** + **`SendOrder` auto-apply**: chỉ **chọn + gắn** policy; recompute lo toàn bộ math. Auto-apply vẫn ghi AuditLog `APPLY_DISCOUNT`.
- **Schema**: discount-percent cột nới `decimal(5,2)` → `decimal(9,6)` (migration `WidenDiscountPercentPrecision`). VAT%/SC% giữ `(5,2)`.
- **Behavior change**: refund/cancel làm subtotal tụt dưới ngưỡng → discount **tự gỡ** (trước đây giữ nguyên). FIXED discount giữ đúng số tiền khi bill đổi (vd order thêm → % co lại, tiền giảm vẫn ~100k).
- **Docs**: CLAUDE.md §12 (bỏ exact-amount guarantee) + §5 (precision discount %).
- **Tests**: +5 unit `DiscountResolverTests.cs`, +2 integration (re-derive giữ amount, gỡ khi dưới ngưỡng). Full suite 169 pass; assertion exact cũ (291,600 / 972,000) không đổi.

---

## 16. Refund Line (trả hàng)

- **Spec**: `~/CapstoneProject/docs/superpowers/specs/2026-06-14-discount-percent-engine-design.md` §10.
- Trả món đã/đang nấu = **dòng OrderItem qty ÂM** trỏ về dòng gốc qua `OriginalOrderItemId`. Cơ chế: `AddRefundLine` tạo CartItem DRAFT âm → **SendOrder** (sẵn có) materialize thành OrderItem âm. KHÔNG có endpoint `/refund` gửi riêng.
- **Use case**: `src/Rpom.Application/Cashier/AddRefundLine/AddRefundLine.cs`.
- **Endpoint**: `POST /api/cashier/tickets/{ticketId:long}/order-items/{orderItemId:long}/refund-line` body `{ quantity, cancellationReasonId, cancellationNote? }` (`quantity` dương, server lưu âm), perm `order_item:refund_line`.
- **Guards**: ticket OPEN + giữ lock; gốc thuộc ticket; gốc PROCESSING/READY/DONE (PENDING dùng Cancel) → `OrderItem.NotRefundable`; gốc là dòng dương non-refund → `OrderItem.CannotRefundRefund`; reason active → `Ticket.InvalidCancellationReason`; `quantity ≤ gốc − (đã refund committed + draft)` → `OrderItem.RefundQuantityExceeded`.
- **Snapshot** từ OrderItem gốc (ItemCode/Name, Uom*, UnitPrice, ChoicePrice, VAT%, SC%). Dòng refund qua SendOrder → status **PENDING** (chạy lifecycle bếp), ghi AuditLog `REFUND` (EntityId = OrderItem gốc) lúc gửi.
- **Schema**: thêm `OriginalOrderItemId`, `CancellationReasonId`, `CancellationNote` vào `CartItem` (migration `AddRefundFieldsToCartItem`).
- **AddCartItem**: note-free merge loại dòng refund (`OriginalOrderItemId == null`) để add món thường không gộp nhầm vào dòng âm.
- **Tiền/discount**: do percent-engine lo (dòng âm → tiền âm, net-negative cleanup). VD trả 1/3 phở → bill còn net 2 = 108,000.
- **Permission**: grant `order_item:refund_line` cho role **Cashier**.
- **Tests**: +6 integration (tạo dòng âm linked, PENDING-original/exceed/inactive-reason blocked, SendOrder materialize+audit+credit, không merge nhầm). Full suite 175 pass.

---

## 17. Merge Ticket (E3 — Gộp hoá đơn)

- **Use case**: `src/Rpom.Application/Cashier/MergeTicket/MergeTicket.cs`
- **Endpoint**: `POST /api/cashier/tickets/merge` body `{ sourceTicketId, destinationTicketId }`, perm `ticket:merge`.
- Chuyển toàn bộ Orders (SENT/PROCESSING/DONE) + Payments (non-Deleted) từ source → dest. Cả 2 OPEN, cùng Area, CashDrawer OPEN, không PENDING payment.
- Sau khi move: tạo bản copy CANCELLED của mọi Orders/Items/Payments trên source (audit trail). Source → CANCELLED với reason `MERGE`. Guest count source cộng vào dest. Nếu source table không còn OPEN ticket nào → table → Available. Giải phóng table lock source.
- Audit: `MERGE` trên source + `MERGE_RECEIVE` trên dest. Bump `FLOOR_PLAN`, `KITCHEN`, `PRICING`.
- **Errors**: `MergeSameTicket`, `MergeDifferentArea`.
- **Permission**: grant `ticket:merge` cho role **Cashier**, **Order Staff**.

---

## 18. Split Ticket (E4 — Tách hoá đơn)

- **Use case**: `src/Rpom.Application/Cashier/SplitTicket/SplitTicket.cs`
- **Endpoint**: `POST /api/cashier/tickets/split` body `{ sourceTicketId, destinationTicketId?, destinationTableId?, guestCount?, items: [{ orderItemId, quantity }] }`, perm `ticket:split`.
- Chuyển selected OrderItems từ source → dest. 2 mode dest: ticket có sẵn (OPEN, cùng Area, không PENDING payment, không bị staff khác giữ) hoặc mở ticket mới trên bàn (cùng Area, snapshot SC% từ Area).
- Full qty → re-parent dòng; partial → giảm source, tạo dòng copy ở dest (copy toàn bộ snapshot: giá, bếp status, modifier details). Món giữ nguyên trạng thái bếp.
- Tạo Order mới trên dest với notes `"Tách từ hoá đơn {code}"`. Source Orders: hết active item → DELETED; còn item → roll up.
- **Payment không di chuyển** — chỉ chuyển món. Source phải `PaidAmount = 0` và không PENDING payment.
- Recomputed cả 2 ticket. Audit `SPLIT` trên source. Bump `FLOOR_PLAN`, `KITCHEN`, `PRICING`.
- **Errors**: `SplitDestinationInvalid` (cần đúng 1 trong 2 mode), `SplitSameTicket`, `SplitDifferentArea`, `SplitItemInvalid` (món không thuộc ticket/đã huỷ/trùng id), `SplitQuantityExceeds`, `SplitNoItems`, `SplitSourcePaid`.
- **Permission**: grant `ticket:split` cho role **Cashier** (seed: `AccessSeeder`).

---

## 19. Split Ticket Preview (dry-run, không ghi DB)

- **Spec**: `~/CapstoneProject/docs/superpowers/specs/2026-06-20-split-ticket-cashier-spec.md`.
- **Mục đích**: FE màn tách (2-pane) chỉ quản số lượng, **không tính tiền ở client** (CLAUDE.md §12). Tổng tiền 2 phiếu "sau khi tách" lấy từ endpoint preview real-time khi cashier chỉnh số lượng.
- **Use case**: `src/Rpom.Application/Cashier/SplitTicketPreview/SplitTicketPreview.cs` (**Query**, không qua TransactionPipeline auto-commit).
- **Endpoint**: `POST /api/cashier/tickets/split/preview` body y hệt `/split`, trả `{ sourceTotalAmount, destinationTotalAmount, movedItemCount }`, perm `ticket:split`.
- **Cơ chế dry-run**: tái dùng **handler `SplitTicket` thật** (gọi trực tiếp qua `IRequestHandler<...>`, không qua MediatR pipeline) trong 1 transaction rồi **ROLLBACK** → số preview == số commit tuyệt đối, không công thức song song, không temp table.
  - Bọc trong `IExecutionStrategy.ExecuteAsync` (Npgsql retry yêu cầu); `ChangeTracker.Clear()` đầu mỗi lần retry (rollback không revert change tracker).
  - **Không** side-effect: AuditLog / version bump / outbox đều nằm trong transaction → rollback xoá sạch.
  - Lưu ý: mode "mở phiếu mới" tiêu hao sequence `Ticket.Id` (Postgres sequence không rollback) — chỉ tạo lỗ hổng id.
- **IDbContext**: thêm `ChangeTracker` vào abstraction (phục vụ retry-safety của dry-run).
- **GetTicketDetails**: thêm `TotalDiscountAmount` vào `OrderedItem` (cột "Giảm" của pane trái).
- **Tests**: +2 integration `SplitTicketPreviewTests.cs` (preview không ghi DB + số khớp split thật; propagate lỗi `SplitSourcePaid`). Full suite **177 pass**.

---

## 20. Module/Page UI Authorization (2026-06-20)

- **Spec**: `~/CapstoneProject/docs/superpowers/specs/2026-06-20-module-page-ui-authorization-design.md`. **Plan**: `docs/superpowers/plans/2026-06-20-module-page-ui-authorization.md`.
- Tầng phân quyền **điều hướng** (Module → Page, per-account), **độc lập** với permission. Permission vẫn là cổng server cho mọi API; Module/Page chỉ phục vụ FE route-guard + sidebar. Server **không** hard-enforce page access trên data API (chủ ý — non-goal trong spec §1).
- **Entities** (mirror bộ ba Permission): `Module` / `Page` / `StaffAccountPageAccess` ở `src/Rpom.Domain/Access/`. Grant ở mức Page (atomic); module "thấy được" khi có ≥1 page. Migration `AddModulePageAuthorization` (3 bảng).
- **Catalog code**: `Modules.cs` (4 module), `Pages.cs` (25 page), `RolePageDefaults.cs` (template page mặc định theo role) ở `src/Rpom.Application/Access/`.
- **Seeder**: `AccessSeeder` seed 4 module + 25 page + permission mới `page_access:assign`; bootstrap Owner nhận **toàn bộ page** (+ `SyncOwnerPageAccessAsync` lúc restart).
- **Endpoints** (`.WithTags("Access")`):
  - `GET /api/access/my-menu` — auth bất kỳ staff; trả cây module→page account hiện tại truy cập được (nguồn cho sidebar + route guard).
  - `GET /api/access/staff-accounts/{id}/page-access` — perm `page_access:assign`; full catalog + cờ `granted` cho 1 account (lưới checkbox admin).
  - `PUT /api/access/staff-accounts/{id}/page-access` — perm `page_access:assign`; **full-replace** tập page, ghi `AuditLog` (UPDATE/StaffAccount), bump `VersionScopes.Access`.
  - `GET /api/access/role-page-defaults/{roleCode}` — perm `page_access:assign`; template page mặc định theo role (pre-fill grid, reset-to-default).
- **Invalidate**: FE poll `GetVersions`; `ACCESS` đổi → fetch lại `my-menu`. Chỉ PUT page-access bump version.
- **Integration point (chưa làm)**: `CreateStaffAccount` sau này gọi `RolePageDefaults.ForRole(...)` để seed page access khởi tạo.
- **Tests**: +10 integration (`PageAccessTests`) — my-menu lọc theo grant, full grid + granted flags, full-replace add/remove + persist, unknown page/account, version bump, role default. Full suite **187 pass**.

---

## 21. Account Management & Authorization Admin — Backend (2026-06-21)

- **Spec**: `~/CapstoneProject/docs/superpowers/specs/2026-06-20-account-management-authorization-admin-design.md`. **Plan**: `docs/superpowers/plans/2026-06-20-account-management-authorization-admin.md`.
- API backend cho màn ERP quản lý account + cấp quyền (Role-filtered navigation + permission). **Không thêm entity/migration** — tái dùng `StaffAccount`/`Role`/`Permission`/`Module`/`Page` + bộ ba page-access. FE (NextERP) ở phase riêng.
- **Use cases mới** (`src/Rpom.Application/Access/`), endpoint `.WithTags("Access")`:
  - `GET /api/access/roles` — list role + số account mỗi role (cây trái + selector). Perm `staff_account:manage`.
  - `GET /api/access/staff-accounts?roleId=&search=&pageNumber=&pageSize=` — grid account (paged). Perm `staff_account:manage`.
  - `GET /api/access/staff-accounts/{id}` — chi tiết account. Perm `staff_account:manage`.
  - `POST /api/access/staff-accounts` — tạo account (BCrypt hash, AuditLog CREATE, bump ACCESS). Perm `staff_account:manage`.
  - `PUT /api/access/staff-accounts/{id}` — sửa fullname/phone/email/role/isActive/isLocked (username immutable; AuditLog UPDATE, bump ACCESS). Perm `staff_account:manage`.
  - `PUT /api/access/staff-accounts/{id}/password` — reset mật khẩu (BCrypt, AuditLog RESET_PASSWORD, KHÔNG bump). Perm `staff_account:manage`.
  - `GET /api/access/staff-accounts/{id}/permissions` — full permission catalog + cờ granted (mirror page-access). Perm `permission:assign`.
  - `PUT /api/access/staff-accounts/{id}/permissions` — full-replace permission grants (AuditLog UPDATE, bump ACCESS). Perm `permission:assign`.
  - `GET /api/access/role-permission-defaults/{roleCode}` — template permission mặc định theo role. Perm `permission:assign`.
- **Catalog/Errors mới**: `RolePermissionDefaults.cs` (template permission theo role); `AccessErrors.UsernameDuplicate` / `RoleNotFound` / `UnknownPermissionCode`.
- **AuditLog append-only**: `CreateStaffAccount` save account trước (lấy id) rồi mới insert AuditLog (không UPDATE), 2 save trong cùng transaction.
- **Tests**: +21 integration (`AccountManagementTests`). Full suite **208 pass** (Application). Route smoke: 3 endpoint mới trả 401 (đã register + auth).

---

## 22. Reservation Redesign (2026-06-27)

- **Spec**: `~/CapstoneProject/docs/superpowers/specs/2026-06-27-reservation-redesign-design.md`. **Plan**: `docs/superpowers/plans/2026-06-27-reservation-redesign.md`.
- Phone booking feature for Cashier + Order Staff, counter-scoped. Multi-table reservations via new `ReservationTable` junction table.
- **Schema changes**:
  - **Migration**: `AddReservationRedesign` — drops legacy `Reservation.TableId` + `Reservation.LinkedTicketId` columns; adds `Reservation.CounterId` (FK, scoped), `Reservation.Version` (optimistic concurrency), new junction `ReservationTable` (FK pair → Reservation + Table), new nullable FK `Ticket.ReservationId`.
- **New status**: `NOT_ARRIVED` (set lazily on list read — no background cron). Hold window is non-blocking (walk-ins permitted).
- **5 endpoints** under `POST/GET /api/reservations/...`:
  - `CreateReservation` (UC-R1) — creates phone booking.
  - `ListReservations` (UC-R2) — list counter-scoped, auto-mark late NOT_ARRIVED.
  - `GetReservationDetails` (UC-R3) — projection; read-only, no mutation.
  - `SeatReservation` (UC-R4) — link tables + open seated ticket (one-shot; tables become OCCUPIED).
  - `CancelReservation` (UC-R5) — mark CANCELLED; release table locks.
- **Use cases** in `src/Rpom.Application/Reservations/<UseCase>/<UseCase>.cs` (per-file pattern per CLAUDE.md §2).
- **Permissions** (4 new): `reservation:view`, `reservation:create`, `reservation:seat`, `reservation:cancel` (seeded in `AccessSeeder`).
- **AuditLog**: `CREATE` (UC-R1), `SEAT` (UC-R4), `CANCEL` (UC-R5). Bump `FLOOR_PLAN` (tables, tickets).
- **⚠️ Doc Reconciliation Pending**: Canonical docs (`RPOM_Glossary.md` §4.8/§6.7/§7.5, `RPOM_Business_Flows.md` F6, `RPOM_Features_and_Screens.md`, `RPOM_Requirements.md`, Logical ERD) still describe pre-redesign single-table model. Reconciliation deferred post-merge.

---

## 23. Process Return — per-ingredient restock + set menu components (2026-07-01)

- **Mục đích**: bếp xử lý trả hàng được phép hoàn kho theo **từng nguyên liệu với số lượng cụ thể** (thay vì chỉ hoàn full theo BOM), và hỗ trợ **set menu/combo hoàn theo từng component**.
- **API** `POST /api/kitchen/order-items/{orderItemId}/process-return` — body mới:
  - `RestockFull` (bool): `true` → BE tự hoàn theo BOM × số lượng (bỏ qua `Ingredients`). `false` → hoàn đúng `Ingredients` đã gửi.
  - `Ingredients: [{ itemId, quantity }]`: từng nguyên liệu/hàng stockable + số lượng (base UoM). Mỗi loại **≤ định mức BOM × qty** (cap); rỗng = không hoàn kho.
  - `Components: [{ orderItemDetailId, restockFull, ingredients }]`: cho set menu — danh sách component thuộc **khu bếp đang xử lý**. Một lần gọi phải gửi **đầy đủ** component đang chờ của station đó.
- **Set menu**:
  - `AddRefundLine` giờ copy component gốc (`OrderItemDetail`) sang `CartItemDetail` của refund line → `SendOrder` tạo refund `OrderItemDetail` (kèm snapshot station). Pricing không đổi (parent đã mang `ChoicePricePerUnit`).
  - Set chỉ chuyển `DONE` khi **mọi component kitchen-routed (kể cả khác station)** đã hoàn; chưa đủ → parent `PROCESSING`.
- **Restock cap**: số lượng nhập tay mỗi ingredient không vượt BOM × qty (`OrderItem.ReturnQuantityExceedsBom`); ingredient không thuộc món → `ReturnIngredientInvalid`.
- **StockMovementService**: thay `RestockReturnAsync` bằng `GetReturnBreakdownAsync` + `RestockReturnLinesAsync` (line) và `GetComponentReturnBreakdownAsync` + `RestockReturnComponentLinesAsync` (component). Movement `RETURN_IN`, idempotent theo reference.
- **Reference type mới**: `ORDER_RETURN_COMPONENT` (ReferenceId = refund `OrderItemDetail.Id`).
- **KDS**: `GetKitchenOrders` loại bỏ dòng/refund component (`OriginalOrderItemId != null`) khỏi màn nấu — refund chỉ xử lý ở process-return.
- **Errors mới** (`OrderItemErrors`): `ReturnIngredientInvalid`, `ReturnQuantityExceedsBom`, `ReturnQuantityInvalid`, `ReturnNotSetMenu`, `ReturnIsSetMenu`, `ReturnComponentsIncomplete`.
- **Không có migration** (không đổi schema — tái dùng `OrderItemDetail`/`CartItemDetail`, ReferenceType là giá trị chuỗi).
- 

---

## 24. Tách SetItemAreaLock → LockItemArea + UnlockItemArea (2026-07-04)
- Tách use case `SetItemAreaLock` (dùng `Lock: bool`) thành 2 use case riêng để dễ thêm logic tình huống về sau:
  - `POST /api/kitchen/items/{itemId}/lock` → `LockItemArea` (kèm `lockContainingSetMenus` + cascade set menu).
  - `POST /api/kitchen/items/{itemId}/unlock` → `UnlockItemArea` (chỉ gỡ chính món, không cascade).
- Logic chung (gate station + set-menu involvement, resolve target area, serving-area lookup, phát notification + audit) gom vào helper `ItemAreaLockSupport`.
- Bỏ endpoint/use case cũ `SetItemAreaLock`. Không đổi schema.

---

## 25. Ingredient lock toàn hệ thống (global, qua BOM) (2026-07-04)

- **Mục đích**: khoá/mở "hết hàng" NGUYÊN LIỆU ở phạm vi toàn hệ thống (kho dùng chung, không theo Area/Station). Khoá 1 nguyên liệu → mọi món HasRecipe dùng nó (qua BomLine) bị khoá lây → luồng order chặn tự động.
- **Lưu trạng thái** (theo dev chốt):
  - `IngredientLock` (bảng mới, PK=ItemId, global) — khoá của chính nguyên liệu.
  - Món HasRecipe bị cascade → lưu vào `ItemAreaLock` (tái dùng cơ chế F5) với cờ mới `IsIngredientLock=true`, ở TẤT CẢ area phục vụ món. Nhờ đó AddCartItem/SendOrder/GetMenu chặn/hiển thị tự động, không cần sửa.
- **3 API** (persona Kitchen, quyền `item:toggle_availability`):
  - `GET /api/kitchen/ingredient-locks?search=` — list nguyên liệu (material qua BOM active) + `isLocked` + danh sách món HasRecipe bị ảnh hưởng.
  - `POST /api/kitchen/ingredients/{itemId}/lock` — validate item là material (BomLine.MaterialItemId active) → INSERT IngredientLock + cascade ItemAreaLock.
  - `POST /api/kitchen/ingredients/{itemId}/unlock` — DELETE IngredientLock; gỡ cascade cho các món KHÔNG còn nguyên liệu nào khác đang khoá; chỉ gỡ dòng `IsIngredientLock=true`.
- **UnlockItemArea** (F5) chỉ gỡ dòng `!IsIngredientLock` — F5 không vô tình mở món đang thiếu nguyên liệu.
- **Error mới**: `Item.NotAnIngredient`. **Migration** `AddIngredientLock` (bảng `ingredient_locks` + cột `is_ingredient_lock`).
- Chưa gửi StaffNotification cho ingredient lock (có thể thêm sau).

### 25.1 Lock/Unlock Item & Ingredient — luật đầy đủ (2026-07-04)

Model: `item_area_locks` 1 dòng/(Item,Area) + 1 cờ `IsIngredientLock` (true=ingredient cascade, false=F5); `ingredient_locks` global. Mỗi (Item,Area) chỉ 1 nguồn sở hữu (đảm bảo bởi luật reject). Giữ nguyên format Notification (qua `ItemAreaLockSupport.NotifyAsync`).

- **Notify = availability transition per (Item/SetMenu, Area)**: chỉ báo khi dòng khoá ĐẦU TIÊN cho (item,area) được tạo (bất kể F5/ingredient), và khi dòng khoá bị gỡ. LockItemArea/UnlockItemArea (EmitAsync), LockIngredient/UnlockIngredient (NotifyAsync) — cùng format.
- **LockItemArea**: **reject** `Item.LockedByIngredient` nếu item đang có dòng `IsIngredientLock=true`. Giữ option `LockContainingSetMenus` (COMPONENT auto; MODIFIER khi mọi option đã khoá).
- **LockIngredient**: mặc định lock recipe item ở **All Area** + **cascade set menu** (dùng chung `AddContainingSetMenuLocksAsync`), bỏ qua (item,area) đã khoá bởi nguồn khác, **notify** dòng mới. `IsIngredientLock=true`.
- **UnlockItemArea (item thường)**: **reject** `Item.IngredientsNotAvailable` (+ list material đang khoá) nếu item còn ingredient-locked; ngược lại gỡ dòng F5 + notify.
- **UnlockItemArea (set menu)**: guard per-area — mọi COMPONENT available + mỗi CHOICE_CATEGORY còn ≥1 option available (available = không có dòng khoá bất kể nguồn); fail → **reject** `Item.SetMenuComponentsLocked` (+ list); pass → gỡ dòng set menu (bất kể cờ) + notify.
- **UnlockIngredient**: gỡ dòng ingredient của recipe item khi mở ingredient cuối + **notify** dòng vừa gỡ. Không đụng set menu (unlock thủ công).
- Shared: `ItemAreaLockSupport.NotifyAsync` (tách khỏi EmitAsync) + `AddContainingSetMenuLocksAsync` (multi-item, dùng chung Lock F5 + LockIngredient). Không đổi schema/migration.

### 25.2 UnlockItemArea set menu — partial per-area (2026-07-04)
- Đổi guard set menu từ all-or-nothing (reject) sang **partial per-area**: area PASS (mọi COMPONENT available + mỗi CHOICE_CATEGORY còn ≥1 option available tại area đó) → unlock + notify; area bị chặn → **không** reject mà đưa vào `BlockedAreas`.
- Response `UnlockItemArea` thêm `BlockedAreas: [{ areaId, components:[{id,name}], choiceCategories:[{id,name}] }]` (rỗng với item thường). FE biết chính xác area nào unlock được, area nào chưa + lý do. Hỗ trợ AllArea.
- Item thường giữ nguyên: reject `Item.IngredientsNotAvailable` khi còn ingredient-locked.

## 26. Discount manual-override — lock chỉ khi áp tay (2026-07-05)

- **Vấn đề**: `SendOrder.TryAutoApplyDiscountAsync` đè `DiscountPolicyId` mỗi lần send, không có guard → cashier gỡ discount auto / chọn tay policy khác thì lần send sau bị auto ghi đè lại.
- **Quyết định**: cột mới `Ticket.IsDiscountManual` (bool, default false). **Chỉ khoá khi áp tay**: `ApplyDiscountPolicy` set `true` (auto không đè policy cashier chọn); `RemoveDiscount` set `false` (mở khoá — send sau auto áp lại nếu đủ điều kiện). Auto-apply không set flag, bị skip khi flag `true`. (Bản đầu chốt "manual thắng vĩnh viễn" cho cả remove, nhưng test thực tế thấy nghịch trực giác → đổi.)
- **Đổi policy** = 2 bước Remove → Apply (giữ guard `AlreadyApplied`); FE orchestrate. Cashier áp tay được **mọi** policy active kể cả auto.
- **3 sửa BE**: `SendOrder.cs` (guard `IsDiscountManual` đầu `TryAutoApplyDiscountAsync`), `ApplyDiscountPolicy.cs` (flag = true), `RemoveDiscount.cs` (flag = false).
- **FE OMS**: `CashPaymentScreen` — đổi policy remove-rồi-apply + bỏ filter `!isAutoApply` (list hiện mọi policy); `PaymentVoucherSection` — thêm nút **"Gỡ"** trên banner policy đang áp.
- **Migration** `AddIsDiscountManualToTicket` (cột `is_discount_manual`, additive, default false).
- **Test**: 4 case trong `DiscountIntegrationTests` (auto-apply khi chưa can thiệp, remove mở khoá → send sau auto áp lại, apply tay không bị auto đè, apply set flag). Spec: `docs/superpowers/specs/2026-07-05-discount-manual-override-design.md`.

---

---

## 27. SendOrder — low-stock gate trước khi gửi bếp (2026-07-08)

- Thêm `IStockAvailabilityService.CheckCartAsync` (impl `StockAvailabilityService`, read-only) chạy TRƯỚC khi gửi. Target = nguyên liệu BOM của các món **HasRecipe** + hàng **IsStockable** trực tiếp trong cart (kể cả component set menu). Tồn khả dụng mỗi target = `ItemStock.CurrentQty − Σ demand mọi dòng PENDING` (line OrderItem + set-menu component, **mọi khu bếp** — pool chung). Deduct thật vẫn ở StartCook nên PENDING = nhu cầu đã cam kết chưa trừ.
- **Gate theo định mức tồn tối thiểu**: `available = CurrentQty − Σ pending − demand của cart đang gửi`; block khi `available < Item.LowStockThreshold` (null → 0). Tính cả lượng batch đang gửi → gửi xong tồn không tụt dưới định mức. Expand đổi về base UoM giống `StockMovementService`.
- Thiếu bất kỳ target nào → **chặn toàn bộ, KHÔNG gửi gì**, trả **409** `Order.InsufficientStock` với message liệt kê từng món + nguyên liệu dưới định mức (`Tên(#id): Vật liệu(#id) còn X/định mức Y`). Không mở rộng Response (giữ `{ orderId, orderNumber, itemCount, totalAmount }`).
- Đặt sau bước chặn món out-of-stock lock, trước mọi mutation → không side-effect khi thiếu. Test `SendOrderStockCheckTests` (block khi tồn < định mức / cho qua khi ≥ định mức).

---

## 28. Phiếu thu / Phiếu chi (Cash Receive/Payment Voucher) (2026-07-12)

- **Spec**: `docs/superpowers/specs/2026-07-05-cash-receive-payment-voucher-design.md`. **Plan**: `docs/superpowers/plans/2026-07-12-cash-receive-payment-voucher.md`.
- **Aggregate mới** `Documents` (`src/Rpom.Domain/Documents/`): `DocumentType` (catalog RECEIVE/PAYMENT, Owner-managed, seed 6 type — CRUD Owner deferred Phase 2), `Document` (header dùng chung, `Code` = `PT-yyyyMMdd-NNN`/`PC-yyyyMMdd-NNN`, `Direction`, `Status` ACTIVE/VOIDED), `Receive`/`Payment` (detail 1:1 shared-PK với `Document.Id`, mang `Amount`/`CashDrawerSessionId`/`CounterId`).
- **Use case mới** (`src/Rpom.Application/CashDocuments/`, `src/Rpom.Application/Lookups/GetDocumentTypes/`): `CreateReceive`, `CreatePayment` (bắt buộc có drawer OPEN tại quầy, tự suy `CashDrawerSessionId` qua `CashDocumentFactory`), `VoidCashDocument` (chỉ khi ACTIVE + session còn OPEN — soft-cancel, giữ nguyên detail row), `ListCashDocuments`, `GetCashDocument`, `GetDocumentTypes` (lookup).
- **Endpoint**: `POST /api/cash-documents/receive`, `POST /api/cash-documents/payment`, `POST /api/cash-documents/{id}/void`, `GET /api/cash-documents`, `GET /api/cash-documents/{id}`, `GET /api/lookups/document-types`. Permission mới: `cash_document:create_receive|create_payment|void|view` (nhóm Cashier, `Permissions.cs:69-72`).
- **CloseCashDrawer đổi công thức variance**: `Expected = OpeningCash + cashRevenue + ΣReceive − ΣPayment` (chỉ tính voucher ACTIVE) — `src/Rpom.Application/CashDrawers/CloseCashDrawer/CloseCashDrawer.cs:132-140`.
- **ShiftReport.Response** thêm `TotalReceive`/`TotalPayment` (`ShiftReport.cs:32-33,70-75`).
- **Migration** `AddCashReceivePaymentVouchers` (4 bảng `document_types`/`documents`/`payments`/`receives`, additive).
- **Biết trước, chưa fix**: `CashDocumentFactory.NextCodeAsync` sinh `Code` kiểu count-then-format, không an toàn concurrency — unique index trên `documents.code` chặn được trùng dữ liệu nhưng va chạm cùng ngày hiện trả về lỗi 500 thô thay vì lỗi retry sạch (theo dõi ở task follow-up T15).
- **Docs**: `~/CapstoneProject/docs/07-features/07-shift-cash-drawer.md` thêm mục "Cash Vouchers (Receive / Payment)" (mục 8, renumber 8→15) — file này nằm ở repo docs ngoài, cập nhật riêng qua quy trình docs của dev.

---

## 29. Hóa đơn điện tử qua MInvoice (E-Invoice, máy tính tiền) (2026-07-12)

Tự động phát hành HĐĐT cho mỗi ticket đã đóng, qua VAN **MInvoice**, theo mô hình
**hóa đơn khởi tạo từ máy tính tiền** (NĐ70/TT78). Chi tiết đầy đủ + rationale:
`docs/07-features/11-einvoice.md`.

### 28.1 Luồng
- `CloseTicket` (khi `einvoice.enabled`) tạo `EInvoice` **PENDING** + `ScheduledPublishAt = ClosedAt + publish_delay_minutes`
  (grace window để khách kịp đưa MST xuất HĐ công ty) — `src/Rpom.Application/Cashier/CloseTicket/CloseTicket.cs:186-199`.
- Quartz `EInvoicePublishJob` (15s) → `ProcessPendingEInvoices` → `EInvoicePublishService.PublishAsync`
  → `MInvoiceGateway` (**SaveSign**, idempotent qua `key_api = TicketId`).
- Đóng bill **không chờ** MInvoice. Worker self-healing: publish khi đến hạn, retry FAILED, dò row PUBLISHING kẹt >2 phút.

### 28.2 Bảng / Migration
- `e_invoices` thêm lifecycle: `status`, `buyer_type`, `scheduled_publish_at`, `mcqt`, `lookup_code`,
  `invoice_guid`, `invoice_series`, `invoice_number`, `retry_count`, `last_error`, `published_at`,
  `version`, `phone_number`, `cccd` + index `(status, scheduled_publish_at)`.
- Migration `AddEInvoiceLifecycle`; thêm `ReconcileEInvoiceSnapshot` (Up/Down **rỗng**, chỉ để đồng bộ
  ModelSnapshot sau khi merge nhánh e-invoice vào cashier-pricing).

### 28.3 Endpoints (persona Cashier)
| Route | Permission |
|---|---|
| `GET /api/cashier/einvoice/lookup?taxCode=` | `einvoice:update_buyer` |
| `PUT /api/cashier/einvoice/{ticketId}/buyer` | `einvoice:update_buyer` |
| `POST /api/cashier/einvoice/{ticketId}/publish` | `einvoice:publish` |
| `POST /api/cashier/einvoice/{ticketId}/cancel` | `einvoice:cancel` |
| `GET /api/cashier/einvoice/{ticketId}` | `einvoice:view` |

### 28.4 Config (`ConfigValue`, KHÔNG hardcode)
`einvoice.enabled` · `minvoice_base_url` · `username` · `password` · `ma_dvcs` · `invoice_series` ·
`payment_method_name` · `publish_delay_minutes` · `max_retry` · `taxlookup_quickmaster_url` ·
`taxlookup_api_key` (không cần) · `poll_interval_seconds` (**hiện vô tác dụng** — Quartz hardcode 15s).

### 28.5 Phát hiện khi test LIVE (quan trọng — đều đã fix)
- **Hóa đơn máy tính tiền KHÔNG bao giờ lên `trang_thai=4`.** SaveSign trả `trang_thai=2` ("Đã ký")
  nhưng **đã kèm MCQT hợp lệ** (`M1-26-RV1DV-...`) và đứng yên ở 2. → Luật chốt: **có `macqt` = PUBLISHED**.
  Nếu chờ `4` thì mọi HĐ đã xuất sẽ kẹt mãi ở PUBLISHING (`MInvoiceStatusMapper.cs`).
- **Response MInvoice có key JSON trùng** (`ngayDi` xuất hiện 2 lần) → `JsonNode`/`JsonObject` **ném
  exception** → *mọi* lần publish crash. Đổi sang `JsonDocument` (dung thứ key trùng) — `MInvoiceGateway.ReadAsync`.
- **Service charge phải nằm trong taxable base**: `AmountWithoutVat = Subtotal − Discount + ServiceCharge`,
  nếu không sẽ vi phạm ràng buộc `AmountWithoutVat + VatAmount == TotalAmount` của MInvoice (bill có SC = đa số).
- **`key_api` dedup là thật**: publish 2 lần cùng key → trả về **cùng 1 hóa đơn** (cùng `shdon`, cùng guid).
  → Đường retry/reconcile an toàn.
- **Tra MST** đi qua QuickMasterAPI `TaxCode_Search` (`?TaxCode=&langId=1`, AllowAnonymous, response bọc
  `result.Data`) — vì API tra MST của MInvoice chỉ nhận IP đã whitelist.

### 28.6 Quyết định thiết kế
- **PUBLISHED là terminal** — MInvoice **không có callback**; `GetInfoInvoice` là cách pull duy nhất, và
  RPOM **ngừng theo dõi** sau khi có MCQT (bill đã in, khách đã về). Job reconcile định kỳ cho row
  PUBLISHED đã cân nhắc và **cố ý hoãn**.
- **ONLINE-ONLY** — KHÔNG làm offline invoicing. Mô hình máy tính tiền chính thức cho phép POS tự sinh
  mã tra cứu (`sobaomat`) để in phiếu khi mất mạng rồi đẩy sau; RPOM **cố ý không làm** (ngoài scope
  capstone). Worker async vốn đã đảm bảo mất mạng không chặn việc đóng bill — HĐ sẽ phát hành khi có mạng lại.
- **Biết trước, chưa fix**: `HuyHoaDon` từ chối hủy HĐ đang ở `trang_thai=2` (đã ký, có MCQT) → gateway
  trả `CancelNotAllowed` (không crash). Cần xác nhận điều kiện hủy với MInvoice trước khi dựa vào Cancel.

### 28.7 Test
- Unit/integration: **367/367 pass**.
- **Live tests** (`LiveEInvoiceIntegrationTests`, gate `RPOM_LIVE_EINVOICE=1`, không chạy CI): tra MST
  (hợp lệ/sai) · publish → **PUBLISHED có MCQT thật** · idempotency `key_api`. Config đọc từ DB dev.
- Script nạp config: `einvoice-config.local.sql` (git-ignored, UPSERT, không đụng seeder).

## 29. Unlock set menu 1 khu/lần + isLocked cho modifier trong GetMenu (2026-07-10)
- **UnlockItemArea**: set menu bỏ AllArea — ép đúng **1 khu/lần** (nếu `AllServingAreas` hoặc >1 khu → 400 `SetMenu.UnlockSingleArea`). Nhờ đó tín hiệu rõ ràng: mở được → 200, còn component khoá → 409 (`SetMenu.ComponentsLocked`), hết partial-báo-thành-công. Món thường vẫn cho AllArea/nhiều khu (không có partial).
- **GetMenu** (`api/cashier/menu`): `ModifierSpec` thêm `IsLocked` — out-of-stock lock của item modifier tại area của bàn (mirror `MenuItem.IsLocked`, per (Item, Area)). Query `ItemAreaLocks` theo area cho tập modifier item ids trong `LoadSetMenuSpecsAsync`.

## 30. Staff Scheduling P1 — Schedule Template foundation (2026-07-14)
- Domain area mới `Scheduling`: `ScheduleTemplate` + `ScheduleTemplateLine` (1 dòng = headcount cho (weekday × shift × role)); unique `(templateId, dayOfWeek, shiftId, roleId)`; FK Restrict→shifts/roles, Cascade→template. Migration `AddScheduleTemplate` (2 bảng).
- 5 use case + endpoint (Erp, tag `ScheduleTemplates`): `POST/PUT/GET/GET{id}/DELETE api/schedule-templates`. Create/Update/Delete quyền `schedule:template_manage`; List/Get quyền `schedule:view`. Guard: trùng dòng (`ScheduleTemplate.DuplicateLine`), shift/role không active (`InvalidShift`/`InvalidRole`), soft-delete + chặn xoá template đang gắn auto-generate (`IsAutoTemplate`, đọc config `schedule.auto_generate_template_id`).
- Nền cho P2–P5: scope version `SCHEDULE`; 6 permission (`schedule:*`, `swap:*`) seed vào catalog (master_data/common); 10 config key `schedule.*` (C1–C4 constraint, auto template id, run/publish time, lead-time swap/edit) + default seed.
- Test `ScheduleTemplateHandlerTests` (8) pass: create/duplicate, update/notfound, get, list, delete-soft, delete-auto-blocked.

## 31. Staff Scheduling P2 — Generation & Lifecycle (2026-07-16)
- Entity `Schedule` (WeekStartDate=Monday, Status DRAFT/PUBLISHED/DELETED, SourceTemplateId, GenerationType) + `ScheduleAssignment` (slot per (WorkDate, ShiftId, RoleId), `StaffAccountId` NULL = understaffed, `Version` optimistic token). Migration `AddScheduleAndAssignment`: filtered unique `ux_schedule_week_live` (`status <> 'DELETED'`) = 1 lịch sống/tuần; check constraint status; FK Restrict→shift/role/staff, Cascade→schedule.
- **`ScheduleGenerator`** (pure, không DB, `Application/Scheduling/Generation/`): greedy most-constrained-first; chọn nhân viên **ít giờ nhất** (tie-break: ít ca → id nhỏ); hard constraint C1 ca/ngày, C2 giờ/tuần, C3 ngày liên tiếp, C4 nghỉ tối thiểu (tính overnight qua `IsNextDay`); không đủ điều kiện → để slot NULL. `ScheduleWeek` helper (MondayOf/NextMonday/IsMonday).
- 7 use case + endpoint (tag `Schedules`): `POST api/schedules/generate` (tuần phải là Monday ≥ N+1, 1 lịch/tuần), `GET api/schedules/{id}`, `GET api/schedules`, `GET api/schedules/mine` (staff, chỉ PUBLISHED — quyền `schedule:view_own`), `POST api/schedules/{id}/publish` (raise `SchedulePublishedDomainEvent` cho P3), `DELETE api/schedules/{id}` (scrap draft → free tuần), `PUT api/schedules/assignments/{id}` (fill/clear; vi phạm constraint chỉ **warning** cho manager override; published chỉ sửa khi còn ≥ `published_edit_lead_time_hours`; `expectedVersion` → 409 `Schedule.ConcurrencyConflict`).
- `IDbContext` thêm `Entry<TEntity>()` (cần set OriginalValue của concurrency token) + 2 DbSet.
- Test: `ScheduleGeneratorTests` (6, pure) + `ScheduleLifecycleHandlerTests` (12) pass.

## 32. Staff Scheduling P3 — Email (SMTP) + first domain-event handler (2026-07-16)
- `IEmailSender` (Application/Abstraction/Email) + `SmtpEmailSender` (Infrastructure, built-in `System.Net.Mail`, config-driven, best-effort — never throws; no-op khi `email.enabled=false` hoặc host rỗng). 8 config key `email.*` (enabled/host/port/user/pass/ssl/from_address/from_name) + seed default (disabled).
- **Handler domain-event đầu tiên của repo.** `SchedulePublishedEmailHandler` → email mọi nhân viên được phân công (distinct, có email) khi lịch publish. `ScheduleAssignmentReassignedEmailHandler` → email nhân viên bị gỡ + nhân viên mới khi sửa assignment của lịch ĐÃ published. Cả hai gửi qua Outbox (raise trong PublishSchedule/EditScheduleAssignment → `ProcessOutboxJob` dispatch).
- **QUAN TRỌNG — khác plan & CLAUDE.md §7:** `DomainEventHandlersFactory` scan `AssemblyReference.Assembly` = **Rpom.Application** rồi resolve **concrete type**. Nên handler PHẢI ở `Rpom.Application` (đặt ở Infrastructure sẽ không bao giờ được phát hiện), và `IdempotentDomainEventHandler<T>` (Infrastructure, internal) **không compose** được — bỏ. Không cần idempotency riêng: `ProcessOutboxJob` `[DisallowConcurrentExecution]` + mark `ProcessedOnUtc` đúng 1 lần/message. Event là **class** (không record) vì `DomainEvent` là abstract class.
- Test `SchedulePublishedEmailHandlerTests` (2) pass: publish → email đúng 2 người có email (bỏ qua slot NULL + người không email); reassign → email cả người cũ + mới.

## 33. Staff Scheduling P4 — Automation (Quartz) (2026-07-16)
- **`WeeklyMoment`** parse `"DOW HH:mm"` (`MON 00:00`, `SAT 18:00`) + `MomentInWeekOf(monday)` → thời điểm cụ thể trong tuần. Timing nằm ở **DB config**, không phải cron lúc startup (Quartz dùng in-memory store).
- **`IScheduleDraftService`/`ScheduleDraftService`** — tách logic "template + tuần → chạy greedy → assignments" ra khỏi `GenerateSchedule` (P2) để manual + auto dùng chung (DRY). `GenerateSchedule.Handler` giờ inject service này thay `IConfigValueService`.
- **`AutoGenerateSchedule`**: nếu đã qua `schedule.auto_generate_run_at` và tuần N+1 chưa có lịch sống → tạo DRAFT `GenerationType=AUTO` từ `schedule.auto_generate_template_id`. Skip khi: chưa tới giờ / chưa cấu hình template / template inactive / tuần đã có lịch / đụng race (bắt `DbUpdateException` từ unique index).
- **`AutoPublishSchedule`**: nếu đã qua `schedule.auto_publish_deadline` và lịch N+1 vẫn DRAFT → publish + raise `SchedulePublishedDomainEvent` (P3 gửi email). Skip khi chưa tới deadline / không có lịch / không còn là draft.
- 2 Quartz job (`AutoGenerateScheduleJob`, `AutoPublishScheduleJob`) chạy **mỗi 15 phút**, chỉ `sender.Send(...)`; command tự quyết có tới giờ chưa → **idempotent**, re-fire an toàn. Theo pattern `MarkLateOrderItemsJob`. Không ghi AuditLog (system-initiated, không có staff actor — giống `MarkLateOrderItems`).
- Test: `WeeklyMomentTests` (4, pure) + `ScheduleAutomationHandlerTests` (9) pass. Toàn bộ scheduling 41/41 pass.

## 34. Staff Scheduling P5 — Shift Swap (2026-07-20)
- Entity `ShiftSwapRequest` (+ `SwapStatus` PENDING/APPROVED/REJECTED/CANCELLED/EXPIRED, errors, 2 domain event). Migration `AddShiftSwapRequest`: check constraint status, index `(Status, EarliestShiftStartAt)` cho job quét, FK Restrict → assignment ×2 + staff ×2.
- `EarliestShiftStartAt` denormalize (MIN giờ bắt đầu của 2 ca) → dùng chung cho lead-time, escalation, expiry. **`RequesterAssignmentVersion`/`TargetAssignmentVersion` chụp lúc tạo** → duyệt thất bại nếu ca bị sửa trong lúc chờ.
- 6 use case + endpoint (tag `SwapRequests`): `POST api/swap-requests` (quyền `swap:request`; guard: đúng ca của mình, khác người, **cùng role**, lịch đã published, đủ lead-time, không trùng pending), `POST .../{id}/cancel` (chỉ người tạo, còn pending), `POST .../{id}/approve` (quyền `swap:approve`; **hoán đổi staff của 2 assignment**; 409 `Swap.AssignmentChanged`), `POST .../{id}/reject` (kèm note), `GET api/swap-requests?status=` (manager), `GET api/swap-requests/mine?status=` (staff, là requester hoặc target).
- Email: `SwapRequestCreatedEmailHandler` → tất cả Manager; `SwapReviewedEmailHandler` → cả 2 nhân viên (kèm lý do khi từ chối). Cùng nằm ở **Rpom.Application** như P3.
- `RunSwapMaintenance` + `SwapMaintenanceJob` (Quartz, **mỗi 60 phút**): (a) escalate — pending sắp tới hạn trong `schedule.swap_escalation_lead_time_hours` → email Manager + A + B **đúng 1 lần** (chốt bằng `EscalationEmailSentAt`); (b) expire — pending mà ca sớm nhất đã tới → `EXPIRED`.
- `CreateSwapRequest` dùng **two-phase save** (save → raise event → save) vì `swap.Id` = 0 trước lần save đầu.
- Test: `SwapRequestHandlerTests` (15) + `SwapMaintenanceTests` (5) pass. Toàn bộ scheduling **61/61**.

## 35. Staff Scheduling — Duplicate schedule (2026-07-20)
- Use case `DuplicateSchedule` + endpoint `POST api/schedules/duplicate` (quyền `schedule:manage`), body `{ sourceScheduleId, weekStartDate }`. Copy toàn bộ assignment của 1 schedule nguồn (status != DELETED) sang tuần đích, **giữ nguyên staff/shift/role**, dịch `WorkDate` sang cùng thứ của tuần mới (offset theo Monday). Kết quả DRAFT, `GenerationType=MANUAL`, giữ `SourceTemplateId` lineage; độc lập với nguồn sau khi tạo.
- Cùng luật tuần như manual generate: Monday ≥ N+1 (`WeekNotMonday`/`WeekNotFutureEnough`), 1 lịch sống/tuần (`WeekAlreadyHasSchedule`); nguồn không tồn tại/đã xoá → `Schedule.NotFound`. AuditLog `DUPLICATE`, bump SCHEDULE.
- Test: `ScheduleLifecycleHandlerTests` +3 (copy giữ staff + dịch ngày; tuần đích đã có lịch; nguồn không tồn tại) — pass 15/15.

## 36. POS terminal — bỏ ràng buộc counter cố định (2026-07-21)
- **Vấn đề**: `PosTerminal` gắn cứng `CounterId` (FK → counter) → 1 máy POS chỉ phục vụ 1 quầy. Thực tế quầy vận hành đã được suy runtime từ `CashDrawerSession` của cashier + ticket, nên cột này chỉ mang tính tổ chức, gây cứng nhắc.
- **Thay đổi**: bỏ hẳn `CounterId` + nav `Counter` khỏi entity `PosTerminal`. Máy POS giờ là máy thuần (name + `DeviceToken`); quầy do runtime quyết. EF config bỏ FK `fk_pos_terminals_counters_counter_id` + index `ix_pos_terminal_counter`. Migration `DropPosTerminalCounter` drop cột `counter_id` (+ FK + index).
- Use case + endpoint cập nhật: `RegisterPosTerminal` (`Command(Name)`, bỏ validate/kiểm tra counter tồn tại + audit "tại quầy X"), `UpdatePosTerminal` (`Command(Id, Name)`, bỏ logic chuyển quầy + audit), `ListPosTerminals`/`GetPosTerminal` (bỏ `CounterId`/`CounterName` khỏi Response, sort theo Name), bỏ query param `counterId`.
- Consumer đọc quầy qua terminal cũng gỡ chiều counter: `GetCustomerDisplay`, `ListCustomerDisplays`, `GetDeviceStatus` (bỏ filter/sort/projection theo counter, bỏ param `counterId`).
- `PollCustomerDisplayState`: `CounterName` không lấy từ terminal nữa mà **suy động từ ticket đang hiển thị** (`Ticket.Counter.Name`) — QR: ticket đang chờ thanh toán; PAID: ticket vừa trả; IDLE: rỗng.
- Build toàn solution 0 error. Không có test cũ chạm PosTerminal/CustomerDisplay/Device.

## 37. Shift — chặn chồng thời gian giữa các ca (2026-07-21)
- `CreateShift` + `UpdateShift` thêm check: khoảng `[BeginTime, EndTime)` không được chồng lên bất kỳ ca nào khác (**cả active lẫn inactive**) → lỗi `Shift.TimeOverlap` (409). Update loại trừ chính nó theo `Id`. So sánh full-precision `TimeOnly` nên bắt trùng đến cả **phút/giây** (không chỉ giờ).
- Logic tách ra helper domain `ShiftSchedule.Overlaps` (dùng chung 2 handler). Ca qua đêm (`IsNextDay`, hoặc `End ≤ Begin`) tách thành 2 cung trong ngày `[Begin, 24:00)` + `[00:00, End)` rồi so cắt từng cặp cung — bắt đúng ca đêm chồng đuôi sang ca sáng. Chạm nhau ở đúng mốc (vd 14:00–22:00 và 22:00–06:00) **không** tính là chồng (half-open interval).
- Compare in-memory (bảng shift nhỏ, logic vòng khó viết bằng SQL).
