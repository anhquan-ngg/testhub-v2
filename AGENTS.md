# AGENTS.md — testhub-v2 (frontend)

Hướng dẫn chung cho mọi AI agent (Claude Code, Codex, Cursor, Copilot…) làm việc trong repo này. Nội dung dựa trên code và cấu hình thực tế tại thời điểm viết; khi thấy tài liệu lệch với code, tin code và cập nhật lại file này.

## 0. Trước khi làm việc

1. Đọc [`CONTINUITY.md`](CONTINUITY.md) để nắm trạng thái hiện tại, việc dở dang và các vấn đề đã biết.
2. Chạy `git status` và `git branch --show-current`. Không ghi đè, reset hay stash thay đổi chưa commit của người dùng (ví dụ thư mục `reports/` đang untracked) nếu chưa được đồng ý.
3. Sau mỗi nhiệm vụ có thay đổi đáng kể (tính năng, sửa lỗi, quyết định kiến trúc, phát hiện vấn đề mới), cập nhật `CONTINUITY.md`.

**Thứ tự ưu tiên khi hướng dẫn mâu thuẫn:** yêu cầu trực tiếp của người dùng → file này → `README.md`.
File `../../AGENTS.md` (thư mục `testhub/` bên ngoài repo) mô tả một kiến trúc monorepo khác (`apps/web`, pnpm, Zustand, TanStack Query, `react-hook-form`, `/api/v1/`…) **không khớp** với repo này. Không áp dụng các lệnh và đường dẫn trong file đó cho repo này.

`README.md` cũng đã lỗi thời ở một số điểm (Next.js 15, TanStack Query, thư mục `prisma/`, `generated/`, `src/app/api/`, bước `npx prisma migrate dev`) — xem mục "Vấn đề đã xác minh" trong `CONTINUITY.md`.

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
| Enum dùng chung | Import từ `@prisma/client` (xem cảnh báo ở mục 9) |
| Package manager | npm (`package-lock.json`) |

Chưa có framework test (không có Jest/Vitest/Playwright, không có file test).

## 2. Cấu trúc thư mục quan trọng

```
src/
  proxy.ts                   # verify cookie access_token, tự refresh, chặn route theo role
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
  types/                     # kiểu dữ liệu (exam, question, question-import, auth)
public/                      # static assets
.github/workflows/ci.yml     # CI: install → zenstack generate → lint → build (chỉ trigger trên nhánh main)
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
- **Xác thực bằng cookie httpOnly do backend đặt:**
  - `access_token` (15 phút) và `refresh_token` (7 ngày, `path: /auth/refresh`) — tên cookie khai báo ở `src/constants/routes.ts` và `src/proxy.ts`.
  - `src/lib/api-client.ts`: khi 401 gọi `POST /auth/refresh` một lần rồi retry; thất bại → chuyển về `/login`.
  - `src/proxy.ts`: verify `access_token` bằng `NEXT_JWT_ACCESS_SECRET` (fallback `NEXT_JWT_SECRET`), giá trị phải trùng `JWT_ACCESS_SECRET` của backend; đọc `role` trong payload để chuyển hướng `ADMIN → /dashboard`, `LECTURER → /lecturer`, `STUDENT → /home`.
  - OAuth: `useAuth.handleGoogleLogin` chuyển trang tới `${NEXT_PUBLIC_API_URL}/auth/google`; backend redirect về `FRONTEND_URL`.
- **Socket.IO:** `${NEXT_PUBLIC_API_URL}/notifications`, gửi `userId`, `userRole` qua query. Sự kiện: `notification:unread`, `notification:new`, `notification:unread_count`, `notification:mark_read`, `notification:mark_all_read`, `dashboard:update`, `exam:registration_approved`, `exam:student_added`, `exam:registration_requested`.
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
- **Cảnh báo `@prisma/client`:** các file `src/app/[locale]/(admin)/dashboard/page.tsx`, `src/app/[locale]/(admin)/dashboard/users/page.tsx`, `src/app/[locale]/(student)/exam/[id]/page.tsx`, `src/app/[locale]/lecturer/exams/edit/[id]/page.tsx`, `src/types/question.ts` import enum từ `@prisma/client`, nhưng `schema.zmodel`, `prisma/` và `generated/` đã bị xóa khỏi repo (commit `edc1f7e`). Enum hiện đến từ Prisma Client cũ còn trong `node_modules/.prisma/client`. Không sửa thư mục đó và tránh thêm import mới từ `@prisma/client` cho tới khi người dùng chọn cách xử lý (xem "Điểm cần làm rõ" trong `CONTINUITY.md`).
