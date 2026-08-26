# Top nhân viên theo món: master-detail và ngữ cảnh phân tích AI

Ngày: 2026-08-26

Trạng thái: Chờ người dùng review

Phạm vi: `NextERP` và contract phân tích báo cáo tương ứng trong `Rpom-backend`

## 1. Bối cảnh

Tab **Top nhân viên theo món** hiện flatten mỗi món thành tối đa ba dòng nhân viên rồi hiển thị bằng
Syncfusion Grid. Cách này lặp mã, tên, đơn vị tính và tổng sản lượng; người quản lý phải tự ghép các
dòng để biết ai có nhiều kinh nghiệm với một món. Dòng có sản lượng bằng 0 vẫn có thể chiếm chỗ trong
leaderboard, trong khi dữ liệu hoàn món âm làm tỷ lệ không phù hợp với biểu đồ tỷ trọng thông thường.

Nút **Phân tích bằng AI** hiện dùng cùng một user-prompt cho mọi báo cáo. Frontend ghép tên báo cáo và
JSON, cắt chuỗi ở 12.000 ký tự, rồi gửi qua `/api/ai/chat`. Backend thêm một system prompt chung. Vì
không có profile riêng cho báo cáo này, AI không được đảm bảo biết rằng sản lượng là net signed, top 3
có thể không cộng thành 100%, và số lượng không phải thước đo hiệu suất đã chuẩn hóa theo số ca.

## 2. Mục tiêu người dùng

Người dùng chính là quản lý nhà hàng. Job-to-be-done:

> Khi xem từng món, tôi muốn biết nhân viên nào đã tạo nhiều order nhất và món nào đang tập trung vào
> một người, để cân nhắc phân công hoặc đào tạo chéo.

Màn hình phải giúp người quản lý trả lời nhanh:

1. Ai có sản lượng cao nhất với món đang chọn?
2. Có nhân viên thứ hai đủ kinh nghiệm để thay thế không?
3. Món bán đủ nhiều nào đang tập trung quá cao vào một người?
4. Dữ liệu nào quá ít hoặc bị ảnh hưởng bởi hoàn món nên chưa thể kết luận?

## 3. Phạm vi và phi mục tiêu

### Trong phạm vi

- Thay grid phẳng bằng bố cục master-detail, mỗi món chỉ xuất hiện một lần.
- Hiển thị top 3 nhân viên bằng thanh ngang dựa trên sản lượng.
- Tìm kiếm, sắp xếp và lọc các món cần xem xét đào tạo chéo.
- Phân loại dữ liệu bằng các quy tắc tất định từ payload hiện có.
- Gửi `reportType`, bộ lọc, món đang chọn và dữ liệu nested cho backend khi phân tích AI.
- Giữ system prompt chung ở backend và thêm profile server-owned riêng cho loại báo cáo này.
- Thêm cửa sổ ERP để Chủ nhà hàng/Quản trị hệ thống chỉnh một prompt bổ sung chung cho mọi báo cáo và
  một prompt bổ sung riêng cho từng loại báo cáo.
- Lưu lịch sử phiên bản prompt, áp dụng ngay và cho phép khôi phục bằng cách tạo phiên bản mới.
- Loại bỏ việc frontend cắt JSON giữa chừng đối với luồng phân tích mới.

### Ngoài phạm vi

- Không bổ sung dữ liệu số ca, số giờ làm hoặc số cơ hội bán.
- Không chấm điểm, xếp loại giỏi/yếu hay dùng báo cáo làm KPI thưởng phạt.
- Không thay đổi công thức report hoặc endpoint lấy dữ liệu top nhân viên.
- Mọi nút phân tích báo cáo hiện có sẽ gửi `reportType` ổn định để prompt riêng hoạt động, nhưng chỉ
  `TOP_ORDER_STAFF_BY_ITEM` nhận fixed semantic profile chuyên biệt trong thay đổi này. Các report type
  khác dùng core prompt, prompt tùy chỉnh và payload hiện có; profile nghiệp vụ có thể bổ sung dần.
- Không dùng AI để tự quyết định ngưỡng phân loại trên giao diện.
- Không cho người dùng chỉnh system prompt cốt lõi, quy tắc bảo mật, tool routing hoặc semantics cố
  định của report profile.
- Không xây form mục tiêu/checkbox trọng tâm; phần tùy chỉnh chỉ là prompt text đơn giản.

## 4. Ngôn ngữ nghiệp vụ

- Tên tab có thể giữ **Top nhân viên theo món** để tránh thay đổi điều hướng.
- Nội dung mô tả phải dùng **nhân viên có sản lượng cao nhất**, không dùng **nhân viên bán tốt nhất**.
- Nhãn hành động là **Gợi ý đào tạo chéo**, không phải kết luận bắt buộc.
- Luôn hiển thị chú thích rằng dữ liệu chưa chuẩn hóa theo số ca/giờ và chỉ phản ánh sản lượng order.

## 5. Thiết kế giao diện

### 5.1. Bố cục

Giữ `ReportFilterBar` chung phía trên. Nội dung tab bên dưới chia hai vùng:

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Tìm món...  Sắp xếp: Sản lượng cao ↓  [Tất cả] [Gợi ý đào tạo chéo] │
├──────────────────────────────┬───────────────────────────────────────┤
│ DANH SÁCH MÓN                │ CHI TIẾT MÓN ĐANG CHỌN               │
│                              │                                       │
│ Chả giò rế          4        │ Sản lượng thuần: 4                   │
│ Top 1: 75% · Ít dữ liệu      │ Lê Thảo Nguyên  █████████  3 · 75%  │
│                              │ Nguyễn H. Nam   ███          1 · 25% │
│ Mực chiên giòn      6        │                                       │
│ Top 1: 100% · Tập trung cao  │ Nhận định tất định                   │
│                              │ ...                                   │
└──────────────────────────────┴───────────────────────────────────────┘
```

- Desktop: vùng danh sách chiếm khoảng 40%, vùng chi tiết 60%.
- Cửa sổ hẹp: hai vùng xếp dọc, danh sách ở trên và chi tiết ở dưới.
- Cả hai vùng có scroll riêng khi cần; không dùng paging cho danh sách món.
- Dòng đầu tiên sau khi tìm/lọc/sắp xếp được chọn mặc định.
- Nếu món đang chọn bị loại bởi filter, tự chọn dòng đầu tiên còn lại.

### 5.2. Thanh điều khiển trong tab

- Ô tìm kiếm local theo mã hoặc tên món, không gọi lại API.
- Sắp xếp:
  - `Sản lượng cao` (mặc định).
  - `Mức tập trung cao` theo tỷ lệ top 1 giảm dần.
  - `Tên món` tăng dần theo locale tiếng Việt.
- Quick filter:
  - `Tất cả`.
  - `Gợi ý đào tạo chéo`.
  - `Ít dữ liệu`.
  - `Cần kiểm tra hoàn món`.

### 5.3. Danh sách món

Mỗi item hiển thị:

- Mã và tên món.
- Sản lượng thuần kèm đơn vị tính.
- Tên top 1 nếu có sản lượng dương.
- Tỷ lệ top 1.
- Nhãn phân loại chính và nhãn phụ **Có người thay thế** nếu thỏa điều kiện.

Không lặp top 2/top 3 trong vùng danh sách để giữ khả năng quét nhanh.

### 5.4. Chi tiết món và biểu đồ

Header chi tiết hiển thị mã, tên, đơn vị tính, sản lượng thuần và các nhãn phân loại. Biểu đồ là
horizontal bar chart, tối đa ba nhân viên có `quantity > 0`:

- Chiều dài thanh dựa trên `quantity`, không dựa trên phần trăm.
- Data label hiển thị cả số lượng và phần trăm do API trả về.
- Không dùng stacked/100% stacked chart vì top 3 có thể không đủ 100% và dữ liệu có refund âm.
- Nhân viên có `quantity == 0` không xuất hiện trong leaderboard.
- Nhân viên có `quantity < 0` xuất hiện trong khối cảnh báo màu đỏ bên dưới, không nằm trong thanh
  thành tích dương.
- Chart luôn có danh sách text tương ứng để nội dung vẫn đọc được bằng bàn phím/screen reader.

Bên dưới chart là nhận định tất định, không cần AI, ví dụ:

- “Một nhân viên chiếm 100% sản lượng; có thể xem xét đào tạo thêm người thay thế.”
- “Dữ liệu hiện có quá ít để đưa ra gợi ý đào tạo.”
- “Có sản lượng hoàn món âm; cần kiểm tra dữ liệu trước khi dùng để phân công.”

## 6. Quy tắc phân loại

Các quy tắc chạy ở frontend bằng một pure function và dùng đúng cùng định nghĩa trong report profile
backend. Backend không ghi đè kết quả UI bằng phán đoán AI.

### 6.1. Tiền xử lý

- `positiveStaff`: các dòng `quantity > 0`, giữ thứ tự rank từ API.
- `negativeStaff`: các dòng `quantity < 0`.
- Dòng bằng 0 bị loại khỏi leaderboard.
- `top1Pct` là `percentageOfItemQuantity` của nhân viên dương có rank cao nhất; nếu không có thì null.
- Không tự tính lại phần trăm từ dữ liệu top 3.

### 6.2. Trạng thái chính theo thứ tự ưu tiên

1. **Cần kiểm tra hoàn món** khi `totalQuantity <= 0` hoặc có bất kỳ `negativeStaff`.
2. **Ít dữ liệu** khi `0 < totalQuantity < 5`.
3. **Tập trung cao** khi `totalQuantity >= 5` và `top1Pct >= 80`.
4. **Phân bổ rộng** khi `totalQuantity >= 5` và `top1Pct < 50`.
5. **Phân bổ vừa** cho trường hợp hợp lệ còn lại.

Nếu không có nhân viên dương, dùng trạng thái **Không có sản lượng dương** và không đưa gợi ý đào tạo.

### 6.3. Nhãn phụ và quick filter

- **Có người thay thế** khi nhân viên dương thứ hai có tỷ lệ `>= 25%`.
- Quick filter **Gợi ý đào tạo chéo** chỉ lấy trạng thái **Tập trung cao**.
- Nhãn **Có người thay thế** có thể cùng tồn tại với trạng thái chính; đây là dữ kiện bổ sung, không
  thay đổi trạng thái chính.

Ngưỡng 5 và 80% là quy tắc sản phẩm hiện tại, không phải kết luận thống kê. Chúng phải được đặt trong
constant có tên rõ và được kiểm thử để sau này thay đổi mà không sửa rải rác.

## 7. Luồng phân tích AI

### 7.1. Phân chia trách nhiệm

Frontend gửi dữ liệu; backend sở hữu mọi instruction đáng tin cậy:

```text
TopOrderStaffTab
  → AnalyzeButton(reportContext)
  → POST /api/ai/chat
  → backend validate reportType + payload
  → global system prompt + server-owned report profile
  → Azure OpenAI
```

Không đặt system prompt riêng trong frontend. Nội dung frontend gửi luôn được coi là dữ liệu/user
content và không có quyền thay đổi policy của assistant.

### 7.2. Contract tương thích ngược

Mở rộng request hiện tại bằng field optional `reportContext`. Manual chat và client cũ không gửi field
này vẫn tiếp tục dùng `message` như cũ; mọi `AnalyzeButton` hiện có trong NextERP chuyển sang gửi
`reportType`, filters phù hợp và data của tab.

```json
{
  "conversationId": null,
  "message": "Phân tích báo cáo top nhân viên theo món",
  "reportContext": {
    "reportType": "TOP_ORDER_STAFF_BY_ITEM",
    "filters": {
      "fromDate": "2026-08-01",
      "toDate": "2026-08-26",
      "counterId": null,
      "areaId": null
    },
    "selectedItemId": 123,
    "data": []
  }
}
```

- `reportType` là enum/allowlist do backend định nghĩa, không phải chuỗi prompt tự do.
- `data` giữ nguyên nested response của report, không gửi rows đã flatten.
- `filters` chỉ gồm filter mà tab thực sự áp dụng.
- `selectedItemId` giúp AI ưu tiên món người dùng đang xem nhưng vẫn phân tích toàn bộ dataset.

### 7.3. Report profile phía backend

Profile `TOP_ORDER_STAFF_BY_ITEM` bổ sung vào system context các sự thật:

- Chỉ gồm ticket đã đóng; dòng cancelled bị loại.
- Sản lượng là net signed và refund có thể âm.
- Top 3 có thể không cộng thành 100% do còn nhân viên khác hoặc refund.
- Sản lượng cao chỉ phản ánh khối lượng trong kỳ lọc, không chứng minh hiệu suất hay kỹ năng.
- Áp dụng đúng các trạng thái ở mục 6; không kết luận đào tạo khi dữ liệu ít hoặc có refund bất thường.
- Trả lời theo cấu trúc: tổng quan, món gợi ý đào tạo chéo, người thay thế, dữ liệu cần kiểm tra và hành
  động cụ thể.
- Không tạo thêm visualization cho lượt bấm này vì màn report đã có chart chuyên dụng; trả narrative
  ngắn gọn và cho phép người dùng hỏi tiếp trong conversation mới vừa tạo.

Global system prompt vẫn chứa vai trò, ngôn ngữ, bảo mật, tool routing và quy tắc chung. Report profile
chỉ bổ sung semantics của payload, không tạo một assistant khác. Ở lượt có `reportContext`, backend
không cung cấp data tools hoặc `presentReport` cho model; dữ liệu đã được gửi sẵn và UI đã có chart.
Điều này thực thi quy tắc “không gọi tool” bằng code thay vì chỉ trông chờ model làm theo instruction.

Khi phân tích report, backend ghép context theo thứ tự:

```text
system prompt cốt lõi
→ report profile cố định
→ prompt chung đang active
→ prompt riêng của reportType đang active
→ report data của conversation
```

Prompt chỉnh từ UI được bọc rõ là **hướng dẫn bổ sung của chủ nhà hàng**. Nó không được thay đổi định
nghĩa dữ liệu, quyền truy cập, bảo mật hoặc các quy tắc cứng đứng trước. Prompt chung chỉ áp dụng cho
phân tích báo cáo, không tự động áp dụng cho manual chat hoặc pipeline gợi ý khóa món.

### 7.4. Giới hạn payload

- Frontend không stringify/cắt JSON trước khi gửi `reportContext`.
- Backend validate schema, số lượng phần tử và request size.
- Khi payload vượt budget dành cho model, backend chỉ cắt theo **record hoàn chỉnh**, đồng thời thêm
  `isTruncated`, `totalItems` và `includedItems` vào context.
- AI phải nói rõ phạm vi bị rút gọn và không suy tổng toàn bộ từ subset.
- Không bao giờ cắt giữa chuỗi JSON như luồng 12.000 ký tự hiện tại.
- Giá trị text trong payload (tên món, tên nhân viên) là dữ liệu không đáng tin cậy: giới hạn độ dài,
  serialize bằng serializer chuẩn và không diễn giải chúng như instruction.

### 7.5. Lịch sử conversation

Report context phải còn tồn tại cho câu hỏi follow-up nhưng không được hiện thành blob JSON khi mở lại
conversation:

- `AiMessage.Content` tiếp tục lưu câu người dùng nhìn thấy, ví dụ “Phân tích báo cáo Top nhân viên
  theo món”. Title cũng lấy từ nội dung này.
- Thêm nullable `ReportContextJson` cho user message khởi tạo report analysis. Field này lưu payload đã
  validate/normalize và không được trả về bởi `GetConversation`.
- Khi replay lịch sử cho model, `AgentService` ghép lại `Content` với report profile và
  `ReportContextJson`; khi trả lịch sử cho UI chỉ trả `Content`.
- Context vẫn thuộc conversation owner và tuân theo retention/audit policy hiện tại; thay đổi này chỉ
  tách model context khỏi display content, không mở thêm endpoint đọc raw payload.

### 7.6. Snapshot prompt

- Khi tạo conversation phân tích report, backend chụp nội dung/version của prompt chung và prompt
  riêng đang active vào model context của conversation.
- Lưu prompt mới có hiệu lực ngay với conversation mới. Conversation đang tồn tại tiếp tục dùng
  snapshot cũ để các câu follow-up không đổi hành vi giữa chừng.
- Bấm **Phân tích bằng AI** vốn tạo conversation mới, nên luôn nhận version mới nhất tại thời điểm bấm.

## 8. Cửa sổ quản lý prompt phân tích

### 8.1. Vị trí và quyền

- Tạo cửa sổ desktop **Bối cảnh phân tích AI** trong nhóm Hệ thống của NextERP.
- Chỉ role `OWNER` (Chủ nhà hàng) và `ADMIN_VENDOR` (Quản trị hệ thống) nhìn thấy và gọi được API ghi,
  đọc lịch sử hoặc khôi phục.
- Backend kiểm tra role ở endpoint/handler; ẩn cửa sổ ở frontend chỉ là UX, không phải lớp bảo mật.
- Manager và custom role không được cấp quyền chỉnh prompt qua permission picker.

### 8.2. Giao diện chính

Cửa sổ có hai tab đơn giản:

1. **Prompt chung**
   - Một textarea tối đa 4.000 ký tự.
   - Nội dung áp dụng cho mọi lượt phân tích báo cáo.
   - Nút **Lưu và áp dụng**.
2. **Theo báo cáo**
   - Dropdown chọn `reportType` từ allowlist do backend trả về.
   - Một textarea **Prompt bổ sung** tối đa 4.000 ký tự.
   - Nút **Lưu và áp dụng**.

Không có form mục tiêu, checkbox trọng tâm, risk tolerance hoặc prompt builder. Chuỗi rỗng là hợp lệ và
được hiểu là xóa tùy chỉnh đang active cho scope đó. UI hiển thị người sửa, thời gian và số version
active gần nhất nhưng không hiển thị system prompt cốt lõi đã ghép.

Khi chưa từng lưu version, hai textarea mặc định rỗng. Seeder không copy system prompt cốt lõi vào
prompt chung hoặc prompt theo báo cáo; custom prompt chỉ tồn tại sau khi Owner/Admin chủ động lưu.

### 8.3. Report type allowlist

Backend là source of truth cho mã và nhãn report. Allowlist ban đầu bao phủ các tab đang có nút phân
tích AI:

- `REVENUE_SUMMARY` — Báo cáo doanh thu tổng thể.
- `REVENUE` — Doanh thu.
- `TICKET_LIST` — Danh sách phiếu.
- `ITEM_SALES` — Bán hàng.
- `CATEGORY` — Danh mục.
- `ITEM` — Món hàng.
- `TOP_ORDER_STAFF_BY_ITEM` — Top nhân viên theo món.
- `TOP_SELLERS` — Top bán chạy.
- `SHIFT` — Ca làm việc.
- `INGREDIENT` — Nguyên liệu.
- `STOCK_ALERT` — Tồn kho.

Frontend không tự duy trì một danh sách prompt scope thứ hai. API trả code + nhãn để dropdown render;
`AnalyzeButton` gửi code ổn định thay cho việc dùng tên hiển thị làm định danh.

### 8.4. Version và khôi phục

- Mỗi lần lưu tạo một version append-only mới cho scope `GLOBAL` hoặc `(REPORT, reportType)` và đánh
  dấu version đó active. Không update nội dung version cũ.
- Lịch sử mở bằng action phụ **Xem lịch sử**, hiển thị version, nội dung, người sửa, thời gian và nguồn
  khôi phục nếu có.
- **Khôi phục** không tái kích hoạt row cũ; nó copy nội dung cũ thành version mới và áp dụng ngay.
- Tất cả save/restore có audit actor và timestamp. Không có xóa version từ UI.

### 8.5. Data model và API khái niệm

Tạo aggregate riêng cho prompt phân tích; không tái sử dụng `AiRestaurantContext` vì entity hiện tại
thuộc pipeline lock suggestion và có semantics/permission khác.

Mỗi version cần ít nhất: `Id`, `Scope`, nullable `ReportType`, `Content`, `VersionNumber`, `IsActive`,
nullable `RestoredFromId`, `CreatedByStaffId`, `CreatedAt`.

API cần cung cấp:

- Lấy catalog report type và version active của prompt chung/từng report.
- Lưu prompt chung hoặc prompt theo report.
- Lấy lịch sử theo scope/report type.
- Khôi phục một version lịch sử.

Validation: allowlist scope/report type, content tối đa 4.000 ký tự, version restore phải cùng scope,
và thao tác chuyển active phải atomic để mỗi scope chỉ có một version active.

## 9. Trạng thái và lỗi

- Loading/error tiếp tục đi qua `WinReports` như hiện tại.
- Data rỗng: hiển thị empty state và disable nút AI.
- Search/filter không có kết quả: empty state trong danh sách, panel chi tiết bỏ chọn.
- Chart không có nhân viên dương: giải thích lý do thay cho chart trống.
- Report context sai schema hoặc report type lạ: backend trả validation error, không fallback sang việc
  nhét payload vào prompt tự do.
- AI không phản hồi: giữ dữ liệu và lựa chọn hiện tại, hiển thị lỗi trong dock để người dùng thử lại.
- Save prompt lỗi: giữ nguyên textarea chưa lưu và version active cũ; không optimistic update.
- Restore lỗi hoặc version không cùng scope: không thay đổi active version và hiển thị lỗi cụ thể.

## 10. Cấu trúc component dự kiến

- `TopOrderStaffTab`: fetch data, giữ search/sort/filter/selection và điều phối layout.
- `topOrderStaffInsights`: pure functions chuẩn hóa staff, phân loại, search/sort/filter và tạo nhận định.
- `TopOrderStaffItemList`: danh sách master và điều khiển keyboard selection.
- `TopOrderStaffDetail`: header, chart, cảnh báo refund và nhận định.
- `AnalyzeButton`/AI client: nhận typed optional `reportContext`, không tự tạo report-specific prompt.
- Backend report profile registry: resolve allowlisted `reportType` thành schema validator và system
  context riêng.
- `AiMessage`: nullable `ReportContextJson` cho context dùng khi model replay; API lịch sử không trả
  field này cho UI.
- `WinAiAnalysisPrompt`: hai textarea chính, dropdown report type và action mở lịch sử.
- AI prompt context API client/types: catalog, active version, save, history và restore.
- Backend prompt version aggregate/repository handlers: append version, đổi active atomic và resolve
  snapshot khi bắt đầu report conversation.

Các component không phụ thuộc vào nội bộ của nhau ngoài props/types rõ ràng. Pure functions không phụ
thuộc React hoặc Syncfusion để kiểm thử dễ dàng.

## 11. Kiểm thử

### Frontend

- Pure-function tests cho mọi boundary: tổng -1/0/4.99/5; top 1 49.99/50/79.99/80; top 2 24.99/25;
  staff âm/0; không có staff; top 3 không đủ 100%.
- Tests cho tìm kiếm không phân biệt hoa/thường, từng kiểu sort và selection reset sau filter.
- Component tests hoặc test harness xác nhận thanh chỉ render staff dương, cảnh báo render staff âm và
  AI request giữ nested data + filters + selected item.
- Pure/client tests xác nhận prompt window dùng report catalog backend, save chuỗi rỗng được phép và
  role không hợp lệ không thấy desktop entry.
- TypeScript build và test hiện có của report tiếp tục pass.

### Backend

- Contract tests cho manual chat cũ không có `reportContext`.
- Validation tests cho report type lạ, payload sai schema và payload quá lớn.
- Prompt/profile tests xác nhận context chứa semantics net/refund/top-3 và không nhận instruction tùy ý
  từ client.
- Agent tests xác nhận report analysis không được cung cấp data tools/presentation tool, vẫn lưu
  conversation đúng owner và replay được context cho follow-up.
- Conversation tests xác nhận title/bubble chỉ chứa display message và endpoint lịch sử không trả raw
  `ReportContextJson`.
- Prompt version tests xác nhận append-only, chỉ một active version mỗi scope, restore tạo version mới,
  version number tăng tuần tự và thao tác đồng thời không tạo hai active rows.
- Authorization tests xác nhận chỉ `OWNER`/`ADMIN_VENDOR` đọc màn quản trị, lưu, xem history và restore;
  `MANAGER` bị từ chối kể cả có permission master-data.
- Composition tests xác nhận thứ tự core → profile → global → report → data và conversation mới/follow-up
  dùng đúng prompt snapshot.
- Permission và API integration tests cho endpoint AI hiện có.

## 12. Tiêu chí nghiệm thu

1. Một món chỉ xuất hiện một lần trong danh sách master.
2. Chọn món cập nhật đúng top 3, tổng sản lượng và nhận định ở panel detail.
3. Dòng 0 không nằm trong leaderboard; dòng âm không được trình bày như thành tích.
4. Mực chiên giòn mẫu `total=6`, `top1=100%` được gắn **Tập trung cao**.
5. Chả giò rế mẫu `total=4`, `top1=75%` được gắn **Ít dữ liệu**, không gợi ý đào tạo.
6. Filter **Gợi ý đào tạo chéo** chỉ hiển thị món đủ dữ liệu và top 1 từ 80%.
7. AI nhận report type, filter, selected item và nested data hợp lệ; frontend không gửi system prompt.
8. AI không gọi nhân viên là giỏi/yếu và không suy hiệu suất từ sản lượng thô.
9. Payload AI không bao giờ là JSON bị cắt dở.
10. Mở lại conversation không hiển thị blob report JSON nhưng follow-up vẫn dùng được dữ liệu gốc.
11. Manual AI chat và client cũ không gửi `reportContext` vẫn hoạt động như trước.
12. Owner/Admin có thể lưu prompt chung và prompt riêng bằng textarea; Manager không thấy cửa sổ và bị
    backend từ chối nếu gọi API trực tiếp.
13. Save tạo version mới và có hiệu lực với lượt phân tích mới; restore cũng tạo version mới.
14. Conversation đang tồn tại giữ prompt snapshot cũ; conversation mới dùng active version mới nhất.
15. Prompt tùy chỉnh không thể thay đổi core security, tool permissions hoặc semantics cố định của report.

## 13. Phương án đã loại

- **Giữ grid và group rows:** ít thay đổi nhưng vẫn phải mở/đọc từng nhóm, không hỗ trợ so sánh và lựa
  chọn món nhanh bằng master-detail.
- **Heatmap món × nhân viên:** phù hợp với ma trận kỹ năng nhưng API chỉ trả top 3; ô trống sẽ dễ bị hiểu
  sai là nhân viên chưa từng bán món.
- **100% stacked bar:** sai ngữ nghĩa khi top 3 không đủ 100% hoặc có refund âm.
- **System prompt nằm ở frontend:** không đáng tin cậy, dễ bị sửa và trộn policy với user content.
- **Một system prompt hoàn chỉnh cho mỗi report:** lặp identity/safety/tool rules và khó giữ nhất quán;
  global prompt cộng report profile nhỏ an toàn hơn.
- **Form mục tiêu + checkbox trọng tâm:** nhiều khái niệm và catalog hơn nhu cầu; hai textarea trực tiếp
  cho phép chủ nhà hàng diễn đạt ngắn gọn mà vẫn giữ core prompt được bảo vệ.
- **Dùng lại `AiRestaurantContext`:** entity đó phục vụ lock suggestion; dùng chung sẽ làm thay đổi prompt
  báo cáo ngoài ý muốn và trộn hai permission/audit boundary khác nhau.
