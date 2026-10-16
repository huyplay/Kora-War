# QA bộ sưu tập mobile — Issue #43

Màn đội hình có hai hàng figure 3D và ribbon bộ sưu tập luôn hiện. Model dùng clip đi bộ từ binding hiện hành, phép dùng miniature riêng theo màu catalog. Chi tiết mở tại chỗ, cho phép thay thẻ bằng cách chạm ô đội hình và nâng cấp qua API ví hiện có. Không thêm luật kinh tế hoặc tăng chỉ số combat.

## Kiểm tra local

- `npm run check`: kiến trúc, TypeScript server/client, 273 test, build production. Golden fixture giữ nguyên.
- `npm run smoke`: bundle production/API/module config/auth/ví riêng.
- Chrome, CSS viewport 844×390, 667×320 và 1536×720. Document giữ đúng viewport, không có cuộn dọc. Nút chi tiết tối thiểu 44px; nội dung màn nhỏ không tràn.
- Gửi touchStart/touchMove/touchEnd trên ribbon: offset 0 → 480px, không mở nhầm chi tiết, document scrollTop vẫn 0. Lọc tướng/phép và nút mũi tên giữ phạm vi ribbon.
- Ví SQLite riêng: Solan 1 → 2 tiêu thụ 75 vàng/2 mảnh; 2 → 3 tiêu thụ 150 vàng/4 mảnh. Tải lại giữ cấp và vàng; chỉ số công/máu giữ nguyên. Thiếu mảnh khóa nâng cấp và chỉ rõ số còn thiếu.
- Đổi Sét thành Hồi Sinh Lực, lưu/mở lại; bỏ một tướng khiến nút lưu bị khóa ở 13/14, thêm lại lưu được.
- Giả lập latency 4 giây: đóng chi tiết khi đang nâng cấp; kết quả đến không mở lại màn đã đóng, giữ bản nháp 13/14 và cập nhật level đội hình. Mô phỏng mạng đã được tắt sau QA.
- Reduced motion: hai screenshot chi tiết có cùng SHA-256; resize vẫn vẽ lại hình tĩnh. Media override đã được reset.
- Chỉ một canvas/WebGL renderer; đóng bộ sưu tập trả canvas về `#stage`, tabIndex 0. Không thấy console error/warning trong lượt kiểm tra.

QA dùng database `.data/roster-qa` và tài khoản riêng, không nạp vàng/mảnh vào database chính. Main published content revision 24 và lịch sử config/module không bị sửa.

Ảnh nghiệm thu lưu trong worktree `.data/roster-mobile-final.png`, `.data/roster-desktop-final.png`, `.data/roster-upgrade-mobile.png` (không đưa cache/artifact QA vào Git). Đây là kiểm tra trình duyệt trên máy phát triển, chưa phải benchmark thiết bị mobile thật.
