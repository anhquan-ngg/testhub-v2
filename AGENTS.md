# AGENTS.md — testhub-v2 (frontend)

Hướng dẫn chung cho mọi AI agent (Claude Code, Codex, Cursor, Copilot…) làm việc trong repo này. Nội dung dựa trên code và cấu hình thực tế tại thời điểm viết; khi thấy tài liệu lệch với code, tin code và cập nhật lại file này.

## Question configs table (2026-10-23)

- QuestionGenerationScreen sends question_configs from QuestionConfigTable
  (type x level x count rows, max 10 rows / 20 questions, generated in row order).
  The creation card is full width; history and review stay in the two-column grid.
- Limits/rules live in generation-validation.ts and mirror the backend contract.
  GenerationDraftCard edits MULTIPLE_CHOICE with checkboxes (2-3 correct answers)
  and shows the type label. Labels: shared/questionGeneration.json config.*.

## Attached-file question generation (2026-10-22)

- QuestionGenerationScreen now attaches one text-layer PDF/PPTX <=20 MiB instead
  of pasted source text. Reuse learningDocumentService upload/confirm, then create
  source.mode=document with version_id and optional knowledge focus. Notes opt in.
- Explicit consent covers source content and query sent to Google. In-memory upload
  checkpoints avoid reuploading confirmed bytes on same-page retries. Do not put
  reservations/signed URLs/source bodies in browser URL/localStorage.
- Replace expired reservations only before upload; uploaded checkpoints can still
  retry confirmation. Import recovery must keep the existing ID and offer COMPLETE
  replay for UPLOADING rather than polling or creating a replacement import.
- Poll WAITING_SOURCE/QUEUED/GENERATING and display preparation stage/source file.
  Accepted batches resume by business batch ID/history; server workers prepare
  sources after navigation. Pre-batch upload checkpoints do not survive reload.
- GenerationDraftCard shows original evidence quotes/pages/slides with UNASSESSED
  quality guidance. Edits retain evidence and display a recheck warning. Continue
  using explicit revision approval and selected commit; no automatic bank writes.
- vi/en labels, cookie API client and document size/types match backend. Text API
  compatibility is retained for existing consumers/history. Setup requires the
  additional migration and BOTH workers; see [backend RAG guide, section 4](https://github.com/anhquan-ngg/testhub-v2-backend/blob/master/docs/rag-indexing.md#4-generate-questions-directly-from-an-attached-file-2026-10-23).

## Current RAG workspace (2026-10-21)

- DocumentRagPanel adds explicit index start/retry, checkpoint progress and retrieval
  preview to the document screen. Poll while extraction OR indexing is pending.
- Use learningDocumentService/ENDPOINTS.LEARNING_DOCUMENTS, cookie auth, vi/en labels.
  Query bodies remain in memory, never URLs/localStorage. Cancel retrieval on unmount
  or version change and discard stale results. Render source text as plain text.
- Explain Google transmission for indexed content AND queries. Similarity is not a
  calibrated quality result: show UNASSESSED. Retrieval does not create questions
  or write the bank. Current UI searches one selected version; API supports ten.
- Setup and demo: [RAG guide](https://github.com/anhquan-ngg/testhub-v2-backend/blob/master/docs/rag-indexing.md). Older extraction-only
  snapshots below describe the preceding implementation stage.

## Learning documents workspace (2026-10-21)

- `/{locale}/lecturer/questions/documents` is lecturer protected and linked from
  question bank/AI workspace. Use learningDocumentService/ENDPOINTS.LEARNING_DOCUMENTS.
- Business APIs use apiClient cookies. PUT signed upload URLs with separate Axios
  and withCredentials=false; never store signed URLs, source text or internal
  tokens in URL/local storage. Resume finished uploads via complete, not create.
- Require consent, PDF/PPTX <=20 MiB and explicit notes opt-in. New versions retain
  old source identities; version selection controls extraction preview.
- Render PAGE/SLIDE/NOTES as plain text. Show OCR_REQUIRED separately; EXTRACTED
  is not READY; attached-file generation prepares an index before generating. Labels use
  shared/learningDocuments.json in vi/en. Revoke is not physical file deletion.

## 0. Trước khi làm việc

1. Đọc [`CONTINUITY.md`](CONTINUITY.md) để nắm trạng thái hiện tại, việc dở dang và các vấn đề đã biết.
2. Chạy `git status` và `git branch --show-current`. Không ghi đè, reset hay stash thay đổi chưa commit của người dùng (ví dụ thư mục `reports/` đang untracked) nếu chưa được đồng ý.
3. Sau mỗi nhiệm vụ có thay đổi đáng kể (tính năng, sửa lỗi, quyết định kiến trúc, phát hiện vấn đề mới), cập nhật `CONTINUITY.md`.

**Thứ tự ưu tiên khi hướng dẫn mâu thuẫn:** yêu cầu trực tiếp của người dùng → file này → `README.md`.
File `../../AGENTS.md` (thư mục `testhub/` bên ngoài repo) mô tả một kiến trúc monorepo khác (`apps/web`, pnpm, Zustand, TanStack Query, `react-hook-form`, `/api/v1/`…) **không khớp** với repo này. Không áp dụng các lệnh và đường dẫn trong file đó cho repo này.

`README.md` mô tả thiết lập frontend Next.js 16; migration và ORM thuộc repository backend.

## 1. Vai trò và stack

Giao diện web của hệ thống thi trực tuyến TestHub cho ba vai trò `ADMIN`, `LECTURER`, `STUDENT`. Toàn bộ dữ liệu lấy từ backend NestJS ở repo `testhub-v2-backend` (cùng cấp, `../testhub-v2-backend`); repo này không truy cập DB trực tiếp.

| Thành phần | Thực tế trong code |
| --- | --- |
| Framework | Next.js 16 (App Router, `next dev --turbopack`), React 19.1, TypeScript `strict` |
| Styling / UI | Tailwind CSS 4 (`@tailwindcss/postcss`), Radix UI, component kiểu shadcn (`components.json`, style `new-york`), `lucide-react`, `sonner` (toast) |
| State | Redux Toolkit + `react-redux` (`src/store/`) |
| HTTP | `axios` qua `src/lib/api-client.ts` |
| Realtime | `socket.io-client` (`src/components/providers/SocketProvider.tsx`), `EventSource` (SSE) |
| Auth phía edge | `jose` verify JWT trong `src/proxy.ts` (quy ước `proxy` của Next 16, thay cho `middleware`) |
| i18n | `next-intl` (vi/en, URL có tiền tố `/vi` hoặc `/en`, cookie `NEXT_LOCALE` để chọn locale cho URL chưa có tiền tố) — xem mục 4a |
| Khác | `recharts` (biểu đồ), `katex`/`react-katex` (công thức), `next-themes` |
| Enum dùng chung | `src/types/backend-enums.ts`, đồng bộ giá trị với schema Prisma ở backend |
| Package manager | npm (`package-lock.json`) |

Chưa có framework test (không có Jest/Vitest/Playwright, không có file test).

## 2. Cấu trúc thư mục quan trọng

```
src/
  proxy.ts                   # verify access_token, chỉ thử refresh, chặn route theo role
  app/
    [locale]/layout.tsx      # root layout, <Providers>, <Toaster>
    [locale]/page.tsx, login/, signup/, auth/callback/   # trang public + callback OAuth
    [locale]/(admin)/dashboard/...    # ADMIN: dashboard, exams, questions, users, report
    [locale]/(student)/home, exam/[id], result, profile   # STUDENT
    [locale]/lecturer/...    # LECTURER: dashboard, exams (create/edit/monitor/report), questions, profile
    api/                     # thư mục rỗng, không có route handler
  components/
    ui/                      # primitive UI kiểu shadcn (button, dialog, table…)
    layout/                  # app-header, app-sidebar, nav-items, sidebar-store
    providers/               # Providers (Redux + UserLoader + SocketProvider), SocketProvider
    question-import/, exam-print/, common/student/   # component theo tính năng
    MathInput.tsx, MathRenderer.tsx, NotificationBell.tsx, UserLoader.tsx
  constants/endpoints.ts     # toàn bộ đường dẫn API backend
  constants/routes.ts        # vài route + tên cookie
  lib/                       # api-client, socket, exam-utils, utils (cn)
  i18n/                      # config, routing, request, navigation, useEnumLabels
  messages/en/, messages/vi/ # JSON theo trang và vai trò
  hooks/                     # useAuth, useFiles (presigned upload), useS3 (API /s3 cũ)
  services/authServices.ts   # gọi /auth/*
  store/                     # Redux store, slices (authSlice → state.user, examSlice → state.exam), typed hooks
  types/                     # kiểu dữ liệu (backend-enums, exam, question, question-import, auth)
public/                      # static assets
.github/workflows/ci.yml     # CI trên master/dev: npm ci → lint (chưa chặn) → build
vercel.json                  # override Build Command của Vercel thành npm run build
```

## 3. Lệnh thường dùng

Chạy tại thư mục gốc repo.

| Mục đích | Lệnh | Ghi chú |
| --- | --- | --- |
| Cài dependencies | `npm install` | |
| Chạy dev | `npm run dev` | `next dev --turbopack`, Node heap 8 GB; mặc định http://localhost:3000 |
| Build | `npm run build` | `next build --turbopack`; cần biến `NEXT_JWT_ACCESS_SECRET` (hoặc `NEXT_JWT_SECRET`) vì `src/proxy.ts` throw khi thiếu |
| Chạy bản build | `npm run start` | |
| Lint | `npm run lint` | `eslint` (không `--fix`), config `next/core-web-vitals` + `next/typescript` |
| Typecheck | `npx tsc --noEmit --incremental false` | Không có script riêng; `--incremental false` tránh ghi `tsconfig.tsbuildinfo` |
| Test | Chưa có | |

Để chạy đầy đủ cần backend chạy ở `NEXT_PUBLIC_API_URL` (mặc định `http://localhost:3001`) — xem `../testhub-v2-backend/AGENTS.md`.

## 4. Quy ước code và cách thêm/sửa tính năng

- **Trang** nằm trong `src/app/**/page.tsx`; hầu hết là Client Component (`"use client"`) tự gọi API trong `useEffect` bằng `apiClient`, quản lý loading/error bằng `useState` và báo lỗi bằng `toast` của `sonner`. Theo pattern này khi sửa trang hiện có; không tự đưa thêm thư viện data-fetching/form nếu người dùng không yêu cầu.
- **Gọi API:** luôn dùng `apiClient` từ `@/lib/api-client` (đã có `withCredentials` và tự refresh khi 401) và đường dẫn từ `ENDPOINTS` trong `@/constants/endpoints`. Endpoint mới → thêm vào `ENDPOINTS` trước, tránh hardcode chuỗi URL trong trang.
- **Kiểu dữ liệu:** đặt trong `src/types/`; một số trang khai báo type cục bộ (ví dụ `PageResult<T>`). Danh sách phân trang từ backend có dạng `{ data, total, page, limit }`.
- **Phân quyền route:** thêm prefix route mới vào `roleBasedRoutes` trong `src/proxy.ts` (so khớp sau khi bỏ tiền tố locale), và mục menu vào `src/components/layout/nav-items.ts` nếu cần. Route public là `/{locale}`, `/{locale}/login`, `/{locale}/signup`.
- **State người dùng:** `state.user` (`authSlice`) được nạp bởi `UserLoader` qua `GET /auth/me`; dùng `useAppSelector`/`useAppDispatch` từ `@/store/hook`.
- **Realtime:** dùng `useSocket()` từ `SocketProvider` (namespace `/notifications`); SSE dùng `new EventSource(url, { withCredentials: true })` với `url` ghép từ `NEXT_PUBLIC_API_URL` và `ENDPOINTS.EXAM_RUNTIME.*`, như `src/app/[locale]/(student)/home/page.tsx`.
- **Upload file:** dùng `useFiles` (`/files/upload-url` → PUT presigned URL → `/files/:id/confirm`). `useS3` là API cũ, hiện chỉ còn `getViewUrl` được dùng.
- **UI:** tái sử dụng `src/components/ui/*` và helper `cn` (`@/lib/utils`); icon từ `lucide-react`. Alias import `@/*` → `src/*`.
- **Nhãn hiển thị:** text giao diện lấy từ `src/messages/<locale>/<role-or-shared>/<page>.json` qua next-intl (mục 4a); không hardcode chuỗi tiếng Việt/Anh trong component mới.
- Comment trong code dùng lẫn tiếng Việt và tiếng Anh; theo phong cách của file đang sửa.
- ESLint đang báo lỗi với `any`: code mới không thêm `any` (có sẵn nhiều chỗ cũ — không cần sửa nếu nằm ngoài phạm vi nhiệm vụ).

## 4a. Đa ngôn ngữ (i18n)

- Ngôn ngữ: `vi` (mặc định, nguồn chuẩn) và `en`. Trang nằm dưới `src/app/[locale]/`; URL chưa có tiền tố được proxy chuyển hướng theo cookie/ngôn ngữ trình duyệt. `roleBasedRoutes` so khớp đường dẫn sau khi bỏ tiền tố locale.
- Cấu hình: `src/i18n/config.ts` (danh sách locale, tên cookie), `src/i18n/routing.ts` (routing), `src/i18n/request.ts` (nạp message theo segment locale), `src/i18n/navigation.ts` (Link, router, pathname có locale), plugin trong `next.config.ts`. `RootLayout` bọc `NextIntlClientProvider` và đặt `<html lang>`.
- Message nằm trong `src/messages/vi` và `src/messages/en`, chia theo `shared`, `public`, `admin`, `student`, `lecturer` và trang. Hai locale phải **cùng cấu trúc key**; chạy `node scripts/check-i18n.cjs` để kiểm tra. Key được kiểm tra kiểu theo `src/messages/vi/index.ts` (`src/types/next-intl.d.ts`), nên `t("sai.key")` báo lỗi khi typecheck.
- Dùng trong component: `const t = useTranslations("namespace")` (Client Component) hoặc `await getTranslations("namespace")` (Server Component). Không hardcode chuỗi giao diện; thêm key vào cả hai file. Chuỗi có số lượng dùng ICU (`{count, plural, one {…} other {…}}`).
- Enum backend → nhãn: dùng `useEnumLabels()` (`src/i18n/useEnumLabels.ts`, namespace `enums`). File `src/lib/constansts.ts` (map nhãn tiếng Việt cũ) đã bị xóa.
- Nhãn menu: `nav-items.ts` chỉ giữ `labelKey` (namespace `nav`), component dịch lúc render.
- Định dạng ngày/số: dùng `intlLocales[locale]` từ `src/i18n/config.ts` thay vì hardcode `"vi-VN"`.
- Điều hướng nội bộ: dùng `Link`, `useRouter`, `usePathname` từ `@/i18n/navigation` để giữ locale; `useParams` và `useSearchParams` vẫn từ `next/navigation`.
- Đổi ngôn ngữ: `<LanguageSwitcher />` (`src/components/common/`) đổi URL và giữ đường dẫn/query hiện tại; đã có ở header học viên/giảng viên, layout admin, trang login/signup.

## 5. Tích hợp với backend (`../testhub-v2-backend`)

- **Base URL:** `NEXT_PUBLIC_API_URL` (mặc định `http://localhost:3001` trong code), không có tiền tố `/api` hay version. Swagger backend: `/api-docs`.
- **Contract:** không có package/type dùng chung hay codegen; contract là thủ công giữa `src/constants/endpoints.ts` và các controller `@Controller(...)` của backend. Khi thêm/đổi endpoint, đối chiếu controller, DTO (class-validator, `whitelist: true` sẽ loại bỏ field lạ) và response thực tế ở backend.
- **Xác thực bằng cookie httpOnly do backend đặt (cập nhật 2026-10-25):**
  - `access_token` (15 phút) và `refresh_token` (7 ngày, `path: /auth/refresh`) — tên cookie khai báo ở `src/constants/routes.ts` và `src/proxy.ts`.
  - `src/lib/api-client.ts`: khi 401 gọi `POST /auth/refresh` rồi retry; chỉ refresh 401 mới chuyển về `/login?reauth=1`. Network/5xx giữ khả năng phục hồi. Web Locks phối hợp giữa tab, backend có grace cho refresh đồng thời.
  - `src/proxy.ts`: verify `access_token` bằng `NEXT_JWT_ACCESS_SECRET` (fallback `NEXT_JWT_SECRET`), giá trị phải trùng `JWT_ACCESS_SECRET` của backend; đọc `role` trong payload để chuyển hướng `ADMIN → /dashboard`, `LECTURER → /lecturer`, `STUDENT → /home`.
  - Proxy kiểm tra sơ bộ JWT có sid/token_use=access. Thiếu/hết hạn chuyển tới `/{locale}/auth/session-recovery`; trình duyệt gọi /auth/me qua refresh client trước khi quay lại trang bảo vệ. Proxy không refresh hoặc xóa cookie. Backend kiểm tra AuthSession trên từng request.
  - STUDENT có một phiên trình duyệt hoạt động; đăng nhập mới tạo PENDING và cần xác nhận. Có bài IN_PROGRESS phải được giảng viên phụ trách/admin duyệt. LECTURER/ADMIN giữ nhiều phiên và logout chỉ thu hồi phiên hiện tại. Trang /auth/session-transfer công khai chỉ hiển thị xác nhận, không tải dữ liệu riêng.
  - Cookie phải thuộc host frontend (localhost khác cổng được); khác host cần cùng-origin reverse proxy/BFF. Xem [auth-session guide](https://github.com/anhquan-ngg/testhub-v2-backend/blob/master/docs/auth-sessions.md). Migration auth-session chưa tự áp lên DB người dùng; token cũ phải đăng nhập lại.
  - OAuth: `useAuth.handleGoogleLogin` chuyển trang tới `${NEXT_PUBLIC_API_URL}/auth/google`; backend redirect về `FRONTEND_URL`.
- **Socket.IO:** `${NEXT_PUBLIC_API_URL}/notifications`, gửi cookie JWT; backend không tin userId/userRole từ query. Kiểm tra thu hồi định kỳ 5 giây. Sự kiện: `notification:unread`, `notification:new`, `notification:unread_count`, `notification:mark_read`, `notification:mark_all_read`, `dashboard:update`, `exam:registration_approved`, `exam:student_added`, `exam:registration_requested`.
- **SSE:** `ENDPOINTS.EXAM_RUNTIME.EVENTS` (sinh viên) và `MONITOR_EVENTS` (giảng viên giám sát).
- **CORS:** backend chỉ chấp nhận origin trong `FRONTEND_URL`; chạy frontend ở origin khác sẽ bị chặn cookie/CORS.

## 6. Biến môi trường

Không có `.env.example`. Biến được đọc trong code: `NEXT_PUBLIC_API_URL`, `NEXT_JWT_ACCESS_SECRET` (fallback `NEXT_JWT_SECRET`). File `.env` local còn khai báo một số biến khác mà code hiện không đọc. Biến `NEXT_PUBLIC_*` sẽ bị nhúng vào bundle trình duyệt — không bao giờ đặt secret vào biến có tiền tố này. Khi thêm biến mới, ghi tên biến vào mục này (không ghi giá trị).

## 7. Kiểm tra cần chạy theo phạm vi thay đổi

| Phạm vi | Kiểm tra tối thiểu |
| --- | --- |
| Chỉ tài liệu | Không cần build/test; rà lại đường dẫn và lệnh được nhắc tới |
| Component/trang | `npx tsc --noEmit --incremental false` + `npx eslint <file đã sửa>` |
| `src/proxy.ts`, `api-client.ts`, auth, socket | Typecheck + lint; kiểm tra thủ công luồng login/refresh/logout với backend local nếu có thể |
| Endpoint / contract | Typecheck + đối chiếu controller backend (`../testhub-v2-backend/src/**/*.controller.ts`) |
| Trước khi bàn giao thay đổi lớn | `npm run lint` + `npm run build` |

Lint toàn repo hiện đang có lỗi tồn đọng (xem `CONTINUITY.md`); đánh giá theo file đã sửa thay vì yêu cầu toàn repo sạch. Ghi kết quả thực tế vào `CONTINUITY.md`; không báo pass khi chưa chạy.

## 8. An toàn: secrets, dữ liệu, môi trường thật

- `.env` ở thư mục gốc (gitignored qua `.env*`) chứa secret thật. **Không đọc nội dung, in ra, sao chép, commit hay đưa giá trị vào tài liệu/log/tin nhắn.** Tên biến lấy từ code (mục 6).
- Không hardcode secret, URL production hay token trong source.
- Không log token, cookie, mật khẩu hay dữ liệu cá nhân (code hiện có `console.log`/`console.error` — không thêm log chứa dữ liệu nhạy cảm).
- `reports/` đang untracked (tài liệu .docx của người dùng) — không sửa, xóa hay commit.
- Không commit, push, merge, tạo PR hay deploy khi chưa được yêu cầu rõ ràng. Nhánh làm việc hiện tại là `dev`; nhánh chính là `master`. Chưa có thông tin về quy trình deploy frontend trong repo.
- Không chạy lệnh tác động tới DB/backend thật (repo này không có migration; mọi thay đổi schema thuộc backend).
- Không cài/gỡ/nâng cấp dependency nếu nhiệm vụ không yêu cầu.

## 9. File generated / không sửa trực tiếp

- `.next/`, `node_modules/`, `tsconfig.tsbuildinfo`, `next-env.d.ts` — sinh tự động (đều gitignored).
- `package-lock.json` — chỉ thay đổi qua `npm install`.
- `src/components/ui/*` — sinh từ mẫu shadcn; có thể chỉnh khi cần nhưng ưu tiên tái sử dụng thay vì viết lại.
- Frontend không còn import `@prisma/client` trong `src/`. Khi backend thay đổi các enum `UserRole`, `QuestionType`, `QuestionFormat`, `SubmissionStatus`, cập nhật `src/types/backend-enums.ts` theo `../testhub-v2-backend/prisma/schema.prisma`; không sửa Prisma Client sinh trong `node_modules/`.

## 10. AI generation and review workspace

- `/{locale}/lecturer/questions/generate` is linked from the lecturer question
  bank and already covered by `/lecturer` route authorization. It supports uploaded
  PDF/PPTX RAG generation, batch history/polling, edits, explicit approval/rejection and selected
  bank commit; localized messages are in shared/questionGeneration.json (vi/en).
- Call APIs through `questionGenerationService` and ENDPOINTS.QUESTION_GENERATION.
  Keep runtime types aligned with backend persisted enums; VALID is not APPROVED.
- Active parent chapters can also own AI/bank questions. Keep question management
  available alongside subchapter management; never make these mutually exclusive.
- Send the displayed revision on edit/review and exact approved item/revision
  references on commit. Edits reset approval; stale revisions return 409. Never
  auto-approve an edit or auto-commit generation output. Preserve replay safety.
- Source text and internal provider keys/tokens must not enter URL/local storage.
  Only the business batch ID is retained in the resumable URL. Check history after
  an ambiguous creation across reload (the idempotency key is only in memory).
- Block commit while unsaved edits are open, discard selection after a revision
  changes, and reload current state after ambiguous mutations. No new form/query
  library or dependency is required for this workflow.
