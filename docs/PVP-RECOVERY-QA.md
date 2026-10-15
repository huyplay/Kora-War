# Khôi phục phiên PvP khi mạng lỗi

Issue #37, 15/10/2026. Không đổi luật trận, hàng chờ 60 giây, Elo hoặc database content.

Khi tải lại trong lúc request trạng thái lỗi mạng/server, `PvpSession` giữ mã phòng và tự thử lại mỗi 1,5 giây theo nhịp retry mạng hiện tại. `restoring` giữ bật đến khi server xác nhận phòng hoặc xác nhận không có phòng; app chặn mở trận khác trong lúc chưa biết membership. Dòng trạng thái ngắn trong sảnh báo đang nối lại. Request restore trùng dùng chung promise; dispose/rời phòng dọn timer/request và chặn phản hồi cũ. Lỗi xác thực/validation không bị retry vô hạn.

Nếu create/join/queue có thể đã thành công nhưng mất response, client đọc `/api/pvp/current` để tìm phòng được server xác thực. Không gửi lại mutation tạo/join phòng. Nếu server xác nhận không có phòng, trả lỗi ban đầu để UI cho thử lại; không tự tạo kết quả hoặc giả membership. Chỉ một thao tác phòng có thể đang xử lý. Các lệnh combat vẫn retry cùng ID như hiện tại.

Regression: startup 503/offline rồi phục hồi, không có mã lưu, no-room response, expired token, cancel/dispose, duplicate restore, late failures, lost create/join/queue response, concurrent transitions, không retry 4xx. Unit dùng fake clock cho retry, không đợi thời gian thực hoặc sửa luật. QA trình duyệt dùng server/database riêng và lỗi API được inject ở môi trường QA; không thêm endpoint fault injection vào production.

QA local ngày 15/10/2026: `npm run check` đạt 261/261 test, kiểm tra kiến trúc, typecheck client/server và production build; `npm run smoke` đạt. Edge ở viewport 844×390: tạo phòng bạn bè, inject 503 cho API trạng thái, reload, thấy trạng thái nối lại; thao tác vào trận luyện tập bị chặn trong lúc chưa biết phòng hiện hành. Gỡ lỗi 503 thì game tự mở lại đúng mã phòng BE2D2C9D619C, không reload thêm. Khung trang đo được 844×390, không tràn hoặc cuộn trang. Ảnh nghiệm thu local: `.data/qa-recovery/restored-room-844.png`. Không coi viewport desktop là kiểm thử cảm ứng trên điện thoại thật.
