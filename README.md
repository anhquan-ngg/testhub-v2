# TESTHUB - Hệ thống Thi trực tuyến

## AI generation và review

Trong tài khoản giảng viên, mở **Ngân hàng câu hỏi → Sinh câu hỏi bằng AI**
(`/{locale}/lecturer/questions/generate`). Tạo lô từ văn bản với consent, chờ sinh,
sửa bản nháp, duyệt từng câu, chọn câu đã duyệt và xác nhận lưu vào ngân hàng.
Có lịch sử lô và URL để tiếp tục review; sửa sau duyệt cần duyệt lại phiên bản mới.
Nhãn hỗ trợ vi/en; nội dung sinh hiện là trắc nghiệm một đáp án bằng tiếng Việt.

Backend cần áp dụng hai migration AI trên DB local, chạy API, Redis, FastAPI và
worker riêng. Xem [hướng dẫn tích hợp/demo](../testhub-v2-backend/docs/ai-question-generation.md).
Frontend dùng session cookie hiện có, không cần Gemini key hoặc internal token.

TESTHUB là một nền tảng thi trực tuyến hiện đại được xây dựng bằng Next.js 15, cho phép các tổ chức giáo dục tạo, quản lý và triển khai các bài kiểm tra một cách hiệu quả.

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
| Frontend         | Next.js 15, React 19, TypeScript |
| Styling          | Tailwind CSS 4, Radix UI         |
| State Management | Redux Toolkit, TanStack Query    |
| Database         | PostgreSQL với Prisma ORM        |
| Authentication   | JWT, Google OAuth                |
| Access Control   | ZenStack                         |
| Charts           | Recharts                         |

## 🚀 Cài đặt và Chạy

### Yêu cầu hệ thống

- Node.js 20+
- PostgreSQL 14+

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
DATABASE_URL="postgresql://user:password@localhost:5432/testhub"
NEXT_JWT_SECRET="your-secret-key"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

### Bước 4: Khởi tạo database

```bash
npx prisma migrate dev
npx zenstack generate
```

### Bước 5: Chạy ứng dụng

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) để xem kết quả.

## 📁 Cấu trúc dự án

```
testhub-v2/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── (admin)/      # Trang quản trị
│   │   ├── (student)/    # Trang học sinh
│   │   └── api/          # API Routes
│   ├── components/       # React Components
│   └── lib/              # Utilities
├── prisma/               # Prisma schema
├── generated/            # ZenStack generated hooks
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
