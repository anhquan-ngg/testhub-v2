# TESTHUB - Hệ thống Thi trực tuyến

TESTHUB là một nền tảng thi trực tuyến hiện đại được xây dựng bằng Next.js 16, cho phép các tổ chức giáo dục tạo, quản lý và triển khai các bài kiểm tra một cách hiệu quả.

## Tài liệu học tập PDF/PPTX

Mở **Ngân hàng câu hỏi → Tài liệu học tập** hoặc
`/{locale}/lecturer/questions/documents`. Có upload tối đa 20 MiB, consent,
speaker notes opt-in, lịch sử phiên bản, polling, xem text theo trang/slide và thu
hồi quyền truy cập. Cần backend migration mới, AI service có parser và tiến trình
`npm run start:document-worker` riêng. Xem
[hướng dẫn chạy/demo](../testhub-v2-backend/docs/learning-documents.md).
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
[hướng dẫn RAG mục 4](../testhub-v2-backend/docs/rag-indexing.md#4-generate-questions-directly-from-an-attached-file-2026-10-23). Xem [hướng dẫn tích hợp/demo](../testhub-v2-backend/docs/ai-question-generation.md).
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
