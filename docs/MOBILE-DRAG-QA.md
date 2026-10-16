# Kéo thả thẻ trên mobile — 16/10/2026

Task [#55](https://github.com/huyplay/Kora-War/issues/55) hoàn thiện thao tác chạm, không thay luật triển khai, mana, tọa độ mục tiêu hoặc dữ liệu trận.

- Một pointer chính sở hữu thao tác. Mất capture, tab ẩn, blur, đổi tay bài hoặc thẻ không còn sẵn sàng hủy thao tác. Chạm thêm ngón ở bất kỳ đâu hủy cả kéo lẫn tap đang chờ; chặn click phát sinh đến khi mọi ngón đã nhấc và thêm 400 ms. `begin()` báo nhận thao tác để app chỉ giữ UID của đúng thẻ được nhận.
- Ảnh thẻ 70×88 px nằm phía trên ngón tay, giới hạn trong màn hình với lề 8 px. Dấu ✓/× và viền xanh/đỏ đọc vùng thả cùng luật của trận. Phần ảnh chỉ mang tính trang trí, không bắt chạm; tọa độ ngón tay gốc vẫn quyết định preview và lệnh thả. Di chuyển không dựng lại DOM ảnh.
- Điểm preview được kiểm tra lại khi ngón tay đứng yên: renderer sau khi đồng bộ quân, app khi cập nhật HUD. Đổi thẻ/Cộng Hưởng hoặc rời canvas xóa mục tiêu cũ. Thả vẫn kiểm tra lại trạng thái hiện hành; không tự dùng thẻ sau khi hủy.
- Không có cấu hình cân bằng mới hoặc migration database. Content revision, nháp admin và snapshot lịch sử giữ nguyên. Không thêm âm lặp hoặc hiệu ứng chuyển động mới.

## Kiểm tra

- `npm run check`: kiến trúc, TypeScript server/client, 330 tests và production build. Golden fixtures không đổi. 11 test gesture bao phủ tap/chuột, ngưỡng 8 px, tọa độ thả chính xác, hai thứ tự nhấc ngón, giữ ngón lâu, thêm ngón thứ ba, mất capture, readiness, blur/hidden/dispose và lỗi capture. Hai test ảnh thẻ kiểm tra giới hạn màn hình và tái sử dụng DOM; test hover kiểm tra tiền tuyến thay đổi khi pointer đứng yên và xóa mục tiêu.
- `npm run smoke` và `git diff --check`.
- Chrome với DOM 844×390, gửi touch qua DevTools: thả hợp lệ thay đúng một ô, chồng rút 8→7→6; thả bên địch báo không hợp lệ và giữ nguyên sáu UID; ngón thứ hai ở ngoài thẻ hủy ảnh, hai thứ tự nhấc ngón đều không dùng bài; kéo đến góc trên trái giữ ảnh ở (8,8). Không cuộn trang (scrollWidth/clientWidth 844, scrollHeight/clientHeight 390); không có console warning/error trong lượt QA.
- Lượt QA riêng giữ max mana 10, khởi đầu 4 và tắt hồi mana trong fixture: thả Solan mất 3 mana, rút Vesper vào đúng ô; kéo Vesper khi còn 1 mana không hiện ảnh, không tiêu thêm mana hay rút thêm bài. Không khẳng định đã nghe/nghiệm thu âm thanh trong lượt này.
- QA dùng database tách biệt, bản sao asset và không sao chép session/người chơi. Fixture mana 30, HP tướng 5.000, đòn thường 1, cooldown kỹ năng 900s dùng để kéo dài quan sát; không triển khai fixture lên main. Đây là kiểm tra trình duyệt giả lập kích thước, không phải benchmark hoặc nghiệm thu cảm ứng trên điện thoại thật.
