# CLAUDE.md — testhub-v2 (frontend)

Hướng dẫn chung của repo nằm trong `AGENTS.md` (được import bên dưới); trạng thái bàn giao nằm trong `CONTINUITY.md`. File này chỉ bổ sung những điểm riêng cho Claude Code — khi có mâu thuẫn, sửa `AGENTS.md` thay vì thêm quy tắc trái ngược ở đây.

@AGENTS.md

## Bắt đầu mỗi phiên

- Đọc `CONTINUITY.md` trước khi sửa code; cập nhật nó trước khi kết thúc nhiệm vụ có thay đổi đáng kể.
- Bỏ qua các quy tắc trong `../../AGENTS.md` (thư mục `testhub/` bên ngoài) nếu Claude Code tự nạp nó: file đó mô tả kiến trúc khác (xem `AGENTS.md` mục 0).

## Lưu ý riêng cho Claude Code

- Không dùng bất kỳ lệnh nào để đọc hoặc xuất giá trị từ `.env`, `.env.production`, các file `.env*` khác, hay `quanna-keypair.pem`. Nếu cần tên biến, tra trong code và `AGENTS.md` mục 6.
- Typecheck: `npx tsc --noEmit --incremental false` (tránh ghi `tsconfig.tsbuildinfo`). Lint theo file: `npx eslint <đường-dẫn>`.
- Lệnh dài (`npm run build`, typecheck, lint toàn repo) có thể chạy nền rồi đọc kết quả, thay vì chặn phiên.
- Các trang lớn (ví dụ `src/app/lecturer/questions/page.tsx` ~2.100 dòng, `src/app/(student)/exam/[id]/page.tsx` ~1.300 dòng): đọc theo đoạn với `offset`/`limit` và dùng Grep để định vị trước khi sửa.
- Khi thay đổi đụng tới API, đọc controller/DTO tương ứng ở repo backend cùng cấp `../testhub-v2-backend/src/` thay vì đoán contract.
- Không commit, push, tạo PR hay deploy nếu người dùng chưa yêu cầu rõ ràng. Không đụng vào thư mục untracked `reports/`.
