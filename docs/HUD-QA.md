# HUD và chat nhanh — QA 15/10/2026

Task #5 chuyển từ Gemini sang Codex theo quyết định mới của người dùng. Bản này chỉnh trình bày HUD/chat, không đổi gameplay, content database hay mô phỏng. Task #4 (arena) vẫn mở; không coi map hiện tại đã đạt chất lượng hình mẫu.

## Thay đổi

- Thanh HP phân màu xanh/đỏ, viền vàng và nền tăng độ tương phản; tay bài giữ sáu ô.
- Màn hình ngang thấp dùng sáu câu nhanh trong hai hàng và tám emoji trong một hàng. Vùng chạm nút chat/đóng/câu nhanh/emoji ít nhất 40px ở các viewport đã kiểm tra. Safe-area và vùng cuộn được giữ trong panel.
- Focus keyboard có viền rõ; mở panel chuyển focus tới nút đóng; Escape, đóng và gửi trả focus về nút chat. Thêm aria-controls, tắt transition khi reduced-motion.
- Promise gửi chat bị reject được chuyển thành thông báo có thể thử lại, không giữ khóa sending vô hạn. Generation guard tiếp tục bỏ phản hồi thuộc phiên đã reset.

## Kiểm thử thực tế

- `npm run check`: architecture, server typecheck, **164/164 tests**, TypeScript client và production build đạt trên Windows/Node 24.15.0. Three.js chunk còn cảnh báo dung lượng >500 kB; không có lỗi build.
- Edge headless với browser profile và database QA riêng, chỉ seed content/assets từ database nguồn mở read-only. Không dùng tài khoản/player hoặc ghi vào database game đang sử dụng.
- 667×375, 844×390, 1536×720: Home → luyện tập → màn story → giữ bài → combat → mở chat. Đo mọi nút chat ≥40×40px, panel/tay bài nằm trong viewport, không tràn ngang. Tám ảnh emoji tải hoàn chỉnh 256px; không có pageerror.
- Kiểm Escape/aria-expanded/focus, mute lưu localStorage, gửi emoji hiển thị bubble, focus sau gửi, elementFromPoint xác nhận panel đóng không chặn thẻ. Reduced-motion bật trong các profile QA.
- Harness dùng QuickChat thật trong Edge: gửi bị reject rồi thử lại thành công; cooldown chặn gửi liên tiếp; reset cho phiên mới gửi; kết quả promise của phiên cũ không tạo thông báo mới. Không có pageerror.
- Đã xem ảnh 844×390 và 1536×720 để kiểm bố cục; ảnh các viewport và JSON đo kích thước được lưu local tại worktree `.data/hud-chat-*.png`, `.data/hud-bubble-*.png`, `.data/hud-browser-report.json`. Không commit cache hoặc dữ liệu QA.

Đây là kiểm tra trình duyệt headless trên Windows, không phải thiết bị iOS/Android thật, benchmark FPS hoặc nghiệm thu PvP hai máy. Các giới hạn của map, chất lượng model và vật liệu được theo dõi tiếp ở issue #4.
