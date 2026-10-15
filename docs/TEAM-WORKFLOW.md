# Codex quản lý và triển khai Kora War

## Quy trình hiện hành — 15/10/2026

Người dùng giao Codex phụ trách toàn bộ dự án và không dùng Gemini nữa. Codex trực tiếp làm thiết kế, backend/gameplay, tích hợp và QA. Issue #4 (arena) và #5 (HUD) chuyển sang `agent:codex`. Issue #8 (cầu nối hai máy) đóng với lý do không còn cần; prototype chưa merge vẫn giữ ở worktree riêng, không thêm MCP dependencies vào main.

Mỗi task dùng nhánh/worktree riêng, QA local theo AGENTS.md rồi tạo PR và merge đúng HEAD đã kiểm tra. CI/CD tiếp tục tắt; không chờ Billing/Actions. Không force push main, không ghi đè checkout đang dùng bên ngoài. Giữ reaction art đã nghiệm thu ở PR #7. Task đồ họa cần kiểm tra trình duyệt ở desktop và mobile ngang; ghi rõ giới hạn thực tế.

## Lịch sử phân công trước 15/10/2026

Các mục bên dưới ghi lại cơ chế phối hợp cũ và kết quả kiểm tra trước đây; không tiếp tục giao việc Gemini.

Người dùng giao Codex quản lý kiến trúc/backend/gameplay/tích hợp/QA và giao Gemini thiết kế đồ họa. Cả hai dùng tài khoản GitHub `huyplay`, nên người thực hiện được ghi bằng nhãn issue `agent:codex`/`agent:gemini`, nhánh, PR body và commit; tên tài khoản không phân biệt được agent.

## Backlog và phạm vi

Milestone [M1](https://github.com/huyplay/Kora-War/milestone/1). [Issue #1](https://github.com/huyplay/Kora-War/issues/1): formation/chat; [#2](https://github.com/huyplay/Kora-War/issues/2): phối hợp và QA/merge thủ công. Task Gemini: [#3](https://github.com/huyplay/Kora-War/issues/3) reaction art, [#4](https://github.com/huyplay/Kora-War/issues/4) arena art và [#5](https://github.com/huyplay/Kora-War/issues/5) HUD. Có checklist nghiệm thu và đường dẫn độc quyền trong từng issue; cập nhật claim để Codex biết task đang chạy song song.

Trước khi làm, comment `Claimed by <agent>`, đổi `status:ready` → `status:in-progress`, ghi các file sở hữu. Một issue chỉ có một owner. Không sửa file ngoài scope hoặc cùng file với task đang chạy; tạo dependency/tích hợp task cho Codex. Đổi sang `status:ready` khi cần chuyển người nhận. Issue bị chặn dùng comment lý do và dependency, không giả hoàn thành.

Codex sở hữu `server`, `src/core`, `src/data`, `src/app`, `.github`, tools và renderer integration (`World.ts`). Gemini tạo art trong `assets/design`/`public/design` hoặc CSS riêng được issue chỉ định. Hợp đồng art: manifest ID/file/source/author/license/checksum, kích thước/budget, preview desktop/mobile, không hardcode gameplay/asset database ID. Reaction art dùng `communication.reactions[].imageAssetId`, Codex nhập/gán qua admin.

## Nhánh và worktree

Mỗi task có checkout riêng, không dùng chung working tree. Từ checkout sạch, chạy `git fetch origin`, rồi `git worktree add ../kora-gemini-3 -b gemini/3-reaction-art origin/main` (Codex tương tự `codex/<issue>-<task>`). Thư mục mặc định của dự án không phải nơi hai agent cùng sửa file. Không checkout/reset/clean một working tree mà agent kia đang dùng.

PR vào `main`, có `Closes #N`, agent, file scope, trước/sau, validation và giới hạn. Rebase nhánh lên `origin/main` trước review; nếu đụng file được owner khác sửa thì để Codex giải quyết hoặc chuyển thay đổi thành file riêng. Chỉ Codex tích hợp sau review và QA local. Không merge task chưa có QA chỉ vì test unit đạt.

Cả hai dùng cùng account nên GitHub không cho tự approve PR như hai người khác nhau. Main yêu cầu PR, không đặt required approval=1 gây khóa quy trình. CODEOWNERS xác định tài khoản quản lý; review thực tế và người thực hiện ghi trong PR/issue. Đây là phối hợp công việc, không phải cách ly quyền bảo mật giữa hai agent cùng credential.

Branch protection áp dụng cả admin: bắt buộc PR, giải quyết hội thoại và lịch sử tuyến tính; cấm force push/xóa main. Required status checks đã gỡ theo yêu cầu mới nhất của người dùng. Codex kiểm tra diff và HEAD so với main, ghi QA rồi squash/rebase merge đúng HEAD đã review; không dùng admin bypass.

Người dùng xác nhận Gemini đang chạy song song ở phiên ngoài. Phiên Codex hiện tại không có công cụ gọi Gemini trực tiếp; `GEMINI.md` và issue là điểm giao việc. Agent ghi claim/nhánh/file scope để đồng bộ tracking, và gửi PR cho Codex kiểm tra; không suy đoán task nào hoàn thành khi chưa có bàn giao.

## QA và tích hợp thủ công

Ngày 14/10/2026, người dùng quyết định không cần CI/CD, giao Codex tự QA và merge main. GitHub workflow `CI` đã được disable (`disabled_manually`); file cấu hình được giữ để tham khảo, không tự chạy/deploy. Billing không còn là điều kiện chặn tích hợp. Không tự bật lại automation khi chưa có yêu cầu mới.

Codex kiểm tra scope/diff và cập nhật nhánh trước tích hợp. Thay logic/cấu trúc: chạy `npm run check`; thay runtime/đóng gói: chạy smoke/package; thay backend asset: build .NET Release. UI/renderer/art cần QA trình duyệt desktop/mobile ngang, kiểm nguồn/budget và ghi kết quả. Chỉ báo kiểm tra đã chạy; kết quả Windows local không được gọi là kiểm tra Ubuntu hoặc benchmark điện thoại thật.

Gói `kora-war-<commit>` chứa production frontend, source runtime và lockfile, không có database/secrets/upload/cache. Mỗi lần đóng gói xóa và tạo lại đúng thư mục `.release/kora-war` đã kiểm tra đường dẫn, từ chối symlink để tệp cũ không lọt vào artifact. Chạy `npm run package` để chuẩn bị local, `npm run smoke` để kiểm entrypoint trên database tạm. Package API hiện cần `npm ci --include=dev` vì runtime dùng tsx. Không dùng gói này để ghi đè `.data` của bản đang chạy.

GitHub Pages đã cấu hình nhưng chưa có deployment thành công và CD đang tắt. Pages là website tĩnh; PvP/admin/database tiếp tục chạy trên Node server hiện có. Gói runtime phục vụ triển khai thủ công sau này, không tuyên bố backend đã chạy trên Pages hoặc tự upload `.data`/model lên Pages.

Local `npm run check` đạt 163/163 sau khi bổ sung regression đóng gói; smoke/package và .NET Release build đạt. QA Edge kiểm chat PvP hai chiều, mute, bảng chat 844×390 và admin revision 13/17 module. Các run CI lịch sử bị khóa Billing trước khi chạy job; quyết định QA thủ công thay thế luồng chờ mở khóa đó.

## Bàn giao và nghiệm thu

Codex cập nhật issue/PR, kiểm asset budget/provenance, import trong môi trường QA, chạy các kiểm tra phù hợp, QA desktop/mobile và giữ snapshot/replay. Thay luật đã chốt cần quyết định của người dùng; thay đổi trình bày không được gây damage/mana/win logic. Khi QA fail, sửa trong nhánh task trước merge. Không force push main. Mỗi task đã đạt được commit/merge và đóng issue với bằng chứng.
