# Top nhân viên theo món Master-Detail UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay grid phẳng của tab Top nhân viên theo món bằng danh sách món master-detail, biểu đồ thanh top 3 và các nhãn đào tạo chéo tất định từ dữ liệu API hiện tại.

**Architecture:** Giữ `TopOrderStaffTab` làm container fetch/state, chuyển toàn bộ phép chuẩn hóa, phân loại, tìm kiếm và sắp xếp sang pure module có test. Hai presentational component độc lập render danh sách món và panel chi tiết bằng HTML/CSS/Tailwind; thanh ngang không phụ thuộc chart library để kiểm soát chính xác số lượng âm, 0 và accessibility.

**Tech Stack:** Next.js 16.2.7, React 19.2.4, TypeScript 5, Tailwind CSS 4, Node `assert`, `tsx`.

## Global Constraints

- Chỉ dùng payload hiện có từ `GET /api/reports/items/top-order-staff`; không đổi backend trong plan này.
- Không gọi dữ liệu này là đánh giá hiệu suất hoặc nhân viên giỏi/yếu; dùng “nhân viên có sản lượng cao nhất”.
- `MIN_SAMPLE_QUANTITY = 5`, `HIGH_CONCENTRATION_PERCENT = 80`, `BACKUP_PERCENT = 25`, `BROAD_DISTRIBUTION_PERCENT = 50`.
- Sản lượng 0 không nằm trong leaderboard; sản lượng âm nằm trong cảnh báo hoàn món.
- Không thêm dependency npm.
- Trước khi sửa React client component, đọc `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md` và `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` theo `AGENTS.md`.
- Mỗi task bắt đầu từ test fail, kết thúc bằng test pass và commit riêng.

---

## File Structure

- Create `components/reports/topOrderStaffInsights.ts` — model dẫn xuất, constants, item key, phân loại, search/sort/filter và chart rows.
- Create `components/reports/topOrderStaffInsights.test.ts` — boundary tests và selection tests bằng Node assert.
- Create `components/reports/TopOrderStaffItemList.tsx` — toolbar local và danh sách master có keyboard/ARIA.
- Create `components/reports/TopOrderStaffDetail.tsx` — thanh ngang, nhãn, cảnh báo hoàn món và nhận định tất định.
- Modify `components/reports/TopOrderStaffTab.tsx` — container state, selection lifecycle và responsive layout.
- Delete `components/reports/topOrderStaffRows.ts` — flatten helper không còn consumer.
- Delete `components/reports/topOrderStaffRows.test.ts` — test cũ được thay bởi insight tests.
- Modify `package.json` — giữ script `test:top-order-staff` nhưng trỏ sang test mới.
- Modify `README.md` — mô tả master-detail và quy tắc phân loại.
- Modify `CHANGES.md` — ghi thay đổi UX mà không đổi report formula.

### Task 1: Pure insight model và boundary rules

**Files:**
- Create: `components/reports/topOrderStaffInsights.test.ts`
- Create: `components/reports/topOrderStaffInsights.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `TopOrderStaffByItemRow`, `TopOrderStaffRank` từ `types/api/reports.ts`.
- Produces: `TopOrderStaffInsight`, `TopOrderStaffStatus`, `TopOrderStaffSort`, `TopOrderStaffFilter`, `itemInsightKey()`, `buildTopOrderStaffInsight()`, `selectTopOrderStaffInsights()`.

- [ ] **Step 1: Đọc hướng dẫn client component của Next.js 16**

Run:

```bash
sed -n '1,220p' node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md
sed -n '1,260p' node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md
```

Expected: hai file đọc được; không có thay đổi working tree.

- [ ] **Step 2: Viết test fail cho key, status và staff buckets**

Tạo `components/reports/topOrderStaffInsights.test.ts` với các case cụ thể:

```ts
import assert from "node:assert/strict";
import {
  buildTopOrderStaffInsight,
  itemInsightKey,
  selectTopOrderStaffInsights,
} from "./topOrderStaffInsights";
import type { TopOrderStaffByItemRow } from "@/types/api/reports";

const row = (
  itemId: number,
  itemCode: string,
  totalQuantity: number,
  staff: Array<[number, string, number, number]>,
): TopOrderStaffByItemRow => ({
  itemId,
  itemCode,
  itemName: itemCode === "MUC" ? "Mực chiên giòn" : "Chả giò rế",
  uomCode: "Đĩa",
  totalQuantity,
  topStaff: staff.map(([staffAccountId, staffName, quantity, percentage], index) => ({
    rank: index + 1,
    staffAccountId,
    staffName,
    quantity,
    percentageOfItemQuantity: percentage,
  })),
});

const concentrated = buildTopOrderStaffInsight(row(1, "MUC", 6, [
  [10, "An", 6, 100],
  [11, "Bình", 0, 0],
]));
assert.equal(concentrated.status, "HIGH_CONCENTRATION");
assert.deepEqual(concentrated.positiveStaff.map(x => x.staffName), ["An"]);
assert.equal(concentrated.hasBackup, false);

assert.equal(
  buildTopOrderStaffInsight(row(2, "CHA", 4, [[10, "An", 3, 75], [11, "Bình", 1, 25]])).status,
  "LOW_SAMPLE",
);
assert.equal(
  buildTopOrderStaffInsight(row(3, "CHA", 5, [[10, "An", 4, 80], [11, "Bình", 1, 20]])).status,
  "HIGH_CONCENTRATION",
);
assert.equal(
  buildTopOrderStaffInsight(row(4, "CHA", 5, [[10, "An", 2, 49.99], [11, "Bình", 2, 40]])).status,
  "BROAD_DISTRIBUTION",
);

const refund = buildTopOrderStaffInsight(row(5, "CHA", 4, [
  [10, "An", 5, 125],
  [11, "Bình", -1, -25],
]));
assert.equal(refund.status, "REFUND_REVIEW");
assert.deepEqual(refund.negativeStaff.map(x => x.staffName), ["Bình"]);
assert.equal(refund.hasBackup, false);

assert.notEqual(
  itemInsightKey(buildTopOrderStaffInsight(row(8, "A", 1, []))),
  itemInsightKey(buildTopOrderStaffInsight(row(8, "B", 1, []))),
);

const selected = selectTopOrderStaffInsights(
  [row(1, "MUC", 6, [[10, "An", 6, 100]]), row(2, "CHA", 4, [[11, "Bình", 4, 100]])],
  { query: "muc", sort: "QUANTITY_DESC", filter: "TRAINING" },
);
assert.deepEqual(selected.map(x => x.item.itemCode), ["MUC"]);
```

- [ ] **Step 3: Chạy test để xác nhận fail vì module chưa tồn tại**

Run: `npx tsx components/reports/topOrderStaffInsights.test.ts`

Expected: FAIL với `Cannot find module './topOrderStaffInsights'`.

- [ ] **Step 4: Viết model tối thiểu**

Tạo `components/reports/topOrderStaffInsights.ts` với public types/signatures sau:

```ts
import type { TopOrderStaffByItemRow, TopOrderStaffRank } from "@/types/api/reports";

export const MIN_SAMPLE_QUANTITY = 5;
export const HIGH_CONCENTRATION_PERCENT = 80;
export const BACKUP_PERCENT = 25;
export const BROAD_DISTRIBUTION_PERCENT = 50;

export type TopOrderStaffStatus =
  | "REFUND_REVIEW"
  | "NO_POSITIVE_QUANTITY"
  | "LOW_SAMPLE"
  | "HIGH_CONCENTRATION"
  | "BROAD_DISTRIBUTION"
  | "MODERATE_DISTRIBUTION";
export type TopOrderStaffSort = "QUANTITY_DESC" | "CONCENTRATION_DESC" | "NAME_ASC";
export type TopOrderStaffFilter = "ALL" | "TRAINING" | "LOW_SAMPLE" | "REFUND_REVIEW";

export interface TopOrderStaffInsight {
  item: TopOrderStaffByItemRow;
  positiveStaff: TopOrderStaffRank[];
  negativeStaff: TopOrderStaffRank[];
  top1Percentage: number | null;
  status: TopOrderStaffStatus;
  hasBackup: boolean;
  message: string;
}

export function buildTopOrderStaffInsight(item: TopOrderStaffByItemRow): TopOrderStaffInsight;
export function itemInsightKey(insight: TopOrderStaffInsight): string;
export function selectTopOrderStaffInsights(
  items: readonly TopOrderStaffByItemRow[],
  options: { query: string; sort: TopOrderStaffSort; filter: TopOrderStaffFilter },
): TopOrderStaffInsight[];
```

Implementation rules:

```ts
const positiveStaff = item.topStaff.filter(x => x.quantity > 0).slice(0, 3);
const negativeStaff = item.topStaff.filter(x => x.quantity < 0);
const top1Percentage = positiveStaff[0]?.percentageOfItemQuantity ?? null;
```

Status priority is exactly `REFUND_REVIEW` → `NO_POSITIVE_QUANTITY` → `LOW_SAMPLE` →
`HIGH_CONCENTRATION` → `BROAD_DISTRIBUTION` → `MODERATE_DISTRIBUTION`. `hasBackup` is true only when
`positiveStaff[1]?.percentageOfItemQuantity >= BACKUP_PERCENT`. Search uses
`normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("vi")` for both query and
`itemCode + itemName`; sau khi bỏ combining marks phải đổi riêng `đ/Đ` thành `d/D`. Vietnamese name
sort uses `localeCompare(..., "vi")`.

- [ ] **Step 5: Chạy test và type-check**

Run:

```bash
npx tsx components/reports/topOrderStaffInsights.test.ts
npx tsc --noEmit
```

Expected: test exits 0; TypeScript exits 0.

- [ ] **Step 6: Chuyển npm script sang test mới và chạy lại**

Đổi `package.json`:

```json
"test:top-order-staff": "tsx components/reports/topOrderStaffInsights.test.ts"
```

Run: `npm run test:top-order-staff`

Expected: exit 0.

- [ ] **Step 7: Commit insight model**

```bash
git add package.json components/reports/topOrderStaffInsights.ts components/reports/topOrderStaffInsights.test.ts
git commit -m "feat(reports): derive top order staff insights"
```

### Task 2: Master item list và local controls

**Files:**
- Modify: `components/reports/topOrderStaffInsights.test.ts`
- Modify: `components/reports/topOrderStaffInsights.ts`
- Create: `components/reports/TopOrderStaffItemList.tsx`

**Interfaces:**
- Consumes: `TopOrderStaffInsight`, sort/filter types và `itemInsightKey()` từ Task 1.
- Produces: `TopOrderStaffItemList(props)` và `nextSelectedInsightKey()` cho container dùng khi result set đổi.

- [ ] **Step 1: Viết failing tests cho selection reset**

Thêm vào test file:

```ts
import { nextSelectedInsightKey } from "./topOrderStaffInsights";

const visible = [
  buildTopOrderStaffInsight(row(1, "MUC", 6, [[10, "An", 6, 100]])),
  buildTopOrderStaffInsight(row(2, "CHA", 4, [[11, "Bình", 4, 100]])),
];
assert.equal(nextSelectedInsightKey(visible, null), itemInsightKey(visible[0]));
assert.equal(nextSelectedInsightKey(visible, itemInsightKey(visible[1])), itemInsightKey(visible[1]));
assert.equal(nextSelectedInsightKey(visible.slice(0, 1), itemInsightKey(visible[1])), itemInsightKey(visible[0]));
assert.equal(nextSelectedInsightKey([], itemInsightKey(visible[0])), null);
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `npm run test:top-order-staff`

Expected: FAIL vì `nextSelectedInsightKey` chưa export.

- [ ] **Step 3: Implement selection helper và list component**

Thêm helper:

```ts
export function nextSelectedInsightKey(
  visible: readonly TopOrderStaffInsight[],
  current: string | null,
): string | null {
  if (current && visible.some(x => itemInsightKey(x) === current)) return current;
  return visible[0] ? itemInsightKey(visible[0]) : null;
}
```

Tạo `TopOrderStaffItemList.tsx` với props chính xác:

```ts
interface Props {
  items: readonly TopOrderStaffInsight[];
  selectedKey: string | null;
  query: string;
  sort: TopOrderStaffSort;
  filter: TopOrderStaffFilter;
  onQueryChange(value: string): void;
  onSortChange(value: TopOrderStaffSort): void;
  onFilterChange(value: TopOrderStaffFilter): void;
  onSelect(key: string): void;
}
```

Render native search input, sort select và four filter buttons. Mỗi item là `<button>` với
`aria-pressed`, tên món, mã, `totalQuantity/uomCode`, top 1 và status label. Dùng mapping copy cố định:

```ts
const STATUS_LABEL = {
  REFUND_REVIEW: "Cần kiểm tra hoàn món",
  NO_POSITIVE_QUANTITY: "Không có sản lượng dương",
  LOW_SAMPLE: "Ít dữ liệu",
  HIGH_CONCENTRATION: "Tập trung cao",
  BROAD_DISTRIBUTION: "Phân bổ rộng",
  MODERATE_DISTRIBUTION: "Phân bổ vừa",
} as const;
```

Không render top 2/top 3 ở list. Arrow Up/Down trên list item gọi `onSelect` với sibling trước/sau và
focus button tương ứng bằng `data-item-key`.

- [ ] **Step 4: Chạy unit test và build**

Run:

```bash
npm run test:top-order-staff
npm run build
```

Expected: cả hai exit 0.

- [ ] **Step 5: Commit master list**

```bash
git add components/reports/topOrderStaffInsights.ts components/reports/topOrderStaffInsights.test.ts components/reports/TopOrderStaffItemList.tsx
git commit -m "feat(reports): add top order staff item list"
```

### Task 3: Detail panel, bar chart và refund warning

**Files:**
- Modify: `components/reports/topOrderStaffInsights.test.ts`
- Modify: `components/reports/topOrderStaffInsights.ts`
- Create: `components/reports/TopOrderStaffDetail.tsx`

**Interfaces:**
- Consumes: một `TopOrderStaffInsight | null`.
- Produces: `TopOrderStaffBarRow`, `buildTopOrderStaffBarRows()` và `TopOrderStaffDetail({ insight })`.

- [ ] **Step 1: Viết failing test cho bar width**

Thêm:

```ts
import { buildTopOrderStaffBarRows } from "./topOrderStaffInsights";

const bars = buildTopOrderStaffBarRows(buildTopOrderStaffInsight(row(1, "CHA", 4, [
  [10, "An", 3, 75],
  [11, "Bình", 1, 25],
  [12, "Chi", 0, 0],
])));
assert.deepEqual(bars.map(x => [x.staffName, x.quantity, x.percentage, x.widthPercent]), [
  ["An", 3, 75, 100],
  ["Bình", 1, 25, 33.33],
]);
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `npm run test:top-order-staff`

Expected: FAIL vì `buildTopOrderStaffBarRows` chưa tồn tại.

- [ ] **Step 3: Implement bar rows và detail component**

Public type:

```ts
export interface TopOrderStaffBarRow {
  staffAccountId: number;
  staffName: string;
  quantity: number;
  percentage: number;
  widthPercent: number;
}
```

`widthPercent` bằng `round(quantity / maxPositiveQuantity * 100, 2)`. Nếu không có positive staff,
return `[]`; không chia cho 0.

`TopOrderStaffDetail` render:

- Empty selection: “Chọn một món để xem chi tiết”.
- Header item + total.
- Tối đa ba row gồm tên, track, blue fill và label `quantity.toFixed(2) · percentage.toFixed(1)%`.
- `role="img"` và `aria-label` mô tả toàn chart; mỗi row vẫn là text thật.
- `negativeStaff` trong box đỏ với quantity/percentage.
- `insight.message` trong box “Nhận định từ dữ liệu”.
- Chú thích cố định: sản lượng chưa chuẩn hóa theo số ca/giờ.

- [ ] **Step 4: Chạy test và build**

Run:

```bash
npm run test:top-order-staff
npm run build
```

Expected: cả hai exit 0.

- [ ] **Step 5: Commit detail panel**

```bash
git add components/reports/topOrderStaffInsights.ts components/reports/topOrderStaffInsights.test.ts components/reports/TopOrderStaffDetail.tsx
git commit -m "feat(reports): visualize top staff by item"
```

### Task 4: Integrate master-detail vào report tab

**Files:**
- Modify: `components/reports/TopOrderStaffTab.tsx`
- Delete: `components/reports/topOrderStaffRows.ts`
- Delete: `components/reports/topOrderStaffRows.test.ts`

**Interfaces:**
- Consumes: Task 1–3 modules/components và `AnalyzeButton` hiện tại.
- Produces: tab hoàn chỉnh vẫn giữ props `{ filters, onLoading, onError }` để `WinReports` không đổi.

- [ ] **Step 1: Chạy baseline và lưu bằng chứng**

Run:

```bash
npm run test:top-order-staff
npm run build
```

Expected: cả hai exit 0 trước integration.

- [ ] **Step 2: Thay grid bằng controlled master-detail state**

Trong `TopOrderStaffTab`, thêm state:

```ts
const [query, setQuery] = useState("");
const [sort, setSort] = useState<TopOrderStaffSort>("QUANTITY_DESC");
const [filter, setFilter] = useState<TopOrderStaffFilter>("ALL");
const [selectedKey, setSelectedKey] = useState<string | null>(null);
```

Derive:

```ts
const insights = useMemo(
  () => selectTopOrderStaffInsights(data, { query, sort, filter }),
  [data, query, sort, filter],
);
const resolvedKey = nextSelectedInsightKey(insights, selectedKey);
const selected = insights.find(x => itemInsightKey(x) === resolvedKey) ?? null;
```

Dùng effect chỉ để cập nhật `selectedKey` khi `resolvedKey !== selectedKey`. Render:

```tsx
<div className="grid min-h-[420px] flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(300px,2fr)_minmax(420px,3fr)]">
  <TopOrderStaffItemList ... />
  <TopOrderStaffDetail insight={selected} />
</div>
```

Giữ `AnalyzeButton reportName="Top nhân viên theo món" data={data}` chưa đổi contract trong plan UI.
Xóa toàn bộ Syncfusion Grid imports và flatten call.

- [ ] **Step 3: Xóa flatten helper/test cũ và xác nhận không còn import**

Run:

```bash
rg -n "flattenTopOrderStaffRows|topOrderStaffRows" . -g '!node_modules'
```

Expected trước delete: chỉ còn files cũ; sau delete: không có output.

- [ ] **Step 4: Chạy verification**

Run:

```bash
npm run test:top-order-staff
npx tsc --noEmit
npm run build
git diff --check
```

Expected: mọi command exit 0.

- [ ] **Step 5: Kiểm tra thủ công ở report window**

Run: `npm run dev`

Verify tại tab **Top nhân viên theo món**:

- Mỗi món chỉ có một dòng ở list.
- Search “mực” lọc đúng món không phân biệt dấu/hoa thường.
- Mực tổng 6/top1 100% có nhãn `Tập trung cao`.
- Chả giò tổng 4/top1 75% có nhãn `Ít dữ liệu`.
- Filter `Gợi ý đào tạo chéo` chỉ giữ item high concentration đủ sample.
- Chọn item đổi detail; resize hẹp chuyển sang stack.
- Staff quantity 0 biến mất; negative nằm trong warning.

- [ ] **Step 6: Commit integration**

```bash
git add components/reports/TopOrderStaffTab.tsx components/reports/topOrderStaffRows.ts components/reports/topOrderStaffRows.test.ts
git commit -m "feat(reports): replace staff grid with master detail"
```

### Task 5: Documentation và final verification

**Files:**
- Modify: `README.md`
- Modify: `CHANGES.md`

**Interfaces:**
- Consumes: hành vi đã verify trong Task 4.
- Produces: tài liệu vận hành/test đúng với UI mới.

- [ ] **Step 1: Cập nhật README**

Thay mô tả “flatten cho Syncfusion Grid” bằng:

```md
UI giữ response nested và dựng master-detail theo món. Danh sách bên trái hỗ trợ search/sort/filter;
panel bên phải hiển thị tối đa ba nhân viên sản lượng dương bằng thanh ngang. Dòng 0 bị bỏ khỏi
leaderboard, dòng âm nằm trong cảnh báo hoàn món. Ngưỡng gợi ý đào tạo chéo là tổng từ 5 và top 1 từ
80%; dữ liệu dưới 5 chỉ gắn “Ít dữ liệu”.
```

- [ ] **Step 2: Cập nhật CHANGES**

Thêm entry ngày 2026-08-26 nêu rõ thay đổi chỉ là presentation/derived insight; report formula và API
không đổi.

- [ ] **Step 3: Chạy full frontend verification**

Run:

```bash
npm run test:top-order-staff
npx tsc --noEmit
npm run build
git diff --check
```

Expected: mọi command exit 0, test không có assertion failure, Next build thành công.

- [ ] **Step 4: Commit docs**

```bash
git add README.md CHANGES.md
git commit -m "docs: describe top order staff master detail"
```
