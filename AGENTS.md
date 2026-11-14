# AGENTS.md — testhub-v2 (frontend)

## Chapter hierarchy (2026-10-27)

- Use lib/chapter-tree.ts for iterative arbitrary-depth breadcrumbs and ancestor question visibility; avoid recursive rendering/traversal of unbounded trees.
- Exam BY_CHAPTER rows store one chapter_id and include all descendants. ChapterPicker searches full paths and pages rendered options; truncating labels must never change stored IDs.
- Backend handles globally distinct question allocation across overlapping branches and returns CHAPTER_DISTRIBUTION_INSUFFICIENT when quotas cannot all be filled.
- Verify deep-tree traversal, bounded rendering and saved chapter selections under section 7. Existing node scripts/check-chapter-tree.cjs provides only partial evidence; source/AST assertions do not prove behavior. Backend contract: ../testhub-v2-backend/docs/chapter-hierarchy.md.

## Grounded evidence-failure guidance

- AI_INSUFFICIENT_EVIDENCE is distinct from AI_OUTPUT_INVALID. Optional batch
  error_details.issues contains only slot and a bounded reason enum; empty/missing
  issues mean the deficient slots are unknown, not that every slot failed.
- Resolve 1-based slots through frozen plan items expanded by count; use owned
  labels/objectives/type/format, not provider-provided identifiers or free text.
- Show vi/en actionable source/objective guidance. Do not automatically retry,
  split batches, create drafts or write bank questions on an evidence failure.
- Preserve success contracts, citations and UNASSESSED/recheck guidance.

## Knowledge matrix authoring (2026-10-25)

- Generation uploads topic-owned documents without selecting a chapter. Create/resume a durable plan via ?plan=id, edit tree and topic x cognition matrix, save, confirm, then generate.
- KnowledgePlanWorkspace uses react-hook-form + Zod; chapters support arbitrary-depth parent references with cycle checks. Sources remain PAGE/SLIDE/NOTES positions.
- PlanCoverage compares frozen requested cells with generated/approved/saved drafts. A saved question uses its frozen plan target, not model-provided chapter IDs.
- Matching/creating bank chapters happens only at explicit approved commit. Proposal labels distinguish heading-derived versus inferred topics; lecturer review remains required.
- New labels live in shared/questionGeneration.json plan.* for both locales. Config rows: max20, questions: max20. CONTINUITY.md stays local and ignored/untracked.


Hướng dẫn chung cho mọi AI agent (Claude Code, Codex, Cursor, Copilot…) làm việc trong repo này. Nội dung dựa trên code và cấu hình thực tế tại thời điểm viết; khi thấy tài liệu lệch với code, tin code và cập nhật lại file này.

## Question configs table (2026-10-23)

- QuestionGenerationScreen sends question_configs from QuestionConfigTable
  (type x level x count rows, max 20 rows / 20 questions, generated in row order).
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

Chưa cấu hình framework test (Jest/Vitest/Playwright) hay package script `test`/`test:e2e`. Có các script kiểm tra trong `scripts/`; phạm vi và giới hạn sử dụng được quy định ở mục 7.

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
- Message nằm trong `src/messages/vi` và `src/messages/en`, chia theo `shared`, `public`, `admin`, `student`, `lecturer` và trang. Hai locale phải **cùng cấu trúc key**; khi sửa message, chạy công cụ có sẵn `node scripts/check-i18n.cjs` để kiểm tra key, placeholder và cú pháp ICU, không coi đây là kiểm tra hành vi hay giao diện. Key được kiểm tra kiểu theo `src/messages/vi/index.ts` (`src/types/next-intl.d.ts`), nên `t("sai.key")` báo lỗi khi typecheck.
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
  - Cookie phải thuộc host frontend (localhost khác cổng được); khác host cần cùng-origin reverse proxy/BFF. Xem [auth-session guide](https://github.com/anhquan-ngg/testhub-v2-backend/blob/dev/docs/auth-sessions.md). Migration auth-session chưa tự áp lên DB người dùng; token cũ phải đăng nhập lại.
  - OAuth: `useAuth.handleGoogleLogin` chuyển trang tới `${NEXT_PUBLIC_API_URL}/auth/google`; backend redirect về `FRONTEND_URL`.
- **Socket.IO:** `${NEXT_PUBLIC_API_URL}/notifications`, gửi cookie JWT; backend không tin userId/userRole từ query. Kiểm tra thu hồi định kỳ 5 giây. Sự kiện: `notification:unread`, `notification:new`, `notification:unread_count`, `notification:mark_read`, `notification:mark_all_read`, `dashboard:update`, `exam:registration_approved`, `exam:student_added`, `exam:registration_requested`.
- **SSE:** `ENDPOINTS.EXAM_RUNTIME.EVENTS` (sinh viên) và `MONITOR_EVENTS` (giảng viên giám sát).
- **CORS:** backend chỉ chấp nhận origin trong `FRONTEND_URL`; chạy frontend ở origin khác sẽ bị chặn cookie/CORS.

## 6. Biến môi trường

Không có `.env.example`. Biến được đọc trong code: `NEXT_PUBLIC_API_URL`, `NEXT_JWT_ACCESS_SECRET` (fallback `NEXT_JWT_SECRET`). File `.env` local còn khai báo một số biến khác mà code hiện không đọc. Biến `NEXT_PUBLIC_*` sẽ bị nhúng vào bundle trình duyệt — không bao giờ đặt secret vào biến có tiền tố này. Khi thêm biến mới, ghi tên biến vào mục này (không ghi giá trị).

## 7. Kiểm tra cần chạy theo phạm vi thay đổi

### Nguyên tắc kiểm chứng

- **Không tạo script xác minh dùng một lần** như `check_*.js`, `verify_*.js`, `validate_*.js` hoặc file tương đương dù đổi tên, ngôn ngữ hay thư mục. Không chuyển chúng sang thư mục tạm để lách quy tắc.
- Không dùng script chỉ tìm chuỗi trong source, đếm đoạn code hoặc sao chép logic triển khai để kết luận tính năng đúng. Tìm kiếm source/AST được phép cho điều tra, không thay thế kiểm tra hành vi quan sát được.
- Ưu tiên công cụ và package scripts có sẵn. Trước khi chọn lệnh, đọc `package.json`, `package-lock.json`, cấu hình Next.js, TypeScript, lint và test hiện tại; không tự đoán lệnh hoặc suy ra framework test từ dependency bắc cầu. Chạy kiểm tra tập trung trước, mở rộng khi ảnh hưởng code dùng chung, routing, cấu hình hoặc nhiều package/repo liên quan.
- Với thay đổi nhỏ về text/giao diện: lint theo file, kiểm tra giao diện bằng trình duyệt/công cụ sẵn có, typecheck khi liên quan types/props. Không thêm test chỉ khẳng định chuỗi CSS hay cấu trúc triển khai nội bộ.
- Với thay đổi hành vi/sửa bug: cập nhật test liên quan hoặc thêm regression test có giá trị theo framework và convention hiện có, kiểm tra kết quả quan sát được cùng trường hợp lỗi/biên phù hợp. Quy tắc này không cấm file test chính thức hay công cụ được duy trì có chủ đích; không dùng danh nghĩa đó để hợp thức hóa script dùng một lần.
- Với API, authentication, authorization hoặc luồng nhiều bước: dùng integration/E2E phù hợp nếu có, gồm cả trường hợp bị từ chối (chưa đăng nhập, hết phiên, sai quyền). Đối chiếu source/contract và build thành công không chứng minh nghiệp vụ đúng.
- Không tự cài framework test cho thay đổi nhỏ. Nếu thiếu công cụ hoặc môi trường kiểm tra, nêu rõ khoảng trống và các bước xác minh thủ công cụ thể (điều kiện, thao tác, kết quả mong đợi); không tạo script tạm để che giấu khoảng trống.
- Next.js hiện khóa ở **16.1.1**, dùng **App Router** (`src/app/`); xác định lại phiên bản/router khi cấu hình thay đổi và giữ đúng ranh giới Server/Client Component. Dùng ESLint riêng: không mặc định `next lint` tồn tại hoặc `next build` đã chạy lint (Next.js 16 không chạy lint trong build). Không tắt typecheck, bỏ qua lỗi build hay nới lint để làm kiểm tra pass.
- Không chạy lại kiểm tra tốn thời gian khi chưa có thay đổi hoặc bằng chứng mới cần kiểm chứng. Chạy test ở chế độ kết thúc sau một lượt theo runner thực tế; không để watch chạy ngoài ý muốn.
- Các script có sẵn trong `scripts/` chỉ cung cấp bằng chứng đúng phạm vi chúng thực sự kiểm tra. Kiểm tra key/ICU không chứng minh giao diện đúng; assertion source/AST không chứng minh hành vi đúng. Không xóa hoặc viết lại script có sẵn chỉ vì tên file, và không nhân rộng chúng thành script dùng một lần mới.

### Chọn kiểm tra theo thay đổi

| Phạm vi | Kiểm tra tối thiểu |
| --- | --- |
| Chỉ tài liệu | Không cần build/test; rà lại đường dẫn, lệnh và diff |
| Text/giao diện nhỏ | `npm run lint -- <file code đã sửa>`; kiểm tra giao diện nếu có công cụ; typecheck khi liên quan types/props; sửa message thì chạy kiểm tra key/ICU ở mục 4a |
| Component/trang có đổi hành vi | `npx tsc --noEmit --incremental false` + lint theo file; test hành vi/regression theo công cụ hiện có, hoặc ghi rõ khoảng trống và bước kiểm tra thủ công |
| `src/proxy.ts`, `api-client.ts`, auth, socket | Typecheck + lint; integration/E2E nếu có, nếu thiếu thì kiểm tra thủ công login/refresh/logout với backend local, gồm lỗi/hết phiên/sai quyền và phục hồi |
| Endpoint / contract, luồng nhiều bước | Typecheck + lint + đối chiếu controller/DTO backend (`../testhub-v2-backend/src/`); integration/E2E nếu có cho luồng thành công và bị từ chối, hoặc bước kiểm tra thủ công cụ thể |
| Code dùng chung, routing, cấu hình, nhiều package/repo hoặc thay đổi lớn | Mở rộng lint/typecheck và kiểm tra hành vi tới các nơi bị ảnh hưởng; `npm run lint` + `npm run build` khi cần kiểm tra toàn ứng dụng, không thay thế test nghiệp vụ |

Repo hiện chưa có test runner, script `test`/`test:e2e` hay cấu hình integration/E2E; không tự chạy các lệnh đó. Ví dụ khi thiếu E2E cho luồng được sửa: dùng backend local và tài khoản thử đúng vai trò, thực hiện luồng từ đầu tới cuối và đối chiếu UI/response mong đợi; lặp lại khi chưa đăng nhập/hết phiên/sai vai trò, xác nhận không đọc hoặc ghi được dữ liệu trái quyền. Báo rõ nếu thiếu backend/tài khoản nên chưa thực hiện được; điều chỉnh các bước theo tính năng thực tế.

Lint toàn repo hiện đang có lỗi tồn đọng (xem `CONTINUITY.md`); phân biệt lỗi có sẵn với lỗi do thay đổi, không yêu cầu dọn lỗi ngoài phạm vi hoặc nới rule để pass. CI chạy lint riêng với `continue-on-error: true`, nên CI/build xanh không đồng nghĩa lint sạch.

### Trước khi hoàn tất

- Kiểm tra `git diff`, diff staged nếu có và `git status --short --untracked-files=all`. Chỉ dọn artifact không cần thiết do chính agent tạo trong nhiệm vụ hiện tại; không xóa hàng loạt theo tên `check_*` hay xóa/sửa file có sẵn của người dùng.
- Báo cáo ngắn gọn thay đổi, **lệnh thực sự đã chạy**, kết quả và phần chưa xác minh (kèm bước kiểm tra thủ công khi thiếu công cụ). Không tuyên bố đã test hoặc kiểm tra giao diện nếu chưa thực hiện. Cập nhật `CONTINUITY.md` theo phạm vi ở mục 0, không ghi pass suy đoán.

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
