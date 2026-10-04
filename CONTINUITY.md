# CONTINUITY.md — testhub-v2 (frontend)

> Trạng thái và bàn giao giữa các phiên làm việc. Đọc trước khi làm việc; cập nhật sau mỗi nhiệm vụ có thay đổi đáng kể.

**Cập nhật lần cuối:** 2026-10-05 — sửa entity HTML hiển thị nguyên văn trong nhãn dashboard giảng viên.

## Cách cập nhật file này

- Cập nhật ngày ở trên và các mục bị ảnh hưởng sau mỗi nhiệm vụ có thay đổi đáng kể (tính năng, sửa lỗi, đổi contract với backend, quyết định kiến trúc, phát hiện vấn đề mới).
- Chỉ ghi điều đã xác minh từ code, lệnh đã chạy, hoặc người dùng xác nhận; điều còn nghi ngờ đưa vào mục "Chưa xác minh".
- Ngắn gọn: xóa mục đã xong hoặc đã lỗi thời thay vì chồng thêm. Lịch sử chi tiết đã có trong git.
- Không ghi secrets, token, mật khẩu, dữ liệu cá nhân.

## Trạng thái hiện tại (xác minh từ codebase)

- Nhánh `dev`, đồng bộ với `origin/dev` khi khảo sát; chỉ có thư mục untracked `reports/` (tài liệu .docx của người dùng) trước khi thêm 3 file tài liệu này. Commit mới nhất: `097ece1` (2026-09-29) — `QuestionImportDialog` xử lý lỗi và polling.
- Next.js đã cài: 16.1.1; React 19.1.0.
- Các khu vực trang: public (`/{locale}`, `/{locale}/login`, `/{locale}/signup`, `/{locale}/auth/callback`), ADMIN (`src/app/[locale]/(admin)/dashboard/**`), STUDENT (`src/app/[locale]/(student)/**`), LECTURER (`src/app/[locale]/lecturer/**`).
- Tính năng gần đây theo git log: dialog import câu hỏi (`src/components/question-import/QuestionImportDialog.tsx`), dialog in đề (`src/components/exam-print/PrintExamDialog.tsx`), dashboard giảng viên (`src/app/[locale]/lecturer/page.tsx`), xử lý file trong trang thi/kết quả.

## Quyết định kiến trúc đã thể hiện trong code

- Frontend thuần client gọi thẳng backend NestJS; không có route handler (`src/app/api/` rỗng), không truy cập DB.
- Một axios instance dùng chung với `withCredentials` và cơ chế refresh khi 401 có hàng đợi request — `src/lib/api-client.ts`.
- Bảo vệ route ở edge bằng `src/proxy.ts`: verify `access_token` bằng `jose`, thử refresh, chuyển hướng theo `role`.
- Toàn bộ đường dẫn API tập trung ở `src/constants/endpoints.ts`.
- State toàn cục bằng Redux Toolkit (`src/store/`); thông tin người dùng nạp bởi `src/components/UserLoader.tsx` qua `GET /auth/me`.
- Thông báo realtime qua `src/components/providers/SocketProvider.tsx` (namespace `/notifications`); trạng thái phòng thi và giám sát qua SSE (`ENDPOINTS.EXAM_RUNTIME.EVENTS`, `MONITOR_EVENTS`).
- Upload file theo luồng presigned URL + confirm — `src/hooks/useFiles.ts`.
- Font chữ nội dung và tiêu đề đều dùng Inter từ `next/font/google` qua `--font-body` trong `src/app/[locale]/layout.tsx`; `src/app/globals.css` ánh xạ biến này cho body, heading và Tailwind. Stylesheet công khai của `https://teencare.co/vn` khai báo Inter cho phần lớn typography; đây là tham chiếu cho thay đổi.
- Trang `/login` và `/signup` dùng `<form onSubmit>`; nút chính có `type="submit"`, nút đăng nhập Google/Outlook có `type="button"`. Bấm Enter trong ô cuối gửi qua cùng hàm xử lý như khi bấm nút chính.

## i18n (vi/en) — tiến độ

- `next-intl` ^4.14, route `/{locale}/...`, cookie `NEXT_LOCALE` dùng cho URL chưa có locale, `LanguageSwitcher`, `useEnumLabels`. Message vi/en chia thành 30 cặp JSON theo `shared`, `public`, `admin`, `student`, `lecturer` và trang trong `src/messages/<locale>/`; `index.ts` ghép namespace, `request.ts` nạp theo segment locale. `routing.ts` và `navigation.ts` giữ locale cho link/router. Các file `messages/{vi,en}.json` ở gốc đã bỏ.
- Đã chuyển text UI của các trang public, admin, student, lecturer, dialog import/in đề, MathInput/MathRenderer, UI dialog/spinner và `useS3`. Nhãn trạng thái/enum và ngày giờ cũng chọn theo locale. Audit AST không còn chuỗi tiếng Việt hiển thị cố định trong `src`; ký hiệu toán và tên locale vẫn là dữ liệu kỹ thuật.
- `scripts/check-i18n.cjs` kiểm tra cặp file, key, cú pháp ICU và placeholder; `scripts/i18n-audit.cjs` và `scripts/audit-remaining-ui.cjs` giúp tìm text mới hardcode. Smoke test `/en`, `/vi`, `/en/login`, `/en/signup`, link nội bộ và chuyển hướng `/`/route cần đăng nhập đã pass trên production server local.
- Thông báo lỗi/nội dung do backend trả về (notification title/content, message lỗi API) vẫn phụ thuộc backend; `api-client` chưa gửi `Accept-Language`. Chưa kiểm tra thủ công các trang cần đăng nhập trên trình duyệt.
- Message JSON là text đầu vào cho `next-intl`; nhãn `theExamIsAboutToTake` dùng dấu `&` trực tiếp, không dùng `&amp;` vì sẽ hiển thị nguyên văn. Đã rà `src/messages`, `src/app`, `src/components`: không còn `&amp;`.

## Vấn đề / TODO đã xác minh

1. `npx eslint .`: 91 problem (53 error, 38 warning) — 52 `@typescript-eslint/no-explicit-any`, 1 `prefer-const`, 29 `no-unused-vars`, 5 `@next/next/no-img-element`, 3 `react-hooks/exhaustive-deps`.
2. `schema.zmodel`, `prisma/schema.prisma`, `generated/hooks/*` đã bị xóa ở commit `edc1f7e`, nhưng 5 file vẫn import enum từ `@prisma/client` (danh sách ở `AGENTS.md` mục 9). Typecheck hiện pass nhờ Prisma Client cũ trong `node_modules/.prisma/client`.
3. `.github/workflows/ci.yml` chỉ trigger trên nhánh `main`, trong khi repo dùng `master` và `dev` ⇒ CI không chạy. Workflow còn có bước `npx zenstack generate` với khối `env:` rỗng và không có schema.
4. `src/proxy.ts` chuyển hướng sai vai trò tới `/unauthorized`, nhưng không có trang này.
5. `src/hooks/useFiles.ts` (`markFileDeletedByUrl`) gọi `POST /model/File/updateMany`, backend không có route `/model/*`.
6. `src/constants/routes.ts` khai báo `/register`, `/forgot-password` không tồn tại (trang đăng ký là `/signup`); `PUBLIC_ROUTES`, `AUTH_COOKIE_KEY`, `REFRESH_COOKIE_KEY` không được dùng.
7. `useAuth.handleOutlookLogin` là hàm rỗng, trong khi backend có `GET /auth/outlook`.
8. `src/lib/socket.ts` export một socket không được import ở đâu; `src/types/next-auth.d.ts` khai báo module `next-auth` dù package này không được cài.
9. Không thấy import trong `src/` của các dependency: `@react-oauth/google`, `js-cookie`, `zod`, `react-to-print`, `dotenv`.
10. Không có test và không có `.env.example`; `README.md` lỗi thời (Next.js 15, TanStack Query, `prisma/`, `generated/`, các bước `prisma migrate`/`zenstack generate`).

## Chưa xác minh

- Sau khi cài mới (`npm ci` sạch, không còn client cũ), các import enum từ `@prisma/client` có làm typecheck/build thất bại hay không.
- Nhánh refresh trong `src/proxy.ts`: backend đặt `refresh_token` với `path: /auth/refresh`, nên trình duyệt có thể không gửi cookie này khi điều hướng tới các trang khác ⇒ refresh ở edge có thể không bao giờ chạy. Chưa kiểm tra thực tế.
- Production (frontend và API khác subdomain, cookie không đặt `domain`): `src/proxy.ts` có đọc được `access_token` hay không.
- Quy trình deploy frontend: repo không có cấu hình deploy; có nhánh remote `vercel/react-server-components-cve-vu-05bla1` gợi ý Vercel nhưng chưa xác nhận.

## Kết quả kiểm tra đã chạy (2026-10-04)

| Lệnh | Kết quả |
| --- | --- |
| `npx tsc --noEmit --incremental false` | Pass, 0 lỗi sau đợt chuyển i18n |
| `npx eslint .` | Fail: 53 error, 38 warning (vấn đề 1) |
| `next build --turbopack` (Node 22 trực tiếp, ngoài sandbox) | Pass sau lần chỉnh sửa cuối; một lần thử trước đó lỗi tải Google Font từ `fonts.gstatic.com`, thử lại thành công |
| `node scripts/check-i18n.cjs` | Pass: 30 cặp file, key/ICU/placeholder khớp |
| `node scripts/smoke-i18n.cjs` với production server local | Pass: `/` EN/VI, `/login` EN, `/signup` EN |
| `eslint src/app/page.tsx` | Pass, 0 lỗi/cảnh báo |
| `eslint src/app src/components src/hooks/useS3.ts` | Fail: 52 error, 37 warning; chủ yếu là `any`, biến không dùng và hook dependency tồn đọng |
| `next typegen` + `tsc --noEmit --incremental false` | Pass sau khi chuyển toàn bộ route sang `[locale]` |
| `eslint src/proxy.ts src/i18n src/components/common/LanguageSwitcher.tsx src/lib/api-client.ts` | Pass, 0 lỗi/cảnh báo |
| `eslint src/proxy.ts src/i18n src/components/common/LanguageSwitcher.tsx src/lib/api-client.ts src/app` | Fail: 49 error, 28 warning có sẵn ở các trang |
| `next build --turbopack` sau chuyển route | Pass; lần đầu lỗi tải Google Font, lần chạy lại thành công |
| `scripts/smoke-i18n.cjs` sau chuyển route | Pass 10 trường hợp (5 lần tải trang vi/en, 5 chuyển hướng; locale trong URL ưu tiên hơn cookie) |
| Test | Repo chưa có test |

## Kết quả kiểm tra đã chạy (2026-10-05)

| Lệnh | Kết quả |
| --- | --- |
| TypeScript `tsc --noEmit --incremental false` (Node 22 trực tiếp) | Pass |
| ESLint `src/app/[locale]/layout.tsx` (Node 22 trực tiếp) | Pass |
| `next build --turbopack` (Node 22 trực tiếp) | Pass, tải và biên dịch font Inter thành công |
| TypeScript, ESLint layout, `next build --turbopack` sau khi dùng Inter cho tiêu đề | Pass cả ba |
| TypeScript và `next build --turbopack` sau thay đổi form đăng nhập/đăng ký | Pass cả hai |
| ESLint `src/app/[locale]/{login,signup}/page.tsx` | Fail do 2 lỗi tồn đọng: `Mail` không dùng trong login (warning), `as any` trong signup (error) |
| `node scripts/check-i18n.cjs` sau sửa nhãn dashboard giảng viên | Pass: 30 cặp message và cú pháp ICU hợp lệ |

## Công việc đang làm

Chưa có thông tin.

## Bước tiếp theo đề xuất

Các ứng viên khác dựa trên vấn đề đã xác minh: thay import enum `@prisma/client` bằng type cục bộ; sửa trigger CI sang `master`/`dev` và bỏ bước ZenStack; thêm trang `/unauthorized` hoặc đổi đích chuyển hướng; xử lý lời gọi `/model/File/updateMany`; thêm `.env.example` chỉ chứa tên biến; cập nhật README.

## Điểm cần làm rõ với người dùng

- Enum dùng chung nên lấy từ đâu sau khi bỏ Prisma/ZenStack ở frontend (type cục bộ, package dùng chung, hay sinh từ Swagger backend)?
- Có cần đưa test (unit/E2E) vào frontend không, và dùng công cụ nào?
- Frontend được deploy ở đâu và từ nhánh nào?
