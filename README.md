# TESTHUB - Hệ thống Thi trực tuyến

## Luồng quản lý bài thi

- Danh sách giữ từ khóa `q` và trang `page` trong URL. Tạo/sửa nhận `returnTo`
  chỉ trỏ về danh sách, giữ ngữ cảnh khi hủy hoặc lưu thành công; có trạng thái
  tải, lỗi và thử lại riêng biệt, không dùng màn hình trống để biểu thị API lỗi.
- Tạo và sửa dùng chung [trường thông tin](src/components/exams/ExamDetailsFields.tsx)
  và [validation](src/components/exams/exam-form.ts): lỗi ngay dưới trường,
  focus vào lỗi đầu tiên, thời lượng là số phút nguyên dương, kết thúc sau bắt đầu.
  Các trường xếp một cột trên màn hình nhỏ; đang lưu thì khóa gửi lặp.
- Khi có thay đổi chưa lưu, hủy, bấm liên kết hoặc đổi ngôn ngữ cần xác nhận.
  Tải lại/đóng tab dùng cảnh báo của trình duyệt. Back/Forward dùng Navigation API
  trên trình duyệt hỗ trợ; trình duyệt cũ không có API này chưa chặn được điều
  hướng lịch sử trong cùng ứng dụng. Không có autosave hay nháp bền vững cho đề thi.
- Xóa đăng ký và cấp quyền thi lại có xác nhận ghi rõ đối tượng, hậu quả và khóa
  thao tác đang xử lý. Hủy hộp thoại không gửi yêu cầu thay đổi dữ liệu.
- Báo cáo phân biệt lỗi toàn bộ với thiếu chi tiết, hiển thị số lượt hoàn thành
  và số đã tải; có thể thử lại các chi tiết lỗi. Điểm `null` hiển thị **Chưa có điểm**,
  không phải 0. Tạm khóa in báo cáo thiếu dữ liệu/chưa có điểm và PDF bài chưa chấm,
  vì bộ render PDF hiện tại chưa xử lý điểm `null` đúng nghĩa.
- Bản xem trước phân biệt lỗi 403, 404 và lỗi máy chủ/kết nối. Các nhãn mới có VI/EN;
  hộp thoại chấm lại trả focus về nút mở, trường gia hạn có nhãn liên kết rõ ràng.

Kiểm tra hồi quy với dữ liệu test: tạo/sửa hợp lệ và không hợp lệ, gửi lặp,
thoát khi chưa lưu, Back/Forward giữ tìm kiếm/trang, hủy hành động nguy hiểm,
API 500 và thử lại, báo cáo thiếu chi tiết/điểm `null`, Escape trả focus, cùng
các kích thước 1440/1024/768/375 px. Không dùng dữ liệu thi thật để kiểm thử thao tác ghi.

## Giám sát bài thi

- Trang giám sát nhận `returnTo` hợp lệ từ danh sách để giữ từ khóa và trang khi quay lại.
  Có tìm kiếm, lọc trạng thái/tín hiệu, số thí sinh đang hiển thị và phân biệt danh sách
  chưa có thí sinh với kết quả lọc rỗng. Header và danh tính dài tự xuống dòng trên mobile.
- Khi tải lại lỗi tạm thời, giữ danh sách gần nhất, ghi rõ dữ liệu có thể cũ và khóa gia hạn.
  Lỗi 403/404 xóa danh sách khỏi màn hình. Hiển thị thời điểm cập nhật và thông báo khi
  kênh trực tiếp gián đoạn; REST vẫn tải mỗi 30 giây, kết nối SSE đóng được thử lại sau 5 giây.
- Snapshot SSE mới không bị REST cũ ghi đè; delta mới hơn snapshot REST được áp dụng lại.
  Thiếu chuỗi sự kiện hoặc xuất hiện lượt thi mới sẽ tải lại danh sách và kết nối lại SSE.
  Thí sinh chưa bắt đầu vẫn được giữ khi cập nhật delta.
- Gia hạn nhận số phút nguyên 1–120, báo lỗi tại trường, hỗ trợ Enter, khóa gửi lặp/đóng
  hộp thoại khi đang xử lý và kiểm tra lượt thi còn đang làm. Đây là thời gian cộng thêm
  cho lượt thi, không thay đổi giờ kết thúc chung. Backend vẫn quyết định quyền và trạng thái.
- Duyệt chuyển thiết bị dùng hộp thoại xác nhận có quản lý focus; phân biệt đang tải,
  không có yêu cầu và lỗi/thử lại. Lỗi duyệt không bị polling tự xóa; sau duyệt tải lại dữ liệu.
- Tín hiệu bất thường chỉ là thông tin tham khảo, không tự động kết luận gian lận.
  UI có VI/EN và giữ các component, màu sắc hiện có.

Kiểm thử thao tác ghi bằng fixture trình duyệt, không gia hạn/duyệt thiết bị thật.
Khóa gửi lặp phía UI không thay thế idempotency backend: khi mất phản hồi của một lệnh
đã gửi, cần xác minh kết quả trước khi thử gia hạn lại. Chưa xác minh E2E với nhiều sinh viên thật.

## Nhập câu hỏi từ Excel/Word

- Dùng mẫu chính thức ở `/lecturer/questions/import/templates/excel` hoặc `/word`.
  Hỗ trợ `.xlsx`/`.docx` tối đa 20 MiB, ba loại SINGLE_CHOICE, MULTIPLE_CHOICE,
  ESSAY, chương theo đường dẫn và ảnh nhúng. Không có luồng nhập định nghĩa đề thi
  từ Office (thời gian, điểm, cấu trúc đề); API backend chỉ hỗ trợ tùy chọn gắn câu
  hỏi vào một đề MANUAL đã tồn tại.
- Kiểm tra dữ liệu trước khi lưu: dòng không hợp lệ không được chọn; có thể sửa và
  kiểm tra lại. Chỉ những dòng hợp lệ được chọn mới được đưa vào ngân hàng. Chính sách
  trùng lặp của UI là SKIP, không phải tự động loại bản ghi trong lúc trích xuất.
- Lỗi tải dữ liệu kiểm tra có nút thử lại. Các thao tác upload/lưu/xác nhận/hủy có
  khóa gửi lặp; sau lỗi xác nhận lưu, UI đọc lại trạng thái để tránh báo còn chờ duyệt
  khi server đã hoàn tất. Khóa này không thay thế idempotency trên backend.
- Trình sửa giữ xuống dòng trong lựa chọn, cấp khóa A–F chưa dùng khi thêm lựa chọn;
  các nút icon dùng tooltip VI/EN và nhãn truy cập. Tệp rỗng bị chặn trước khi upload.
- Bộ fixture thật, expected độc lập và kiểm thử parser/API/DB nằm trong repository
  backend, thư mục `src/question-imports/`; hướng dẫn nằm trong
  `src/question-imports/parsers/fixtures/README.md`. Chỉ dùng môi trường DB dùng một lần
  cho kiểm thử ghi, không chạy các fixture trên tài khoản/ngân hàng đang sử dụng.

## Cây chương nhiều cấp (2026-10-27)

Cấu hình đề theo chương cho phép tìm/chọn chương ở mọi cấp và luôn bao gồm
toàn bộ chương con. Các nhánh được phép chồng lấn; backend bảo đảm không trùng
câu giữa các dòng và báo lỗi nếu không đủ câu. Đường dẫn được dựng bằng vòng
lặp; danh sách chọn phân trang 50 mục, không giới hạn độ sâu nghiệp vụ.
Kiểm tra logic bằng `node scripts/check-chapter-tree.cjs`.

## Knowledge matrix authoring (2026-10-25)

- Generation uploads topic-owned documents without selecting a chapter. Create/resume a durable plan via ?plan=id, edit tree and topic x cognition matrix, save, confirm, then generate.
- KnowledgePlanWorkspace uses react-hook-form + Zod; chapters support arbitrary-depth parent references with cycle checks. Sources remain PAGE/SLIDE/NOTES positions.
- PlanCoverage compares frozen requested cells with generated/approved/saved drafts. A saved question uses its frozen plan target, not model-provided chapter IDs.
- Matching/creating bank chapters happens only at explicit approved commit. Proposal labels distinguish heading-derived versus inferred topics; lecturer review remains required.
- New labels live in shared/questionGeneration.json plan.* for both locales. Config rows: max20, questions: max20. CONTINUITY.md stays local and ignored/untracked.


TESTHUB là một nền tảng thi trực tuyến hiện đại được xây dựng bằng Next.js 16, cho phép các tổ chức giáo dục tạo, quản lý và triển khai các bài kiểm tra một cách hiệu quả.

## Phiên đăng nhập và chuyển thiết bị

Sinh viên có một phiên trình duyệt hoạt động. Đăng nhập ở trình duyệt khác cần
xác nhận chuyển phiên; khi có bài đang làm, giảng viên phụ trách hoặc admin phải
duyệt trước. Yêu cầu chờ không đẩy phiên cũ ra. Giảng viên/admin được đăng nhập
nhiều thiết bị và đăng xuất riêng từng phiên. Giảng viên duyệt ở trang giám sát
bài thi; admin duyệt tại dashboard. Sinh viên xác nhận lại tại trình duyệt mới.

Cần migration `20261024090000_add_auth_sessions` ở backend và đăng nhập lại sau
khi triển khai. Xem [hướng dẫn phiên đăng nhập](https://github.com/anhquan-ngg/testhub-v2-backend/blob/dev/docs/auth-sessions.md)
về cookie cùng host, gia hạn phiên và các bước kiểm tra.

## Tài liệu học tập PDF/PPTX

Mở **Ngân hàng câu hỏi → Tài liệu học tập** hoặc
`/{locale}/lecturer/questions/documents`. Có upload tối đa 20 MiB, consent,
speaker notes opt-in, lịch sử phiên bản, polling, xem text theo trang/slide và thu
hồi quyền truy cập. Cần backend migration mới, AI service có parser và tiến trình
`npm run start:document-worker` riêng. Xem
[hướng dẫn chạy/demo](https://github.com/anhquan-ngg/testhub-v2-backend/blob/dev/docs/learning-documents.md).
EXTRACTED chưa phải index RAG; lập chỉ mục tài liệu để dùng trong luồng sinh câu hỏi từ file.

## AI generation và review

Trong tài khoản giảng viên, mở **Ngân hàng câu hỏi → Sinh câu hỏi bằng AI**
(`/{locale}/lecturer/questions/generate`). Nội dung tài liệu đã lập chỉ mục và truy vấn
retrieval được gửi tới Google; cân nhắc điều này trước khi đồng ý consent.
Đính kèm PDF/PPTX, tạo lô, chờ sinh,
sửa bản nháp, duyệt từng câu, chọn câu đã duyệt và xác nhận lưu vào ngân hàng.
Có lịch sử lô và URL để tiếp tục review; sửa sau duyệt cần duyệt lại phiên bản mới.
Nhãn hỗ trợ vi/en; cấu hình trắc nghiệm một hoặc nhiều đáp án theo mức nhận thức, nội dung sinh bằng tiếng Việt.

Luồng file đính kèm cần đầy đủ migration AI staging/review, learning-documents,
document-indexes, `20261023090000_add_document_question_generation` và migration
`question_configs` mới nhất. Chạy API, Redis, FastAPI cùng **cả hai worker**:
`npm run start:document-worker` (trích xuất/lập chỉ mục) và `npm run start:ai-worker`
(chuẩn bị nguồn/sinh câu hỏi) sau khi build. Xem
[hướng dẫn RAG mục 4](https://github.com/anhquan-ngg/testhub-v2-backend/blob/master/docs/rag-indexing.md#4-generate-questions-directly-from-an-attached-file-2026-10-23). Xem [hướng dẫn tích hợp/demo](https://github.com/anhquan-ngg/testhub-v2-backend/blob/dev/docs/ai-question-generation.md).
Frontend dùng session cookie hiện có, không cần Gemini key hoặc internal token.
API từ văn bản được giữ để tương thích với consumer và lịch sử cũ; QuestionGenerationScreen dùng tệp đính kèm.

## 🚀 Tính năng chính

### 👨‍🎓 Dành cho Học sinh/Sinh viên

- **Tham gia bài thi**: Làm bài kiểm tra trực tuyến với giao diện thân thiện
- **Bài thi luyện tập**: Luyện tập với các đề thi mẫu trước khi thi chính thức
- **Xem kết quả**: Theo dõi điểm số và lịch sử làm bài
- **Quản lý hồ sơ**: Cập nhật thông tin cá nhân (họ tên, trường, điện thoại, địa chỉ)

### 👨‍🏫 Dành cho Giảng viên

- **Quản lý đề thi**: Tạo, chỉnh sửa và xóa bài kiểm tra
- **Ngân hàng câu hỏi**: Quản lý kho câu hỏi đa dạng
- **Chấm điểm**: Hỗ trợ chấm điểm tự động và thủ công

### 🛠️ Dành cho Quản trị viên

- **Dashboard thống kê**: Biểu đồ phổ điểm, số lượng người dùng, bài thi
- **Quản lý người dùng**: Thêm, sửa, xóa và phân quyền người dùng
- **Theo dõi hệ thống**: Giám sát hoạt động thi cử trong thời gian thực

## 📊 Các loại câu hỏi hỗ trợ

- **Trắc nghiệm một đáp án** (Single Choice)
- **Trắc nghiệm nhiều đáp án** (Multiple Choice)
- **Tự luận** (Essay)

## 🔧 Công nghệ sử dụng

| Thành phần       | Công nghệ                        |
| ---------------- | -------------------------------- |
| Frontend         | Next.js 16, React 19, TypeScript |
| Styling          | Tailwind CSS 4, Radix UI         |
| State Management | Redux Toolkit    |
| Backend API      | NestJS (repository riêng)        |
| Authentication   | JWT, Google OAuth                |
| Access Control   | JWT role + backend authorization |
| Charts           | Recharts                         |

## 🚀 Cài đặt và Chạy

### Yêu cầu hệ thống

- Node.js 20+
- Backend NestJS chạy ở `NEXT_PUBLIC_API_URL`; frontend không truy cập DB trực tiếp.

### Bước 1: Clone repository

```bash
git clone https://github.com/anhquan-ngg/testhub-v2.git
cd testhub-v2
```

### Bước 2: Cài đặt dependencies

```bash
npm install
```

### Bước 3: Cấu hình môi trường

Tạo file `.env` với các biến sau:

```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_JWT_ACCESS_SECRET="<cùng giá trị JWT_ACCESS_SECRET của backend>"
```

Secret JWT chỉ dùng phía server, không dùng tiền tố `NEXT_PUBLIC_`; `NEXT_JWT_SECRET` là fallback. Không commit `.env`. Xem `AGENTS.md` mục 5–6. Migration và ORM thuộc repository backend.

### Bước 4: Chạy ứng dụng

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) để xem kết quả.

## 📁 Cấu trúc dự án

```
testhub-v2/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── [locale]/(admin)/      # Trang quản trị
│   │   ├── [locale]/(student)/    # Trang học sinh
│   │   └── [locale]/lecturer/ # Trang giảng viên
│   ├── components/       # React Components
│   └── lib/              # Utilities
└── public/               # Static assets
```

## 🔐 Phân quyền người dùng

| Vai trò      | Quyền hạn                   |
| ------------ | --------------------------- |
| **ADMIN**    | Quản lý toàn bộ hệ thống    |
| **LECTURER** | Tạo đề thi, quản lý câu hỏi |
| **STUDENT**  | Làm bài thi, xem kết quả    |

## 📄 License

MIT License - Xem file [LICENSE](LICENSE) để biết thêm chi tiết.

## 👥 Đóng góp

Mọi đóng góp đều được hoan nghênh! Vui lòng tạo Pull Request hoặc Issue trên GitHub.
