# Đấu trường mobile — 15/10/2026

Issue #31. Tối ưu chọn chế độ, phòng bạn bè, màn chờ và thành tích theo yêu cầu ít chữ, thao tác chạm/vuốt và không cuộn trang. Không đổi gameplay, matchmaking, Elo, schema hoặc content snapshot.

## Bố cục

- Ba chế độ có vùng chạm lớn, tên/mô tả từ `competition.modes`; Thử thách hiện mana/quá tải từ database. Hồ sơ thu gọn còn Elo/bậc/vị trí; aria-label giữ tên và số trận đầy đủ.
- Phòng bạn bè là màn riêng. Enter gửi mã; mã sai có thông báo và `aria-invalid`, sửa ô nhập sẽ xóa lỗi cũ. Khi viewport thấp do bàn phím, ẩn phần tạo phòng để giữ ô mã và nút Vào phòng trên cùng hàng. Cả tạo/join đều tôn trọng trạng thái bật/tắt chế độ.
- Màn tìm trận dùng đồng hồ giây và một nút hủy; chỉ cập nhật text khi số giây thay đổi, không lặp câu trong live region mỗi lần poll. Thời hạn vẫn đọc cấu hình của phòng.
- Thành tích chia tab Xếp hạng/Lịch sử, mỗi tab giữ trang riêng. `fitPages` đo chiều cao còn lại, dùng hàng 48px và nút trang 44px. Resize giữ mục đầu trang cũ trong trang mới; tab ẩn giữ trạng thái, đóng màn dọn observer và listener. Trận bị admin hủy hiện nhãn riêng và biểu tượng hoàn tác với aria-label.
- Request hồ sơ/thành tích bị abort khi rời màn. Lỗi tải có nút Thử lại; vẫn quay lại được trong lúc tải. Thao tác tạo/join/queue khóa lặp trong lúc chờ, không dựng lại màn chờ lần hai sau callback của session.
- CSS đấu trường được gom về `competition.css`, gỡ các override cũ thu nhỏ hàng và nút. Animation chờ/nhấn hỗ trợ reduced motion.

## QA local

- `npm run check`: architecture, server/client typecheck, **237/237 tests**, production build đạt. Regression mới kiểm tra resize, tab ẩn, mục cuối bảng 100 hàng và cleanup; golden fixture giữ nguyên.
- `npm run smoke`: production bundle, API, module config, auth và player độc lập đạt.
- Edge: 568×320, 667×375, 844×390 và desktop 1536×720. Các màn dùng kích thước document bằng viewport, nút thao tác ≥44px. Mô phỏng viewport 568×220: ô mã 48px và nút Vào phòng 44px vẫn trong màn. Chưa kiểm bàn phím/phần cứng iOS/Android thật.
- Database QA riêng có 100 người và 20 lịch sử tổng hợp; không chép dữ liệu giả vào database chính. Touch qua capability CDP vuốt bảng từ #1–3 sang #4–6, resize 568→844 giữ #4 trong trang mới. Xem tới #100, nút Sau khóa đúng; xem đủ 20 trận, tab giữ trang riêng và nhãn Đã hủy/hoàn tác hiển thị đúng.
- Nhập mã ngắn bằng Enter, mã đủ độ dài nhưng không tồn tại, tạo phòng bạn bè và ghép với peer QA qua API: client chuyển từ mã phòng vào bài khởi đầu/PvP. Kiểm tra thêm chiều ngược lại: peer tạo phòng, client nhập mã chữ thường và Enter để vào bài khởi đầu. Trận QA không tính hạng. Tìm/hủy đấu hạng, thường và Thử thách đều quay về sảnh.
- Chỉ server QA giả lập lỗi overview HTTP 503 và trễ 2,5 giây. Kiểm tra nút Thử lại tải thành công; quay lại trước response không để màn cũ xuất hiện lại. Không thay network hay config server chính.
- Reduced motion: queue animation `none`. Không có lỗi/warning JavaScript ngoài các phản hồi lỗi được chủ động giả lập. Ảnh local `.data/qa-arena/`, không commit ảnh QA/database/log/dist. CI/CD giữ tắt; Codex tích hợp thủ công đúng commit đã kiểm tra.
