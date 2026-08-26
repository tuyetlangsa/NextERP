# Editable AI Report Prompts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép Owner/Admin chỉnh prompt bổ sung chung và theo từng báo cáo, đồng thời chuyển các nút Phân tích bằng AI sang report context có type/filter/data hợp lệ và snapshot prompt nhất quán cho follow-up.

**Architecture:** Backend giữ core system prompt và fixed report profile; một aggregate append-only lưu custom prompt versions và một resolver chụp active prompt vào report conversation. Frontend gửi structured `reportContext` thay vì ghép/cắt JSON, và cung cấp một cửa sổ quản trị hai textarea cùng lịch sử/restore. Manual chat không có report context giữ nguyên tool-calling loop hiện tại.

**Tech Stack:** .NET 10, ASP.NET Core minimal endpoints, MediatR/CQRS, EF Core + PostgreSQL, FluentValidation, xUnit/FluentAssertions/Testcontainers; Next.js 16.2.7, React 19.2.4, TypeScript 5, Axios, Tailwind CSS 4.

## Global Constraints

- `Prompt chung` mặc định là chuỗi rỗng; tuyệt đối không seed/copy system prompt hiện tại vào DB.
- Core system prompt, bảo mật, permission/tool routing và fixed report semantics tiếp tục hardcode/version-control trong backend.
- Custom prompt tối đa 4.000 ký tự cho mỗi scope; chuỗi rỗng là một version hợp lệ để xóa customization.
- Chỉ role code `OWNER` và `ADMIN_VENDOR` được xem setting/history, save hoặc restore; `MANAGER` bị từ chối dù có master-data permission.
- Prompt composition order: core → fixed report profile → active global snapshot → active report snapshot → report data.
- Initial fixed semantic profile chỉ có `TOP_ORDER_STAFF_BY_ITEM`; mọi report type vẫn nhận được global/report custom prompt.
- Report-analysis conversations không được cung cấp data tools hoặc `presentReport`; manual chat tiếp tục dùng tools.
- Save/restore tạo append-only version mới và có hiệu lực với conversation mới; conversation cũ dùng prompt snapshot cũ.
- Không tái sử dụng `AiRestaurantContext`; entity đó chỉ thuộc lock-suggestion pipeline.
- Frontend không stringify/cắt raw JSON; backend chỉ truncate theo JSON record hoàn chỉnh và luôn tạo JSON hợp lệ.
- Trước khi sửa Next.js client components, đọc `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md` và `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`.
- Mỗi task dùng test-fail → implementation → test-pass → commit; backend commit ở `Rpom-backend`, frontend/docs commit ở `NextERP`.

---

## File Structure

### `Rpom-backend`

- Create `src/Rpom.Domain/Ai/AiAnalysisPromptVersion.cs` — immutable version entity.
- Create `src/Rpom.Infrastructure/Database/Configurations/Ai/AiAnalysisPromptVersionConfiguration.cs` — constraints/indexes/FKs.
- Modify `src/Rpom.Domain/Ai/AiMessage.cs` — nullable hidden `ReportContextJson`.
- Modify `src/Rpom.Application/Abstraction/Data/IDbContext.cs` and `src/Rpom.Infrastructure/Database/ApplicationDbContext.cs` — prompt versions DbSet.
- Create EF migration `AddAiAnalysisPromptVersions` and update model snapshot.
- Create `src/Rpom.Application/Abstraction/Ai/IAiAnalysisPromptStore.cs` — atomic append contract.
- Create `src/Rpom.Infrastructure/Ai/Chat/AiAnalysisPromptStore.cs` — advisory-lock transaction implementation.
- Create `src/Rpom.Application/Ai/AnalysisPrompts/AiAnalysisPromptCatalog.cs` — scope/report allowlist and labels.
- Create `src/Rpom.Application/Ai/AnalysisPrompts/AiAnalysisPromptAccess.cs` — OWNER/ADMIN_VENDOR guard.
- Create CQRS handlers under `src/Rpom.Application/Ai/AnalysisPrompts/` for settings, save, history, restore.
- Create endpoints under `src/Rpom.Api/Endpoints/Erp/Ai/AnalysisPrompts/`.
- Create `src/Rpom.Application/Abstraction/Ai/ReportAnalysisContext.cs` — structured API/agent contract.
- Create `src/Rpom.Infrastructure/Ai/Chat/ReportAnalysisContextNormalizer.cs` — validation and complete-record token bounding.
- Create `src/Rpom.Infrastructure/Ai/Chat/ReportAnalysisPromptComposer.cs` — fixed profile + custom snapshot composition.
- Modify `IAgentService`, `SendChatMessage`, `SendChatMessageEndpoint`, `AgentService` — carry/persist/replay report context and disable tools.
- Modify page catalog/seeding to add `nexterp.ai_analysis_prompts`.
- Add focused tests under `tests/Rpom.Application.Tests/Ai/` and authorization contract tests.

### `NextERP`

- Modify `types/api/ai.ts` — report types, context and prompt management DTOs.
- Modify `lib/api/ai.ts` — structured chat request.
- Create `lib/api/aiAnalysisPrompts.ts` — settings/save/history/restore API.
- Modify `lib/ai/analyzeBus.ts`, `AnalyzeButton`, `AiAssistantDock`, `useAiChat` — structured request flow.
- Modify all report tabs with `AnalyzeButton` — stable `reportType` and filters.
- Create `components/windows/WinAiAnalysisPrompt.tsx` — two textareas + history/restore.
- Modify desktop registry, subsystem catalog, page access map and icon map.
- Add pure tests for request creation and role visibility.
- Modify `README.md` and `CHANGES.md` in both repos.

### Task 1: Backend prompt version model và migration

**Files (`Rpom-backend`):**
- Create: `src/Rpom.Domain/Ai/AiAnalysisPromptVersion.cs`
- Create: `src/Rpom.Infrastructure/Database/Configurations/Ai/AiAnalysisPromptVersionConfiguration.cs`
- Modify: `src/Rpom.Domain/Ai/AiMessage.cs`
- Modify: `src/Rpom.Infrastructure/Database/Configurations/Ai/AiMessageConfiguration.cs`
- Modify: `src/Rpom.Application/Abstraction/Data/IDbContext.cs`
- Modify: `src/Rpom.Infrastructure/Database/ApplicationDbContext.cs`
- Create: `tests/Rpom.Application.Tests/Ai/AiAnalysisPromptVersionModelTests.cs`
- Create: generated migration files for `AddAiAnalysisPromptVersions`

**Interfaces:**
- Produces entity fields `ScopeKey`, `Scope`, `ReportType`, `Content`, `VersionNumber`, `IsActive`, `RestoredFromId`, `CreatedByStaffId`, `CreatedAt`.
- Adds nullable `AiMessage.ReportContextJson` which is never returned by conversation DTOs.

- [ ] **Step 1: Viết compile-failing model test**

```csharp
using FluentAssertions;
using Rpom.Domain.Ai;

namespace Rpom.Application.Tests.Ai;

public sealed class AiAnalysisPromptVersionModelTests
{
    [Fact]
    public void NewVersion_HoldsAppendOnlyIdentityAndOptionalRestoreSource()
    {
        var row = new AiAnalysisPromptVersion
        {
            ScopeKey = "REPORT:TOP_ORDER_STAFF_BY_ITEM",
            Scope = "REPORT",
            ReportType = "TOP_ORDER_STAFF_BY_ITEM",
            Content = "Ưu tiên đào tạo chéo.",
            VersionNumber = 2,
            IsActive = true,
            RestoredFromId = 7,
            CreatedByStaffId = 1,
            CreatedAt = new DateTime(2026, 8, 26, 0, 0, 0, DateTimeKind.Utc),
        };

        row.ScopeKey.Should().Be("REPORT:TOP_ORDER_STAFF_BY_ITEM");
        row.RestoredFromId.Should().Be(7);
    }
}
```

- [ ] **Step 2: Chạy test để xác nhận compile fail**

Run: `dotnet test tests/Rpom.Application.Tests/Rpom.Application.Tests.csproj --filter FullyQualifiedName~AiAnalysisPromptVersionModelTests`

Expected: FAIL vì type `AiAnalysisPromptVersion` chưa tồn tại.

- [ ] **Step 3: Implement entity và EF configuration**

Entity shape:

```csharp
public sealed class AiAnalysisPromptVersion : Entity
{
    public long Id { get; set; }
    public string ScopeKey { get; set; } = null!; // GLOBAL | REPORT:{reportType}
    public string Scope { get; set; } = null!;    // GLOBAL | REPORT
    public string? ReportType { get; set; }
    public string Content { get; set; } = "";
    public int VersionNumber { get; set; }
    public bool IsActive { get; set; }
    public long? RestoredFromId { get; set; }
    public int CreatedByStaffId { get; set; }
    public DateTime CreatedAt { get; set; }
    public AiAnalysisPromptVersion? RestoredFrom { get; set; }
    public StaffAccount CreatedByStaff { get; set; } = null!;
}
```

Configuration requirements:

```csharp
builder.Property(x => x.ScopeKey).HasMaxLength(80).IsRequired();
builder.Property(x => x.Scope).HasMaxLength(10).IsRequired();
builder.Property(x => x.ReportType).HasMaxLength(60);
builder.Property(x => x.Content).HasMaxLength(4000).IsRequired();
builder.HasIndex(x => new { x.ScopeKey, x.VersionNumber }).IsUnique();
builder.HasIndex(x => x.ScopeKey).IsUnique().HasFilter("is_active = true");
builder.ToTable(t => t.HasCheckConstraint("ck_ai_analysis_prompt_scope", "scope IN ('GLOBAL','REPORT')"));
```

Use `DeleteBehavior.Restrict` for actor and restore-source FKs. Map `AiMessage.ReportContextJson` as
PostgreSQL `jsonb` or `text` consistently with the generated migration; choose `jsonb` and verify valid
JSON is always assigned by serializer.

- [ ] **Step 4: Add DbSets and generate migration**

Run:

```bash
dotnet ef migrations add AddAiAnalysisPromptVersions --project src/Rpom.Infrastructure --startup-project src/Rpom.Api
```

Inspect generated migration for table, unique indexes, FKs and `ai_messages.report_context_json`.

- [ ] **Step 5: Run model test and build**

Run:

```bash
dotnet test tests/Rpom.Application.Tests/Rpom.Application.Tests.csproj --filter FullyQualifiedName~AiAnalysisPromptVersionModelTests
dotnet build Rpom.slnx --no-restore
```

Expected: both exit 0.

- [ ] **Step 6: Commit domain/migration**

```bash
git add src/Rpom.Domain/Ai src/Rpom.Application/Abstraction/Data/IDbContext.cs src/Rpom.Infrastructure/Database tests/Rpom.Application.Tests/Ai/AiAnalysisPromptVersionModelTests.cs
git commit -m "feat(ai): add analysis prompt version storage"
```

### Task 2: Atomic prompt store, catalog và CQRS handlers

**Files (`Rpom-backend`):**
- Create: `src/Rpom.Application/Abstraction/Ai/IAiAnalysisPromptStore.cs`
- Create: `src/Rpom.Infrastructure/Ai/Chat/AiAnalysisPromptStore.cs`
- Modify: `src/Rpom.Infrastructure/DependencyInjection.cs`
- Create: `src/Rpom.Application/Ai/AnalysisPrompts/AiAnalysisPromptCatalog.cs`
- Create: `src/Rpom.Application/Ai/AnalysisPrompts/AiAnalysisPromptAccess.cs`
- Create: handlers `GetSettings`, `SavePrompt`, `ListHistory`, `RestorePrompt`
- Create: `tests/Rpom.Application.Tests/Ai/AiAnalysisPromptTests.cs`

**Interfaces:**
- Produces `AiAnalysisPromptCatalog.ReportTypes`, `ScopeKey(scope, reportType)` and responses used by endpoints/frontend.
- Produces `IAiAnalysisPromptStore.AppendAsync(scopeKey, scope, reportType, content, actorId, restoredFromId, ct)`.

- [ ] **Step 1: Viết failing tests cho defaults, versioning, clear và restore**

Test expectations:

```csharp
settings.Value.Global.Should().BeNull();
settings.Value.ReportTypes.Should().Contain(x => x.Code == "TOP_ORDER_STAFF_BY_ITEM");

var first = await save.Handle(new("GLOBAL", null, "Ưu tiên rủi ro vận hành"), ct);
var cleared = await save.Handle(new("GLOBAL", null, ""), ct);
cleared.Value.VersionNumber.Should().Be(first.Value.VersionNumber + 1);
cleared.Value.Content.Should().BeEmpty();

var restored = await restore.Handle(new(first.Value.Id), ct);
restored.Value.Content.Should().Be("Ưu tiên rủi ro vận hành");
restored.Value.RestoredFromId.Should().Be(first.Value.Id);
restored.Value.VersionNumber.Should().Be(cleared.Value.VersionNumber + 1);
```

Add a Manager fixture and assert every handler returns `ErrorType.UnAuthorized`. Add an Owner and
AdminVendor fixture and assert both succeed. Add invalid report type and content length 4.001 tests.

- [ ] **Step 2: Run focused tests to verify fail**

Run: `dotnet test tests/Rpom.Application.Tests/Rpom.Application.Tests.csproj --filter FullyQualifiedName~AiAnalysisPromptTests`

Expected: compile FAIL because catalog/handlers/store do not exist.

- [ ] **Step 3: Implement allowlist and access guard**

Catalog includes exactly these code/label pairs:

```csharp
REVENUE_SUMMARY, REVENUE, TICKET_LIST, ITEM_SALES, CATEGORY, ITEM,
TOP_ORDER_STAFF_BY_ITEM, TOP_SELLERS, SHIFT, INGREDIENT, STOCK_ALERT
```

`AiAnalysisPromptAccess.EnsureAsync` queries current `StaffAccount.Role.Code` from `IDbContext` using
`ICurrentStaff.StaffAccountId`; allow only `Roles.Owner` or `Roles.AdminVendor`, otherwise return:

```csharp
Error.Unauthorized("AiAnalysisPrompt.Forbidden", "Chỉ Chủ nhà hàng hoặc Quản trị hệ thống được cấu hình prompt phân tích AI.")
```

Do not add a grantable permission for this operation.

- [ ] **Step 4: Implement atomic append store**

`AiAnalysisPromptStore` receives concrete `ApplicationDbContext` and `IDateTimeProvider`. In one DB
transaction:

```csharp
await using var tx = await db.Database.BeginTransactionAsync(ct);
await db.Database.ExecuteSqlInterpolatedAsync(
    $"SELECT pg_advisory_xact_lock(hashtextextended({scopeKey}, 0))", ct);
var active = await db.AiAnalysisPromptVersions.SingleOrDefaultAsync(x => x.ScopeKey == scopeKey && x.IsActive, ct);
if (active is not null) active.IsActive = false;
int next = (await db.AiAnalysisPromptVersions
    .Where(x => x.ScopeKey == scopeKey)
    .MaxAsync(x => (int?)x.VersionNumber, ct) ?? 0) + 1;
```

Add the new active row, `SaveChangesAsync`, commit and return it. Register
`IAiAnalysisPromptStore` scoped in `DependencyInjection`.

- [ ] **Step 5: Implement handlers and validators**

- `GetSettings`: return `Global = null` plus all report types with `Active = null` when no rows exist;
  frontend converts null active versions to empty textareas without inserting DB rows.
- `SavePrompt.Validator`: scope enum, content max 4000, report type required only for REPORT.
- `SavePrompt.Handler`: role guard then `AppendAsync`.
- `ListHistory`: role guard, same-scope rows newest first, include actor full name.
- `RestorePrompt`: role guard, load source version, call `AppendAsync` with copied content and source id.

All response records use UTC `CreatedAt` and numeric `VersionNumber`; never return core system prompt.

- [ ] **Step 6: Run tests including concurrency case**

Add a test that launches two `AppendAsync` calls for the same scope using two DB scopes and asserts:

```csharp
rows.Count(x => x.IsActive).Should().Be(1);
rows.Select(x => x.VersionNumber).Should().OnlyHaveUniqueItems();
```

Run:

```bash
dotnet test tests/Rpom.Application.Tests/Rpom.Application.Tests.csproj --filter FullyQualifiedName~AiAnalysisPromptTests
dotnet build Rpom.slnx --no-restore
```

Expected: tests pass and build exits 0.

- [ ] **Step 7: Commit prompt behavior**

```bash
git add src/Rpom.Application/Abstraction/Ai src/Rpom.Application/Ai/AnalysisPrompts src/Rpom.Infrastructure/Ai/Chat/AiAnalysisPromptStore.cs src/Rpom.Infrastructure/DependencyInjection.cs tests/Rpom.Application.Tests/Ai/AiAnalysisPromptTests.cs
git commit -m "feat(ai): version editable report prompts"
```

### Task 3: Prompt management endpoints và navigation page

**Files (`Rpom-backend`):**
- Create: endpoint files under `src/Rpom.Api/Endpoints/Erp/Ai/AnalysisPrompts/`
- Modify: `src/Rpom.Application/Access/Pages.cs`
- Modify: `src/Rpom.Infrastructure/Database/Seeding/Essential/AccessSeeder.cs`
- Modify: `tests/Rpom.Application.Tests/Authorization/EndpointAuthorizationContractTests.cs`
- Modify/add: access seeder contract tests

**Interfaces:**
- Produces four `/api/erp/ai-analysis-prompts` endpoints and page code `nexterp.ai_analysis_prompts`.

- [ ] **Step 1: Viết endpoint contract tests trước**

Assert route/verb pairs:

```text
GET  /api/erp/ai-analysis-prompts
PUT  /api/erp/ai-analysis-prompts
GET  /api/erp/ai-analysis-prompts/history
POST /api/erp/ai-analysis-prompts/{id:long}/restore
```

Assert `Pages.All` contains `nexterp.ai_analysis_prompts` and AccessSeeder catalog seeds it.

- [ ] **Step 2: Run tests to verify fail**

Run: `dotnet test tests/Rpom.Application.Tests/Rpom.Application.Tests.csproj --filter "FullyQualifiedName~EndpointAuthorizationContractTests|FullyQualifiedName~AccessSeeder"`

Expected: FAIL because endpoint/page does not exist.

- [ ] **Step 3: Add page and endpoint adapters**

Add:

```csharp
public const string NextErpAiAnalysisPrompts = "nexterp.ai_analysis_prompts";
```

Endpoint request for save:

```csharp
internal sealed record Request(string Scope, string? ReportType, string Content);
```

History query parameters are `scope` and optional `reportType`. Endpoint classes require authenticated
users; CQRS handlers enforce exact role by DB lookup. Do not gate with `MasterDataManage`, because the
selected rule is role-only and Manager may own that permission.

- [ ] **Step 4: Run endpoint/access tests and build**

```bash
dotnet test tests/Rpom.Application.Tests/Rpom.Application.Tests.csproj --filter "FullyQualifiedName~EndpointAuthorizationContractTests|FullyQualifiedName~AccessSeeder"
dotnet build Rpom.slnx --no-restore
```

Expected: all exit 0.

- [ ] **Step 5: Commit API surface**

```bash
git add src/Rpom.Api/Endpoints/Erp/Ai/AnalysisPrompts src/Rpom.Application/Access/Pages.cs src/Rpom.Infrastructure/Database/Seeding/Essential/AccessSeeder.cs tests/Rpom.Application.Tests
git commit -m "feat(ai): expose report prompt management API"
```

### Task 4: Structured report context normalization

**Files (`Rpom-backend`):**
- Create: `src/Rpom.Application/Abstraction/Ai/ReportAnalysisContext.cs`
- Create: `src/Rpom.Infrastructure/Ai/Chat/ReportAnalysisContextNormalizer.cs`
- Create: `tests/Rpom.Application.Tests/Ai/ReportAnalysisContextNormalizerTests.cs`

**Interfaces:**
- Produces `ReportAnalysisContext(ReportType, Filters, SelectedItemId, Data)` and
  `NormalizedReportAnalysisContext(Json, IsTruncated, TotalItems, IncludedItems)`.

- [ ] **Step 1: Viết failing normalization tests**

Cases:

```csharp
var exact = normalizer.Normalize(Context("TOP_ORDER_STAFF_BY_ITEM", """[{"itemId":1}]"""));
JsonDocument.Parse(exact.Json).RootElement.ValueKind.Should().Be(JsonValueKind.Object);
exact.IsTruncated.Should().BeFalse();

var bounded = normalizer.Normalize(Context("TOP_ORDER_STAFF_BY_ITEM", LargeArray(500)));
JsonDocument.Parse(bounded.Json); // must not throw
bounded.IsTruncated.Should().BeTrue();
bounded.IncludedItems.Should().BeLessThan(bounded.TotalItems);
```

Also assert unknown report type, non-object filters, nesting deeper than 12 and serialized request over
128.000 characters return validation errors. Set model-context budget to 24.000 characters.

- [ ] **Step 2: Run tests to verify fail**

Run: `dotnet test tests/Rpom.Application.Tests/Rpom.Application.Tests.csproj --filter FullyQualifiedName~ReportAnalysisContextNormalizerTests`

Expected: compile FAIL because types do not exist.

- [ ] **Step 3: Implement validator/normalizer**

- Validate `ReportType` via catalog.
- Clone incoming `JsonElement` values before request document disposal.
- For payload within 24.000 serialized chars, wrap unchanged in an envelope with metadata.
- For top-level arrays over budget, append complete array elements until the next serialized envelope
  would exceed budget; never substring JSON.
- For top-level objects, recursively truncate array-valued properties by complete elements. Preserve
  scalar summary fields and add metadata at envelope level.
- Return stable validation error instead of passing malformed data.

Envelope shape:

```json
{
  "reportType": "TOP_ORDER_STAFF_BY_ITEM",
  "filters": {},
  "selectedItemId": 1,
  "isTruncated": false,
  "totalItems": 22,
  "includedItems": 22,
  "data": []
}
```

- [ ] **Step 4: Run normalizer tests**

Run: `dotnet test tests/Rpom.Application.Tests/Rpom.Application.Tests.csproj --filter FullyQualifiedName~ReportAnalysisContextNormalizerTests`

Expected: all pass.

- [ ] **Step 5: Commit report context normalization**

```bash
git add src/Rpom.Application/Abstraction/Ai/ReportAnalysisContext.cs src/Rpom.Infrastructure/Ai/Chat/ReportAnalysisContextNormalizer.cs tests/Rpom.Application.Tests/Ai/ReportAnalysisContextNormalizerTests.cs
git commit -m "feat(ai): normalize structured report context"
```

### Task 5: Agent prompt composition, persistence và replay

**Files (`Rpom-backend`):**
- Create: `src/Rpom.Infrastructure/Ai/Chat/ReportAnalysisPromptComposer.cs`
- Modify: `src/Rpom.Application/Abstraction/Ai/IAgentService.cs`
- Modify: `src/Rpom.Application/Ai/Chat/SendChatMessage.cs`
- Modify: `src/Rpom.Api/Endpoints/Erp/Ai/SendChatMessageEndpoint.cs`
- Modify: `src/Rpom.Infrastructure/Ai/Chat/AgentService.cs`
- Modify: `src/Rpom.Application/Ai/Conversations/GetConversation/GetConversation.cs` only if projection accidentally exposes context; response must remain unchanged.
- Modify: AI tests for send, ownership and prompt behavior.

**Interfaces:**
- `IAgentService.RunAsync(..., string userMessage, ReportAnalysisContext? reportContext, CancellationToken ct)`.
- `POST /api/ai/chat` accepts optional nested `reportContext` while retaining old request compatibility.

- [ ] **Step 1: Viết failing composer/handler tests**

Assert exact composition order by comparing indices in composed system text:

```csharp
text.IndexOf("CORE_MARKER").Should().BeLessThan(text.IndexOf("PROFILE_MARKER"));
text.IndexOf("PROFILE_MARKER").Should().BeLessThan(text.IndexOf("GLOBAL_MARKER"));
text.IndexOf("GLOBAL_MARKER").Should().BeLessThan(text.IndexOf("REPORT_MARKER"));
```

Assert `TOP_ORDER_STAFF_BY_ITEM` profile contains net signed/refund/top-3/not-performance semantics.
Assert a report conversation passes `tools: null` to the client while manual chat passes
`AssistantTools.Defs`. Assert saved user message has display `Content` and non-null
`ReportContextJson`; `GetConversation` returns only display content.

- [ ] **Step 2: Run focused tests to verify fail**

Run:

```bash
dotnet test tests/Rpom.Application.Tests/Rpom.Application.Tests.csproj --filter "FullyQualifiedName~SendChatMessageTests|FullyQualifiedName~ReportAnalysisPrompt|FullyQualifiedName~AgentConversationOwnership"
```

Expected: compile/signature failures.

- [ ] **Step 3: Extend command/endpoint/agent contracts compatibly**

Endpoint request:

```csharp
internal sealed record Request(
    long? ConversationId,
    string Message,
    ReportAnalysisContext? ReportContext);
```

Add optional context to command and agent signature. Update every existing call/test with `null` so
manual behavior remains explicit.

- [ ] **Step 4: Resolve active prompts and persist snapshot**

For a new incoming report context:

1. Normalize data.
2. Load active global and matching report versions; absent means empty.
3. Create a serialized snapshot containing normalized envelope plus both custom prompt contents and
   version ids.
4. Store user-visible `Message` in `AiMessage.Content` and snapshot in `ReportContextJson`.
5. Set conversation title from visible message, never JSON.

For follow-up with only `conversationId`, load the conversation's report snapshot from the first user
message containing `ReportContextJson` and reuse it. Never reload current active prompts for that
conversation.

- [ ] **Step 5: Compose messages and disable tools deterministically**

`ReportAnalysisPromptComposer` emits the fixed profile and wraps custom text as owner preferences that
cannot override core security/semantics. In report mode call:

```csharp
client.CompleteAsync(messages, tools: null, ct)
```

For replay, the model-facing first user content combines its display content with the normalized report
data; UI history continues projecting only `AiMessage.Content`. If `isTruncated`, add an instruction to
state the included/total scope and never infer whole-dataset totals from subset rows.

- [ ] **Step 6: Run focused and full AI tests**

```bash
dotnet test tests/Rpom.Application.Tests/Rpom.Application.Tests.csproj --filter "FullyQualifiedName~SendChatMessageTests|FullyQualifiedName~ReportAnalysisPrompt|FullyQualifiedName~AgentConversationOwnership|FullyQualifiedName~AgentVisualization"
dotnet build Rpom.slnx --no-restore
```

Expected: all exit 0; manual chat tests still see tools, report tests see none.

- [ ] **Step 7: Commit agent integration**

```bash
git add src/Rpom.Application/Abstraction/Ai src/Rpom.Application/Ai/Chat src/Rpom.Api/Endpoints/Erp/Ai/SendChatMessageEndpoint.cs src/Rpom.Infrastructure/Ai/Chat src/Rpom.Domain/Ai/AiMessage.cs tests/Rpom.Application.Tests/Ai
git commit -m "feat(ai): analyze reports with prompt snapshots"
```

### Task 6: Frontend structured analysis request

**Files (`NextERP`):**
- Modify: `types/api/ai.ts`
- Modify: `lib/api/ai.ts`
- Modify: `lib/ai/analyzeBus.ts`
- Modify: `components/reports/AnalyzeButton.tsx`
- Modify: `components/ai/AiAssistantDock.tsx`
- Modify: `components/ai/useAiChat.ts`
- Create: `lib/ai/analyzeBus.test.ts`
- Modify: every report tab containing `<AnalyzeButton>`.
- Modify: `package.json`

**Interfaces:**
- Produces `AiReportType`, `ReportAnalysisContext`, `SendChatRequest` and `buildReportAnalysisRequest()`.

- [ ] **Step 1: Đọc Next.js client docs**

```bash
sed -n '1,220p' node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md
sed -n '1,260p' node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md
```

- [ ] **Step 2: Viết failing request-builder test**

```ts
import assert from "node:assert/strict";
import { buildReportAnalysisRequest } from "./analyzeBus";

const request = buildReportAnalysisRequest({
  reportType: "TOP_ORDER_STAFF_BY_ITEM",
  reportName: "Top nhân viên theo món",
  filters: { fromDate: "2026-08-01", toDate: "2026-08-26" },
  selectedItemId: 7,
  data: [{ itemId: 7, topStaff: [] }],
});
assert.equal(request.message, "Phân tích báo cáo Top nhân viên theo món");
assert.equal(request.reportContext.reportType, "TOP_ORDER_STAFF_BY_ITEM");
assert.deepEqual(request.reportContext.data, [{ itemId: 7, topStaff: [] }]);
assert.equal(JSON.stringify(request).includes("DỮ LIỆU:"), false);
```

- [ ] **Step 3: Run test to verify fail**

Run: `npx tsx lib/ai/analyzeBus.test.ts`

Expected: FAIL because structured builder/types do not exist.

- [ ] **Step 4: Implement types and delivery signatures**

Define union with all eleven report codes from the backend catalog. Replace `buildAnalysisMessage` with
`buildReportAnalysisRequest(req)` returning:

```ts
interface SendChatRequest {
  message: string;
  conversationId?: number;
  reportContext?: ReportAnalysisContext;
}
```

Change `aiApi.chat` to accept the object. Change `deliver` to accept `SendChatRequest`; manual `send()`
constructs `{ message, conversationId }`, report `sendFresh()` constructs `{ ...request,
conversationId: undefined }`. Display bubble remains a separate string.

- [ ] **Step 5: Update AnalyzeButton and all report tabs**

New props:

```ts
interface AnalyzeButtonProps {
  reportType: AiReportType;
  reportName: string;
  data: unknown;
  filters?: Record<string, unknown>;
  selectedItemId?: number;
}
```

Map tabs to report codes exactly as catalog. Pass the tab's existing applied filters; `StockAlertTab`
passes `{}`. `TopOrderStaffTab` passes the selected item id from the master-detail plan. Do not pass UI
search/sort as report filters because they do not change API data.

- [ ] **Step 6: Run frontend tests/build**

Add script:

```json
"test:ai-report-context": "tsx lib/ai/analyzeBus.test.ts"
```

Run:

```bash
npm run test:ai-report-context
npm run test:top-order-staff
npx tsc --noEmit
npm run build
```

Expected: all exit 0; repository contains no `json.slice(0, CAP)` analysis path.

- [ ] **Step 7: Commit structured frontend flow**

```bash
git add types/api/ai.ts lib/api/ai.ts lib/ai/analyzeBus.ts lib/ai/analyzeBus.test.ts components/ai components/reports package.json
git commit -m "feat(ai): send structured report analysis context"
```

### Task 7: Frontend prompt-management window

**Files (`NextERP`):**
- Create: `lib/api/aiAnalysisPrompts.ts`
- Modify: `types/api/ai.ts`
- Create: `components/windows/WinAiAnalysisPrompt.tsx`
- Modify: `types/domain.ts`
- Modify: `data/subsystems.ts`
- Modify: `data/pageAccess.ts`
- Modify: `components/desktop/DesktopShell.tsx`
- Modify: `components/desktop/StartMenu.tsx`
- Modify: `components/desktop/icons.tsx`
- Create/modify: `data/pageAccess.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes backend settings/save/history/restore API.
- Produces Owner/Admin-only desktop window `WinAiAnalysisPrompt`.

- [ ] **Step 1: Viết failing role-visibility test**

Extend `Subsystem` with optional `requiredRoleCodes?: readonly string[]` and plan the helper signature:

```ts
assert.equal(canSeeSubsystem(promptSubsystem, new Set(["nexterp.ai_analysis_prompts"]), "OWNER"), true);
assert.equal(canSeeSubsystem(promptSubsystem, new Set(["nexterp.ai_analysis_prompts"]), "ADMIN_VENDOR"), true);
assert.equal(canSeeSubsystem(promptSubsystem, new Set(["nexterp.ai_analysis_prompts"]), "MANAGER"), false);
assert.equal(
  augmentAccessiblePages(new Set(), "OWNER").has("nexterp.ai_analysis_prompts"),
  true,
);
```

- [ ] **Step 2: Run test to verify fail**

Run: `npx tsx data/pageAccess.test.ts`

Expected: compile/assertion fail until role-aware signatures exist.

- [ ] **Step 3: Implement API types/client**

Types include:

```ts
interface AiPromptVersion { id: number; content: string; versionNumber: number; restoredFromId: number | null; createdByFullName: string; createdAt: string; }
interface AiPromptSettings { global: AiPromptVersion | null; reportTypes: Array<{ code: AiReportType; label: string; active: AiPromptVersion | null }>; }
interface SaveAiPromptRequest { scope: "GLOBAL" | "REPORT"; reportType?: AiReportType; content: string; }
```

Client methods: `getSettings`, `save`, `history(scope, reportType?)`, `restore(id)` against the exact
Task 3 routes.

- [ ] **Step 4: Implement simple two-tab window**

`WinAiAnalysisPrompt` behavior:

- Fetch settings on mount.
- Tab `Prompt chung`: one textarea bound to active global content or `""`.
- Tab `Theo báo cáo`: backend catalog dropdown + one textarea bound to selected active report content.
- Character counter `n / 4000`; save disabled only while saving or over limit, not when empty.
- Save sends trimmed content except preserve intentional internal/newline whitespace; empty after trim
  sends `""`.
- On success reload settings and show active version/actor/time.
- `Xem lịch sử` loads current scope and renders a side panel/list.
- `Khôi phục` requires `window.confirm`, calls restore, reloads settings/history and never deletes row.
- Errors use `formatApiError`; no optimistic state.

- [ ] **Step 5: Register role-locked subsystem**

Add subsystem:

```ts
{
  id: "ai-analysis-prompts",
  label: "Bối cảnh phân tích AI",
  description: "Prompt bổ sung chung và theo báo cáo",
  group: "system",
  showOnDesktop: true,
  win: "WinAiAnalysisPrompt",
  requiredRoleCodes: ["OWNER", "ADMIN_VENDOR"],
}
```

Map page code, register window/icon, add `roleCode` to `StartMenu` props and pass `user.roleCode` into
`canSeeSubsystem` for both desktop and Start Menu. `augmentAccessiblePages` adds the page code only for OWNER/ADMIN_VENDOR so existing accounts
see the newly shipped page without manual page-access reset. Backend role guard remains authoritative.

- [ ] **Step 6: Run UI tests/build**

Add script if absent:

```json
"test:page-access": "tsx data/pageAccess.test.ts"
```

Run:

```bash
npm run test:page-access
npm run test:ai-report-context
npm run test:top-order-staff
npx tsc --noEmit
npm run build
```

Expected: all exit 0.

- [ ] **Step 7: Manual authorization/UX check**

- Login OWNER: window visible; global starts empty when DB has no version.
- Save global text, refresh: same text/version visible.
- Save empty: customization clears and new version appears.
- Save report prompt for `TOP_ORDER_STAFF_BY_ITEM`; other report prompt remains unchanged.
- Restore old version creates a higher version number.
- Login MANAGER: window absent; direct PUT/restore calls return unauthorized.
- Confirm no screen displays the hardcoded core system prompt.

- [ ] **Step 8: Commit management window**

```bash
git add lib/api/aiAnalysisPrompts.ts types/api/ai.ts components/windows/WinAiAnalysisPrompt.tsx types/domain.ts data components/desktop package.json
git commit -m "feat(ai): manage supplemental report prompts"
```

### Task 8: End-to-end verification và documentation

**Files:**
- Modify `Rpom-backend/README.md`
- Modify `Rpom-backend/CHANGES.md`
- Modify `NextERP/README.md`
- Modify `NextERP/CHANGES.md`

**Interfaces:**
- Produces verified cross-repo behavior and operator documentation.

- [ ] **Step 1: Run backend focused then full tests**

From `Rpom-backend`:

```bash
dotnet test tests/Rpom.Application.Tests/Rpom.Application.Tests.csproj --filter "FullyQualifiedName~AiAnalysisPrompt|FullyQualifiedName~ReportAnalysis|FullyQualifiedName~SendChatMessage|FullyQualifiedName~AgentConversationOwnership"
dotnet test Rpom.slnx --no-restore
dotnet build Rpom.slnx --no-restore
git diff --check
```

Expected: zero failed tests; build exit 0.

- [ ] **Step 2: Run frontend full verification**

From `NextERP`:

```bash
npm run test:page-access
npm run test:ai-report-context
npm run test:top-order-staff
npx tsc --noEmit
npm run build
git diff --check
```

Expected: all exit 0.

- [ ] **Step 3: Verify prompt behavior end-to-end**

1. With no prompt versions, analyze a report and confirm only core/profile behavior; DB contains no
   seeded copy of system prompt.
2. Save global marker text, analyze Revenue, confirm trace contains global marker.
3. Save Top staff report marker, analyze Top staff, confirm both global then report marker.
4. Analyze Revenue again, confirm Top staff marker absent.
5. Update both prompts, follow up in old Top staff conversation, confirm old snapshots remain.
6. Start new Top staff conversation, confirm new prompt versions apply.
7. Open conversation history, confirm user bubble is display text and raw report JSON is hidden.
8. Confirm report analysis trace has zero tool calls; manual “Doanh thu hôm nay” still calls data tools.

- [ ] **Step 4: Update docs**

Document:

- Core prompt remains source-controlled and is never copied into editable fields.
- Custom prompts are supplemental, max 4.000 chars, global/report scoped and append-only.
- Roles allowed, API routes, report type list, composition order and snapshot behavior.
- Structured report context limits and no-tool behavior.

- [ ] **Step 5: Commit backend docs**

From `Rpom-backend`:

```bash
git add README.md CHANGES.md
git commit -m "docs(ai): document editable report prompts"
```

- [ ] **Step 6: Commit frontend docs**

From `NextERP`:

```bash
git add README.md CHANGES.md
git commit -m "docs(ai): document report prompt management"
```
