# TestHub Web Frontend

## Overview

TestHub is the web interface for an online examination system, with separate experiences for students, lecturers and administrators. This repository contains the Next.js frontend; the sibling NestJS backend owns business rules, authentication sessions, database access, migrations, storage integration and background jobs. The FastAPI AI service is another separate repository.

The interface supports Vietnamese (`vi`, the default) and English (`en`). Routes always include a locale prefix, such as `/vi/login` or `/en/lecturer`. English interface labels do **not** imply English AI output: question-generation prompts currently request Vietnamese questions.

## Key Features

| Role | Main responsibilities |
| --- | --- |
| `STUDENT` | Exam registration and participation, practice exams, submission results/history and profile management |
| `LECTURER` | Question banks, nested chapters, exam authoring and monitoring, grading/regrading, reports and document-assisted question generation |
| `ADMIN` | User/role management, dashboards, exam/question oversight and session-transfer approvals |

The question bank supports `SINGLE_CHOICE`, `MULTIPLE_CHOICE` and `ESSAY`. AI generation currently supports only the two choice types.

### Exam management, monitoring and results

- Create/edit exams using shared fields and validation. Duration must be a positive whole number of minutes; the end must follow the start. Selection modes are manual, random count, type/cognitive-level distribution and chapter quotas.
- Chapter selection supports arbitrary-depth paths and includes descendants. Overlapping branches are allowed; the backend allocates distinct questions across quota rows and rejects insufficient distributions.
- The exam list keeps search (`q`) and pagination (`page`) in the URL. Validated `returnTo` navigation preserves that context through create/edit/monitor pages.
- Manual creation first creates a private exam, attaches questions and publishes if requested. After a partial failure, keep the existing exam ID and use recovery rather than creating another exam. UI submit locks do not replace backend idempotency.
- Unsaved exam edits require confirmation when leaving; reload/close uses the browser warning. In-app Back/Forward protection depends on Navigation API support. There is no exam-editor autosave or durable local draft.
- Monitoring combines SSE with a 30-second REST backstop and 5-second SSE reconnect delay. Event ordering prevents older snapshots from replacing newer data; missing events trigger resynchronization. Temporary refresh failures retain visibly stale data and disable extensions; 403/404 clears the roster.
- Time extensions accept whole minutes from 1 to 120 for an active attempt. They do not change the exam's general end time. Verify an ambiguous result before retrying an extension. Registration removal, retries and device-transfer approval require confirmation.
- Browser focus, visibility, fullscreen and clipboard signals are advisory, not proof of misconduct. Exam presence uses REST heartbeats, not a camera/MediaPipe proctoring service.
- Reports distinguish missing details from request failures and ungraded (`null`) scores from zero. Incomplete/ungraded report printing and ungraded submission PDF output are gated because the PDF renderer does not correctly represent null scores. Regrading uses a private revisioned draft; save before explicitly publishing, and reload after conflicts or ambiguous mutations.

### Question import

Use the localized import workspace and its Excel/Word template links. Official files are also available as [Excel](public/templates/question-import-template.xlsx) and [Word](public/templates/question-import-template.docx) downloads.

- Accept `.xlsx`/`.docx` files up to 20 MiB; empty files are rejected. Imports support the three bank question types, chapter paths and embedded images.
- Review, edit and revalidate before committing. Only selected valid rows enter the bank. The UI's duplicate policy is `SKIP`; parsing itself does not automatically remove duplicates.
- Choice editing preserves line breaks and assigns unused A-F keys. Re-read import state after ambiguous commit responses; replay completion for an uploaded file rather than creating another import.
- This imports **questions**, not full exam definitions, schedules or grading structures. The backend can optionally attach imported questions to an existing manual exam.

Parser fixtures and write-test guidance belong to the [backend import fixture guide](../testhub-v2-backend/src/question-imports/parsers/fixtures/README.md), not a frontend test runner.

### Learning documents and AI review

Open `/{locale}/lecturer/questions/documents` or `/{locale}/lecturer/questions/generate` from the lecturer question bank.

- Upload one text-layer PDF/PPTX up to 20 MiB with explicit external-processing consent; speaker notes are opt-in. The document workspace supports version history, extraction previews, rename, archive/unarchive and purge/quota-related operations. Revoking access is not physical deletion.
- Extraction text is shown as plain text with PAGE/SLIDE/NOTES positions. `OCR_REQUIRED`, partial extraction and failures are separate states. Confirm eligible partial extraction explicitly. `EXTRACTED` does not mean the RAG index is `READY`.
- Start/retry indexing and preview retrieval against the selected version. Similarity scores are not calibrated quality judgments; evidence remains `UNASSESSED`. Retrieval alone does not create bank questions.
- Create/resume a durable knowledge plan with `?plan=id`, review the proposed topic tree and topic-by-cognition matrix, save and confirm its revision, then generate. Heading-derived and inferred proposals still require lecturer review. Chapters allow nested parent references with cycle checks.
- Generation configuration allows at most 20 rows and 20 questions total. Choice questions have four options: one correct for `SINGLE_CHOICE`, or two/three correct for `MULTIPLE_CHOICE`.
- Batches support polling, history, draft edits, explicit approval/rejection and selected approved commit. Editing invalidates prior approval. Commit uses exact approved revisions and frozen plan targets; chapter matching/creation occurs only at that explicit commit. Generated content is never automatically approved or written to the bank.
- Preserve citation quotes/positions and recheck evidence after editing. `AI_INSUFFICIENT_EVIDENCE` is distinct from invalid output: missing slot details mean unknown affected slots, not that every slot failed. The UI does not automatically retry, split batches or create drafts/bank entries after refusal.
- Accepted batches can resume by business ID/history after navigation. Pre-batch upload checkpoints and idempotency keys are in memory, not durable across reload. After an ambiguous creation, inspect history before resubmitting. Source text, signed URLs and tokens must not be stored in browser URLs/local storage.

Indexed source content and retrieval queries go to Google's embedding API. Generation content goes to the configured generation provider, potentially including a fallback provider; review that deployment's processing arrangements before consenting. Switching generation to 9Router does not switch embeddings away from Google.

## Technology Stack

Versions are resolutions in the committed [npm lockfile](package-lock.json), not a claim that every manifest range is pinned exactly.

| Area | Technology / locked version |
| --- | --- |
| Framework | Next.js 16.1.1, App Router and Turbopack; React/React DOM 19.1.0 |
| Language | TypeScript 5.9.2, strict mode |
| Styling | Tailwind CSS and its PostCSS plugin 4.1.13; Radix/shadcn-style primitives, Lucide and Sonner |
| State | Redux Toolkit 2.9.0; React Redux 9.2.0 |
| HTTP / realtime | Axios 1.12.2; Socket.IO client 4.8.3; native EventSource |
| Authentication / localization | jose 6.1.0; next-intl 4.14.8 |
| Forms | React Hook Form 7.62.0; Zod 4.3.5 |
| Charts / math / printing | Recharts 3.2.1; KaTeX 0.16.25; react-to-print 3.2.0 |
| Lint | ESLint 9.36.0; **eslint-config-next 15.5.4** |
| Package management | npm; `package-lock.json` lockfile version 3 |

**Known tooling mismatch:** Next.js is 16.1.1 while `eslint-config-next` is 15.5.4. This README documents the existing state; it does not upgrade dependencies or claim lint is clean. Prisma 6.18.0 packages remain in this frontend manifest, but application code does not import Prisma Client or access the database. The separate backend uses NestJS 11 / Prisma 7 and npm.

## Architecture and Project Structure

```text
testhub-v2\
|-- src\
|   |-- app\
|   |   |-- [locale]\
|   |   |   |-- (admin)\dashboard\     # Administrator pages
|   |   |   |-- (student)\             # Home, exam, result and profile pages
|   |   |   |-- lecturer\              # Exams, bank, documents and AI workflows
|   |   |   |-- auth\                  # OAuth callback, recovery and transfer shells
|   |   |   |-- login\, signup\        # Public account pages
|   |   |   `-- layout.tsx             # Locale, fonts and providers
|   |   `-- globals.css                # Tailwind and shared design tokens
|   |-- components\                   # UI primitives, layouts and feature workspaces
|   |-- constants\                    # Backend endpoints, routes and cookie names
|   |-- hooks\                        # Auth, files and browser behavior
|   |-- i18n\                         # Locale-aware routing and message loading
|   |-- lib\                          # API client, chapter tree and shared utilities
|   |-- messages\en\, messages\vi\     # Translated messages
|   |-- services\                     # Auth, document, plan and generation API calls
|   |-- store\                        # Redux user/exam slices and typed hooks
|   |-- types\                        # Frontend contracts and backend enum values
|   `-- proxy.ts                      # Locale handling and optimistic role/JWT checks
|-- public\                           # Assets and question-import templates
|-- .github\workflows\ci.yml           # Node 22 install/lint/build workflow
|-- next.config.ts                    # next-intl integration
|-- package.json
|-- package-lock.json
`-- vercel.json                       # Vercel build-command override
```

Providers compose Redux, current-user loading and notifications. Existing pages commonly fetch through Axios in client components; this is not a TanStack Query/Zustand monorepo. There are no implemented Next API route handlers or configured API rewrites. REST contracts and enums are maintained manually against the backend, without shared-package code generation.

## Prerequisites

- **Node.js 22.12+ within the 22.x line is recommended** for a shared frontend/backend environment; CI uses Node 22. The frontend's locked Next.js minimum is 20.9.0. No root `engines` or `packageManager` field pins the frontend runtime/npm version.
- The backend's supported Node range is `^20.19.0 || ^22.12.0 || >=24.0.0`; do not assume every version satisfying the frontend minimum also supports the backend.
- npm and Git. Use the committed npm lockfile, not pnpm/yarn instructions from an unrelated monorepo guide.
- A configured backend and test accounts for functional authenticated use. PostgreSQL, Redis, object storage, migrations and optional Python 3.12/FastAPI dependencies are managed in the sibling repositories, not here.
- For document/RAG/generation workflows, prepare the AI service and both dedicated backend workers as described under Service Integration.

## Environment Configuration

There is **no `.env.example`** in this repository. Create a local `.env.local` manually or supply environment variables through the deployment platform. Existing `.env*` files are ignored; do not commit secrets, copy real environment contents into documentation or prefix secrets with `NEXT_PUBLIC_`.

| Variable | Required / default | Scope and purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Optional locally; active REST/socket/SSE callers default to `http://localhost:3001` | Public backend origin, without `/api` or `/api/v1`. Embedded in browser code at build time; set the deployed URL before building. |
| `NEXT_JWT_ACCESS_SECRET` | Required unless the legacy fallback supplies it; no default | Server-only HS256 verification key. Must equal the backend's `JWT_ACCESS_SECRET`. Required for build/server initialization. |
| `NEXT_JWT_SECRET` | Optional legacy fallback; no default | Used only when `NEXT_JWT_ACCESS_SECRET` is undefined/null. An empty primary value does not fall back and causes initialization to fail. |

Example shape only; replace the placeholder locally with the backend's actual access-token secret through a trusted channel:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_JWT_ACCESS_SECRET=REPLACE_WITH_THE_BACKEND_ACCESS_TOKEN_SECRET
```

Do not use the placeholder as a real key. Do not add the legacy fallback unless needed. The unused legacy helper `src\lib\socket.ts` has no explicit URL fallback; current notifications use `SocketProvider`.

`NODE_OPTIONS` is set by the development script to `--max-old-space-size=8192`; it is not an additional required application variable. Next's CLI supplies port selection; there is no application-specific `PORT` setting in the source. AI provider keys, `AI_SERVICE_INTERNAL_TOKEN`, database and storage credentials do **not** belong in the frontend environment.

## Installation and Local Development

Commands use Windows PowerShell syntax. Run frontend commands from this repository root. If the sibling repositories are already checked out, skip cloning.

```powershell
git clone https://github.com/anhquan-ngg/testhub-v2.git
Set-Location .\testhub-v2
npm ci
```

Before starting the frontend:

1. Follow the [backend README](../testhub-v2-backend/README.md) to configure dependencies, generate its ORM client and apply the appropriate migrations in a local development database. Never run backend migrations from this frontend or reset a shared database.
2. Set backend `FRONTEND_URL` to the actual allowed frontend origin (normally `http://localhost:3000`). Set the frontend's API URL and matching server-only JWT secret as described above. Use `localhost` consistently rather than mixing it with `127.0.0.1`.
3. Start the backend API on its configured port (default 3001). Enable/start AI services and workers only if needed; consult their guides for exact setup and migration order.
4. Start the frontend:

```powershell
npm run dev
```

Open [http://localhost:3000/vi](http://localhost:3000/vi) or [http://localhost:3000/en](http://localhost:3000/en). Sign in with a development account for the appropriate role. A running frontend alone does not make authentication or business workflows available.

For a different frontend port:

```powershell
npm run dev -- --port 3002
```

Update backend `FRONTEND_URL` and OAuth/cookie configuration accordingly. Do not change ports without aligning origins.

## Common Commands

Only `dev`, `build`, `start` and `lint` are package scripts. Commands below are run at the frontend root unless noted.

| Command | Purpose / limitations |
| --- | --- |
| `npm ci` | Install from the committed lockfile; changes local dependencies, not a verification-only command |
| `npm run` | List script metadata without running application scripts |
| `npm run dev` | Turbopack development server on default port 3000; sets an 8192 MiB Node heap ceiling |
| `npm run build` | Turbopack production build; configure public API URL and server JWT secret first |
| `npm run start` | Serve an existing production build; default port 3000 |
| `npm run lint` | Standalone ESLint, without auto-fix; existing lint debt may fail it |
| `npx tsc --noEmit --incremental false` | Direct type check, not an npm script; disables incremental-cache writes |
| `git diff --check` | Check patch whitespace; suitable for README-only verification |

There are no `test`, `test:e2e` or `typecheck` scripts. Historical references to `scripts\check-chapter-tree.cjs` and `scripts\check-i18n.cjs` are stale: those files and the `scripts` directory are absent. Do not treat them as runnable checks.

## Testing and Code Quality

No frontend Jest/Vitest/Playwright runner or maintained integration/E2E configuration is currently configured. Backend/AI tests are separate and do not establish frontend behavior. Do not invent a test command or interpret source inspection as an executed behavioral test.

For code changes, select lint, TypeScript and behavioral validation appropriate to scope. Next.js 16 does not run lint as part of `next build`; successful compilation does not prove authorization, refresh, upload, exam or AI workflow correctness. README-only changes need link/heading/fence/command checks and a diff review, not application builds or full tests.

[CI](.github/workflows/ci.yml) runs on pushes/PRs targeting `master` or `dev`: Node 22, `npm ci`, `npm run lint`, then `npm run build`. **Lint is non-blocking** (`continue-on-error: true`), so green CI does not mean lint passed. The build receives a GitHub-SHA placeholder for JWT initialization; this is build validation only, not a usable deployed authentication secret.

When functional verification is needed, use local/disposable fixtures and appropriate development accounts:

- Check login, refresh, logout, expired sessions, recovery and wrong-role denial; verify transient network/server failures do not masquerade as logout.
- Check valid/invalid exam edits, repeated submits, partial-create recovery, unsaved navigation, preserved search/page context and cancellation of destructive actions.
- Check monitoring reconnection/stale data, device transfers, ambiguous extension results, null scores, partial report loading and regrading save/publish conflicts.
- Check import review/commit recovery, extraction/indexing states, explicit AI approvals, stale revisions and evidence-refusal guidance. Never use active exams or real question banks for write tests.
- Check both locales, keyboard focus/Escape behavior and desktop/mobile widths such as 1440/1024/768/375 px. Live multi-student E2E monitoring has not been established by this documentation update.

## Service Integration

| Component | Default address / execution | Responsibility |
| --- | --- | --- |
| Frontend | `http://localhost:3000` | Browser UI and server-side navigation checks |
| Backend API | `http://localhost:3001`; Swagger at `/api-docs` | NestJS 11 / Prisma 7 business API; no global `/api` or version prefix |
| AI service | Internal port `8000`; Python 3.12 / FastAPI | Extraction, retrieval and generation via backend requests, not browser calls |
| Document worker | Separate backend `npm run start:document-worker` process; no HTTP port | Extraction and document indexing |
| AI worker | Separate backend `npm run start:ai-worker` process; no HTTP port | Source preparation and question-generation batches |

Worker commands belong to the **backend repository**, after its build/setup, not this frontend. Attached-file generation requires API, Redis, AI service and **both** workers, plus the backend learning-document/index/generation/plan migrations. Use the backend guides rather than a partial hardcoded migration sequence here.

### Authentication, origins and realtime

The shared [API client](src/lib/api-client.ts) sends cookies and normally uses a 10-second timeout, with longer per-operation overrides for document/generation requests. A business 401 triggers one refresh attempt and retry, excluding login/signup/refresh/session-transfer calls. Concurrent refreshes share a promise and use Web Locks across supported browser tabs. Only a refresh 401 redirects to reauthentication; network/5xx errors remain recoverable.

The [Next proxy](src/proxy.ts) verifies HS256 `access_token` claims, including role, `sid` and `token_use=access`. It performs optimistic navigation checks only: the backend validates live sessions and permissions. Missing/invalid/expired tokens on protected routes go through localized browser session recovery; the proxy does not refresh or erase cookies.

Backend httpOnly cookies must be available to the frontend host. Different ports on `localhost` can share host cookies; different hosts need a suitable same-origin reverse proxy/BFF arrangement or equivalent carefully configured shared-cookie design. Backend `FRONTEND_URL` controls allowed origins. Enabling CORS alone does not make a backend-host-only cookie visible to the frontend proxy. Google OAuth begins at `/auth/google`; do not infer Microsoft/Outlook OAuth support from a UI label.

Students have one active browser session. A pending new login does not eject the old session; an in-progress exam requires lecturer/admin approval before transfer, followed by confirmation in the new browser. Lecturers/admins can keep multiple sessions and log out the current one. Deploy the backend auth-session migration and reauthenticate legacy tokens; see the [session guide](../testhub-v2-backend/docs/auth-sessions.md).

Notifications use credentialed Socket.IO at `${NEXT_PUBLIC_API_URL}/notifications`. Student runtime and lecturer monitoring use credentialed SSE endpoints from [the endpoint registry](src/constants/endpoints.ts). The backend must not trust role/user query hints as authorization.

File uploads follow a backend-issued signed URL, a direct storage PUT and completion/confirmation. Learning-document PUTs use separate Axios without cookies; keep storage upload CORS compatible and never log or persist signed URLs.

### AI boundaries and diagnostics

Backend flags `AI_QUESTION_GENERATION_ENABLED` and `AI_RAG_ENABLED`, together with AI-side `RAG_ENABLED`, gate different parts of the workflow. They are **not frontend environment variables**. Backend `AI_SERVICE_INTERNAL_TOKEN` must match the token expected by the AI service's `X-Internal-Token` header; backend validation requires 32-256 visible ASCII characters. Keep it server-side.

The default backend-to-AI request budget is 35 seconds for text generation, 85 seconds for grounded generation and 55 seconds for extraction; the corresponding AI operation deadlines default to 30, 75 and 45 seconds. These are backend/service budgets, not one browser timeout, and grounded budgets depend on configured generation deadlines/overrides. Check the sibling guides before changing them.

9Router changes **generation only**. RAG embeddings remain Google's `gemini-embedding-001` at 768 dimensions, so `GEMINI_API_KEY` is still required on the AI service when RAG is enabled. Provider credentials never enter this frontend.

AI `/health` reports process health; `/ready` checks database/schema readiness only when `RAG_ENABLED`. Neither proves an external provider is ready. HTTP 422 alone is insufficient to diagnose a generation failure: inspect the structured error code. A valid evidence refusal is not a schema/output-format error. In the review UI, `AI_INSUFFICIENT_EVIDENCE` and `AI_OUTPUT_INVALID` must remain distinct.

## Deployment and Production

There is no Dockerfile, Compose stack or production deployment workflow in this repository. [Vercel configuration](vercel.json) only sets `buildCommand` to `npm run build`; it does not provision the backend, workers, credentials, storage or cookie topology. [Next configuration](next.config.ts) does not define standalone output, static export or backend rewrites.

For a Node-hosted frontend, after dependency/environment setup:

```powershell
npm run build
npm run start
```

Configure `NEXT_PUBLIC_API_URL` **before building**; changing it on a running deployment does not replace the embedded browser value. Supply the matching server JWT secret in build and runtime environments, keep it out of browser bundles/logs and restart/redeploy after server configuration changes. Do not reuse the CI placeholder. The locale root layout uses `next/font/google`, so the build environment may need access to fetch fonts.

Provision and configure backend/AI dependencies separately, deploy compatible migrations before using affected workflows, and start both workers where required. Align HTTPS, cookie scope/security, OAuth redirect origins, backend `FRONTEND_URL`, storage CORS and proxy support for SSE/Socket.IO. Do not assume successful frontend compilation proves those integrations work; production topology has not been validated here.

## Troubleshooting

| Symptom | Checks / safe action |
| --- | --- |
| Build/start reports a missing access secret | Set server-only `NEXT_JWT_ACCESS_SECRET` to the backend access-token secret. A blank primary does not use the legacy fallback. |
| Repeated session recovery, 401s or wrong-role redirects | Check matching JWT secrets, cookie host/path/security, the chosen locale/role, backend session validity and required auth migrations. Reauthenticate old tokens; do not clear sessions solely because a network request failed. |
| API/CORS errors or failed OAuth return | Confirm the browser-reachable `NEXT_PUBLIC_API_URL`, backend `FRONTEND_URL`, consistent hostname and redirect origin. Do not append a nonexistent `/api/v1` prefix. |
| Deployed browser still calls localhost/an old backend | Set the public API URL in the build environment and rebuild/redeploy. |
| Notifications or monitor updates stop | Check credentialed `/notifications`, SSE connections and proxy support. Monitoring has REST fallback; stale data is not proof the last mutation failed. |
| Upload PUT fails or extraction/indexing stalls | Check signed-URL expiry and storage CORS, then backend status, migrations, Redis and the document worker. Replay completion for already uploaded bytes; do not blindly upload another copy. `OCR_REQUIRED` needs a suitable source/OCR workflow, not an endless retry. |
| Batch remains waiting/queued, times out or fails | Confirm both workers, backend/AI flags, extraction/index readiness, token matching and the structured error code. Health endpoints do not establish provider availability. Keep Google embeddings configured even with 9Router generation. |
| `AI_INSUFFICIENT_EVIDENCE` | Review the cited source, objective and requested cells/counts. Missing issue details do not identify every slot as deficient. Do not mistake a valid refusal for malformed output or automatically retry/commit. |
| Revision conflict or uncertain save/commit/extension outcome | Preserve business IDs and local edits as appropriate, reload current server state and verify the result before retrying. UI duplicate-submit locks are not transactional guarantees. |
| Missing test/checker command or green CI despite lint errors | Only the four documented package scripts exist. Historical checker files and frontend test runners are absent; CI explicitly allows lint failure. |

## Further Documentation

- [Frontend agent guide](AGENTS.md) and [Claude-specific instructions](CLAUDE.md): repository conventions; some historical checker references are stale as noted above.
- [Backend README](../testhub-v2-backend/README.md): npm setup, infrastructure, migrations, environment and worker commands.
- [Authentication sessions](../testhub-v2-backend/docs/auth-sessions.md): cookies, recovery, device transfers and auth migration requirements.
- [Chapter hierarchy](../testhub-v2-backend/docs/chapter-hierarchy.md) and [question-import fixtures](../testhub-v2-backend/src/question-imports/parsers/fixtures/README.md): selection/import contracts and disposable test-data guidance.
- [Learning documents](../testhub-v2-backend/docs/learning-documents.md), [RAG indexing](../testhub-v2-backend/docs/rag-indexing.md) and [AI question generation](../testhub-v2-backend/docs/ai-question-generation.md): source preparation, migrations, workers and review/commit workflows.
- [AI service README](../testhub-ai-service/README.md): Python setup, internal API, provider configuration and readiness/deadline behavior.

Sibling links assume the repositories are checked out side by side; they may not resolve in a standalone hosted repository view. No `LICENSE` file is present, so this README does not assert an MIT license or link to a nonexistent license. Contributions should follow the repository instructions; dependency/configuration repairs are separate changes from this documentation.
