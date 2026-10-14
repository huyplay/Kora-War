# Gemini reaction art và tích hợp database — 14/10/2026

Gemini bàn giao commit `781e1754c9df887234cbe1412cc614f74291e1f3` trên `gemini/3-reaction-art`, chỉ thêm `assets/design/reactions/**` và `public/design/reactions/**`. Codex tích hợp trên worktree riêng, giữ tác giả commit/art. Task theo [issue #3](https://github.com/huyplay/Kora-War/issues/3); quy trình QA local theo [quyết định mới nhất](TEAM-WORKFLOW.md).

Nghiệm thu 8 ID happy/cheer/wow/cry/laugh/respect/fire/heart: 16 PNG/WebP 256×256, pixel alpha trong suốt/đục thực, dung lượng dưới 100 KiB, checksum/kích thước/public copy đúng manifest. 3 preview có checksum và kích thước khớp. WebP thực tế 20,5–55,3 KiB; Codex sửa mô tả README “≤6 KB”. `.gitattributes` cố định SVG LF để Git Windows không làm lệch checksum nguồn; không sửa hình vẽ hoặc tạo lại manifest để bỏ qua sai lệch.

`npm run assets:reactions` mặc định chỉ verify, không mở database. `--import` nhập thư viện; `--bind` gán các emoji chưa có ảnh vào bản nháp; thêm `--publish` phát hành. Đặt `KORA_DATA_DIR` đúng database mục tiêu và sao lưu trước khi áp dụng. Công cụ kiểm tra toàn bộ art trước khi nhập, dedup checksum, giữ ảnh tùy chỉnh và từ chối publish nếu có bản nháp khác. Source URL trỏ commit GitHub chứa SVG, lưu tác giả/giấy phép/quyền dùng cùng metadata asset. Backend asset dùng PostgreSQL cần chạy `npm run assets:sync` từ môi trường đã cấu hình sau nhập.

Binding `communication.reactions[].imageAssetId` nằm database; không đưa ID sinh ra vào renderer/UI/preset. Admin có thể chọn lại ảnh và publish revision. Các trận đã tạo giữ snapshot cũ. Import file và publish config là hai bước riêng; lỗi publish giữ thư viện để xử lý trong admin, không tuyên bố cả luồng import là một transaction.

`npm run check` đạt 164/164, gồm kiểm tra import/publish không đổi gameplay/history, chạy lại không tạo asset/revision trùng, giữ ảnh tùy chỉnh và từ chối publish draft khác. Kiến trúc, TypeScript server/client, production build, smoke và package đạt; golden fixture không thay đổi.

QA Edge trên database riêng, không copy player/session/admin của bản chính: ảnh trong bảng chat tải đủ, natural size 256×256. Desktop và màn hình ngang 844×390 dùng ảnh thật qua `/api/assets`; gửi Bùng cháy tạo bong bóng ảnh đúng. PvP hai cookie: A gửi Yêu thích, B nhận ảnh; B gửi Cổ vũ, A nhận ảnh; không lỗi console trong lượt QA. Emulation được reset. Ảnh local `.data/gemini-reactions-game.png`, `.data/gemini-reactions-mobile.png`, `.data/gemini-reactions-pvp.png`; không commit dữ liệu runtime.

Art hiện là biểu tượng vector riêng cho Elyndra, không phải bộ chân dung nhân vật Castle Crush. Mobile HUD/touch target và map polish tiếp tục ở task Gemini #5/#4; không dùng kết quả art để cam kết FPS điện thoại hoặc toàn bộ đồ họa đã hoàn thiện.
