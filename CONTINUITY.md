# CONTINUITY.md — testhub-v2 (frontend)

> Trạng thái và bàn giao giữa các phiên làm việc. Đọc trước khi làm việc; cập nhật sau mỗi nhiệm vụ có thay đổi đáng kể.

**Cập nhật lần cuối:** 2026-10-20 — sửa đường mở câu hỏi của chương cha trong ngân hàng giảng viên.

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
- `vercel.json` override Build Command thành `npm run build`, thay lệnh ZenStack cũ trong Vercel Project Settings. GitHub Actions chạy trên `master`/`dev`, dùng `npm ci`, Node 22 và build với giá trị JWT chỉ dùng để kiểm tra build; lint còn lỗi tồn đọng nên tạm không chặn build.
- Trang thi `src/app/[locale]/(student)/exam/[id]/page.tsx`: bài thi chính thức (`practice === false`) bấm "Làm bài ngay" sẽ mở dialog yêu cầu toàn màn hình; chỉ bắt đầu khi `requestFullscreen` thành công. Trong lúc làm bài, nếu không ở toàn màn hình (thoát bằng Esc, hoặc tải lại trang khi đang có bài làm dở) thì đề bị ẩn (`invisible`) sau một dialog không đóng được, cho tới khi học viên bật lại; đồng hồ vẫn chạy. Mỗi lần thoát gửi `POST /exam-runtime/submissions/:id/violations` với `FULLSCREEN_EXIT` (debounce 5 giây ở client và ở backend); backend phát SSE `EXAM_MONITOR_VIOLATION` và trang giám sát giảng viên hiện toast cùng số vi phạm (đã có sẵn, không đổi backend). Lần thoát do trang tự thực hiện sau khi nộp bài không bị tính (ref `intentionalFullscreenExit`). Bài luyện tập và trình duyệt không hỗ trợ Fullscreen API (`document.fullscreenEnabled === false`, ví dụ Safari trên iPhone) không bị yêu cầu toàn màn hình.
- Các enum API mà frontend cần nằm tại `src/types/backend-enums.ts`, đối chiếu với `../testhub-v2-backend/prisma/schema.prisma`; `src/` không còn import Prisma Client.
- `src/types/question-generation.ts` cố định command văn bản (môn/chương, source text, SINGLE_CHOICE, bốn mức nhận thức, count, vi, consent true), câu trả về và các trạng thái batch/draft dành cho bước sau. Backend đã có schema/service/client FastAPI; chưa đăng ký endpoint frontend hoặc thêm UI. Type không chứa token/URL nội bộ; xem `../testhub-v2-backend/docs/ai-question-generation.md`.

## i18n (vi/en) — tiến độ

- `next-intl` ^4.14, route `/{locale}/...`, cookie `NEXT_LOCALE` dùng cho URL chưa có locale, `LanguageSwitcher`, `useEnumLabels`. Message vi/en chia thành 30 cặp JSON theo `shared`, `public`, `admin`, `student`, `lecturer` và trang trong `src/messages/<locale>/`; `index.ts` ghép namespace, `request.ts` nạp theo segment locale. `routing.ts` và `navigation.ts` giữ locale cho link/router. Các file `messages/{vi,en}.json` ở gốc đã bỏ.
- Đã chuyển text UI của các trang public, admin, student, lecturer, dialog import/in đề, MathInput/MathRenderer, UI dialog/spinner và `useS3`. Nhãn trạng thái/enum và ngày giờ cũng chọn theo locale. Audit AST không còn chuỗi tiếng Việt hiển thị cố định trong `src`; ký hiệu toán và tên locale vẫn là dữ liệu kỹ thuật.
- `scripts/check-i18n.cjs` kiểm tra cặp file, key, cú pháp ICU và placeholder; `scripts/i18n-audit.cjs` và `scripts/audit-remaining-ui.cjs` giúp tìm text mới hardcode. Smoke test `/en`, `/vi`, `/en/login`, `/en/signup`, link nội bộ và chuyển hướng `/`/route cần đăng nhập đã pass trên production server local.
- Thông báo lỗi/nội dung do backend trả về (notification title/content, message lỗi API) vẫn phụ thuộc backend; `api-client` chưa gửi `Accept-Language`. Chưa kiểm tra thủ công các trang cần đăng nhập trên trình duyệt.
- Message JSON là text đầu vào cho `next-intl`; nhãn `theExamIsAboutToTake` dùng dấu `&` trực tiếp, không dùng `&amp;` vì sẽ hiển thị nguyên văn. Đã rà `src/messages`, `src/app`, `src/components`: không còn `&amp;`.

## Vấn đề / TODO đã xác minh

1. `eslint .`: 99 problem (62 error, 37 warning) tại lần kiểm tra gần nhất; GitHub Actions vẫn chạy lint để hiển thị lỗi nhưng tạm `continue-on-error` cho đến khi xử lý các lỗi tồn đọng.
2. `src/proxy.ts` chuyển hướng sai vai trò tới `/unauthorized`, nhưng không có trang này.
3. `src/hooks/useFiles.ts` (`markFileDeletedByUrl`) gọi `POST /model/File/updateMany`, backend không có route `/model/*`.
4. `src/constants/routes.ts` khai báo `/register`, `/forgot-password` không tồn tại (trang đăng ký là `/signup`); `PUBLIC_ROUTES`, `AUTH_COOKIE_KEY`, `REFRESH_COOKIE_KEY` không được dùng.
5. `useAuth.handleOutlookLogin` là hàm rỗng, trong khi backend có `GET /auth/outlook`.
6. `src/lib/socket.ts` export một socket không được import ở đâu; `src/types/next-auth.d.ts` khai báo module `next-auth` dù package này không được cài.
7. Không thấy import trong `src/` của các dependency: `@react-oauth/google`, `js-cookie`, `zod`, `react-to-print`, `dotenv`.
8. Tự đăng xuất (phân tích từ code ngày 2026-10-08, chưa sửa):
   - `src/proxy.ts` không bao giờ refresh được: backend đặt `refresh_token` với `path: /auth/refresh` nên request tới `/{locale}/...` không mang cookie này. Khi cookie `access_token` hết hạn (`maxAge` 15 phút), mọi lần tải trang hoặc điều hướng tới route bảo vệ đều bị chuyển về `/login`, dù refresh token còn hạn 7 ngày. Chỉ request axios gửi tới backend mới refresh được.
   - Backend lưu một hash refresh token cho mỗi user (`generateAndSaveTokens` gọi `updateMany` trên mọi account) và đổi token mới ở mỗi lần refresh ⇒ đăng nhập ở trình duyệt/thiết bị khác hoặc hai tab cùng refresh sẽ làm phiên còn lại hỏng.
   - `jwt-refresh.strategy.ts` chỉ tìm account `provider: 'local'` ⇒ user chỉ đăng nhập bằng Google/Outlook luôn refresh thất bại.
   - `api-client.ts` coi mọi lỗi refresh (kể cả lỗi mạng hay backend đang khởi động lại) là hết phiên và chuyển về login.
9. Không có test và không có `.env.example`; `README.md` lỗi thời (Next.js 15, TanStack Query, `prisma/`, `generated/`, các bước `prisma migrate`/`zenstack generate`).

## Chưa xác minh

- Luồng toàn màn hình của trang thi mới kiểm tra bằng typecheck/lint; chưa thử thủ công trên trình duyệt với backend local (vào bài, Esc, tải lại trang, nộp bài, toast bên trang giám sát).
- Chưa chạy `npm ci` trong môi trường sạch hay xác minh deployment Vercel sau thay đổi; `@prisma/client` và `prisma` vẫn nằm trong dependencies dù `src/` không dùng chúng.
- Production (frontend và API khác subdomain, cookie không đặt `domain`): `src/proxy.ts` có đọc được `access_token` hay không.
- Người dùng cung cấp log build Vercel với Build Command cũ `npx zenstack generate && next build`; chưa xác minh nhánh production hoặc biến môi trường Vercel.

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
| TypeScript, `next build --turbopack` sau sửa CI/Vercel và enum | Pass cả hai với `node_modules` hiện có |
| ESLint `src/types/backend-enums.ts src/types/question.ts` | Pass |
| `eslint .` sau sửa CI/Vercel | Fail: 62 error, 37 warning tồn đọng; CI tạm không chặn build |
| Kiểm tra cú pháp `ci.yml`/`vercel.json` và `git diff --check` với CRLF hợp lệ | Pass |
| TypeScript sau thay đổi toàn màn hình trang thi | Pass |
| ESLint `src/app/[locale]/(student)/exam/[id]/page.tsx` | Fail: 21 problem (14 error, 7 warning), đúng bằng bản ở HEAD; không có lỗi nào trong phần code mới |
| `node scripts/check-i18n.cjs` sau khi thêm key `fullscreen*` vào `student/exam.json` | Pass |

## Công việc đang làm

Chưa có thông tin.

## Kiểm tra contract AI (2026-10-16)

- TypeScript `tsc --noEmit --incremental false` toàn frontend và ESLint `src/types/question-generation.ts` qua Node 22.22.0: pass.
- Type command/câu trả về dùng đúng enum hiện tại; backend/Python có fixture contract và test HTTP liên repo. Chưa thêm API caller, endpoint constants hoặc giao diện; không build lại frontend vì thay đổi chỉ là type chưa được import vào runtime.

## AI workspace (2026-10-19)

- Route `/[locale]/lecturer/questions/generate`, có nút từ ngân hàng câu hỏi.
  Tạo lô text với consent/target/count/level, polling và lịch sử lô phân trang,
  mở lại bằng `?batch=UUID`. Không lưu văn bản/token nội bộ vào local storage.
- Editor SINGLE_CHOICE sửa text/4 options/đáp án đúng/level, kiểm tra Zod,
  gửi exact revision. Duyệt/từ chối là thao tác riêng; VALID không phải APPROVED.
  Chỉ chọn câu APPROVED và xác nhận danh sách trước commit. Có bank IDs sau lưu.
  Chặn commit khi đang sửa chưa lưu và bỏ chọn khi revision thay đổi.
- API caller tại `src/services/questionGenerationService.ts`, endpoint constants
  và types cập nhật theo backend; sử dụng Axios cookie/refresh hiện có. Key tạo lô
  giữ trong memory cho retries cùng nội dung; reload mất key nên kiểm tra lịch sử
  trước khi gửi lại nếu kết quả tạo lô chưa rõ. Conflict reload dữ liệu hiện tại.
- Nhãn vi/en tại shared/questionGeneration.json, đăng ký cả hai index message.
  Route đã nằm dưới quyền `/lecturer`, không thêm exception vào proxy.
- Kiểm tra: TypeScript pass; ESLint feature + trang ngân hàng pass; script i18n
  31 cặp JSON/ICU pass; `next build --turbopack` pass (route mới được build).
  Lint toàn repo vẫn có **62 lỗi/37 cảnh báo tồn đọng**, ngoài phần AI mới và
  trang ngân hàng đã sửa (các file này lint riêng sạch); không mở rộng sửa ngoài phạm vi.
  Build cần escalation cho native SWC cache do sandbox owner SID, không cài dependency.
  HTTP SSR localhost với JWT giả riêng: vi/en 200 và form/nhãn đúng. CUA không có
  browser provider (iab unavailable), chưa kiểm thử click-through/visual.
- Backend integration (PostgreSQL/Redis thật tạm + fake AI HTTP) đã kiểm tra sửa,
  duyệt/revision, commit/replay/rollback/quyền sở hữu. Không dùng database hiện có,
  Gemini hoặc tài khoản thật trong các kiểm tra này. Hướng dẫn demo tại
  `../testhub-v2-backend/docs/ai-question-generation.md`.

## Câu hỏi AI không thấy trong ngân hàng giảng viên (2026-10-20)

- Người dùng xác nhận đã commit thành công nhưng chưa thấy hai câu trên giao diện.
  CSV cũ chỉ thể hiện thời điểm APPROVED/question_id null, không phải bằng chứng
  trạng thái DB sau commit. Đã yêu cầu kết quả SELECT chỉ đọc để xác minh mapping,
  chapter, is_deleted và has_children của hai item; chưa kết nối DB hiện có.
- Phát hiện bug UI chắc chắn từ code: `childCount > 0` chỉ mở danh sách chương con;
  chỉ leaf chapter có đường mở câu hỏi, trong khi AI commit cho phép lưu vào mọi
  chapter active thuộc topic. Vì vậy câu trực tiếp của chương cha không truy cập
  được từ danh sách chương, dù API GET questions theo chapter_id vẫn trả chúng.
- Sửa trang lecturer/questions: chương có con có cả nút Quản lý Chapter con và
  Quản lý Câu hỏi; chương lá vẫn có nút Quản lý Câu hỏi. Truy vấn dùng chapter_id
  của chính chương, không gộp câu của các chương con. Reuse nhãn vi/en hiện có.
- Cần đối chiếu kết quả truy vấn mới để xác nhận đây chính là nguyên nhân của
  hai ID người dùng đang xem. Không thay đổi DB hoặc tự commit lại bản nháp.
- Kiểm tra bản sửa: ESLint riêng trang ngân hàng, TypeScript `--noEmit` và
  production build Next.js đều thành công. Chưa kiểm tra giao diện bằng trình duyệt.

## Bước tiếp theo đề xuất

Các ứng viên khác dựa trên vấn đề đã xác minh: xử lý lỗi lint tồn đọng rồi bật lại lint bắt buộc trong CI; thêm trang `/unauthorized` hoặc đổi đích chuyển hướng; xử lý lời gọi `/model/File/updateMany`; thêm `.env.example` chỉ chứa tên biến; cập nhật README; cân nhắc gỡ dependency Prisma không còn dùng ở frontend.

## Điểm cần làm rõ với người dùng

- Có cần đưa test (unit/E2E) vào frontend không, và dùng công cụ nào?
- Vercel dùng nhánh nào cho production và đã cấu hình `NEXT_JWT_ACCESS_SECRET` trùng backend chưa?
