# Codex lead và Gemini design

Người dùng giao Codex quản lý kiến trúc/backend/gameplay/tích hợp/QA và giao Gemini thiết kế đồ họa. Cả hai dùng tài khoản GitHub `huyplay`, nên người thực hiện được ghi bằng nhãn issue `agent:codex`/`agent:gemini`, nhánh, PR body và commit; tên tài khoản không phân biệt được agent.

## Backlog và phạm vi

Milestone [M1](https://github.com/huyplay/Kora-War/milestone/1). [Issue #1](https://github.com/huyplay/Kora-War/issues/1): formation/chat; [#2](https://github.com/huyplay/Kora-War/issues/2): workflow/CI/CD. Gemini nhận [#3](https://github.com/huyplay/Kora-War/issues/3) reaction art trước, rồi [#4](https://github.com/huyplay/Kora-War/issues/4) arena art và [#5](https://github.com/huyplay/Kora-War/issues/5) HUD. Có checklist nghiệm thu và đường dẫn độc quyền trong từng issue.

Trước khi làm, comment `Claimed by <agent>`, đổi `status:ready` → `status:in-progress`, ghi các file sở hữu. Một issue chỉ có một owner. Không sửa file ngoài scope hoặc cùng file với task đang chạy; tạo dependency/tích hợp task cho Codex. Đổi sang `status:ready` khi cần chuyển người nhận. Issue bị chặn dùng comment lý do và dependency, không giả hoàn thành.

Codex sở hữu `server`, `src/core`, `src/data`, `src/app`, `.github`, tools và renderer integration (`World.ts`). Gemini tạo art trong `assets/design`/`public/design` hoặc CSS riêng được issue chỉ định. Hợp đồng art: manifest ID/file/source/author/license/checksum, kích thước/budget, preview desktop/mobile, không hardcode gameplay/asset database ID. Reaction art dùng `communication.reactions[].imageAssetId`, Codex nhập/gán qua admin.

## Nhánh và worktree

Mỗi task có checkout riêng, không dùng chung working tree. Từ checkout sạch, chạy `git fetch origin`, rồi `git worktree add ../kora-gemini-3 -b gemini/3-reaction-art origin/main` (Codex tương tự `codex/<issue>-<task>`). Thư mục mặc định của dự án không phải nơi hai agent cùng sửa file. Không checkout/reset/clean một working tree mà agent kia đang dùng.

PR vào `main`, có `Closes #N`, agent, file scope, trước/sau, validation và giới hạn. Rebase nhánh lên `origin/main` trước review; nếu đụng file được owner khác sửa thì để Codex giải quyết hoặc chuyển thay đổi thành file riêng. Chỉ Codex tích hợp sau review và CI xanh. Không merge task chưa có QA chỉ vì test unit đạt.

Cả hai dùng cùng account nên GitHub không cho tự approve PR như hai người khác nhau. Main yêu cầu PR và status checks, không đặt required approval=1 gây khóa quy trình. CODEOWNERS xác định tài khoản quản lý; review thực tế và người thực hiện ghi trong PR/issue. Đây là phối hợp công việc, không phải cách ly quyền bảo mật giữa hai agent cùng credential.

## CI/CD

`.github/workflows/ci.yml` chạy trên PR/push main/codex/gemini và thủ công: Node 24 + npm ci + check + runtime smoke trên Ubuntu/Windows; ASP.NET .NET 10 build riêng. Package chỉ chạy sau các gate đạt. Action pin bằng commit SHA; workflow đọc repo, chỉ job Pages có quyền deploy cần thiết. Source tham khảo: [setup-node](https://github.com/actions/setup-node), [Pages workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

Gói `kora-war-<commit>` chứa production frontend, source runtime và lockfile, không có database/secrets/upload/cache. Chạy `npm run package` để chuẩn bị local, `npm run smoke` để kiểm entrypoint trên database tạm. Package API hiện cần `npm ci --include=dev` vì runtime dùng tsx. Không dùng gói này để ghi đè `.data` của bản đang chạy.

CD `main` lên [GitHub Pages](https://huyplay.github.io/Kora-War/) sau CI đạt. Pages là website tĩnh: bản demo AI dùng preset/procedural model; PvP/admin/database cần Node server hiện có hoặc hosting runtime bổ sung. Không upload model có quyền riêng hoặc `.data` lên Pages. Release artifact phục vụ triển khai backend sau này, không tuyên bố backend đã chạy trên Pages.

## Bàn giao và nghiệm thu

Codex cập nhật issue/PR, kiểm asset budget/provenance, import trong môi trường QA, chạy `npm run check` + smoke, QA desktop/mobile và giữ snapshot/replay. Thay luật đã chốt cần quyết định của người dùng; thay đổi trình bày không được gây damage/mana/win logic. Khi CI fail, sửa trong nhánh task; không tắt required check để merge. Không force push main. Mỗi task đã đạt được commit/merge và đóng issue với bằng chứng.
