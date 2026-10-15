# Kora War — giao diện mobile ngang

## Quy tắc vận hành

- Chỉ chơi trong viewport ngang. Portrait hiện lớp “Xoay ngang để chiến đấu”, vô hiệu tương tác game và tạm dừng trận; trở về ngang vẫn cần nhấn Tiếp tục.
- Nút toàn màn hình gọi Fullscreen API và thử khóa landscape nếu trình duyệt hỗ trợ. Không coi khóa orientation là bảo đảm trên mọi browser; [MDN ScreenOrientation.lock](https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation/lock) ghi rõ hỗ trợ còn hạn chế. Lớp portrait là fallback.
- Sân chiếm viewport; HP hai góc trên, timer/pause ở giữa, bốn thẻ và mana phía dưới. Nội dung truyện/kỹ năng chi tiết ở modal trước trận, không lấp battlefield.
- Chạm thẻ rồi chạm vùng sáng hoặc nút lane. Kéo/vuốt thẻ lên sân thả để gọi quân; thả vào HUD hoặc vùng không hợp lệ sẽ hủy. Không bổ sung camera pan vì camera cố định đã được chốt.
- Gesture giữ một pointer, có capture, ngưỡng di chuyển 8px, chống click trùng sau drag, hủy khi blur/pointercancel/xoay máy. Chạm nhiều ngón không tạo thêm lệnh.
- Safe-area cho tai thỏ và cạnh dưới; nút thao tác chính 44px; animation ngắn bằng CSS/WAAPI và hỗ trợ reduced-motion.

## Ranh giới module

`engine/input/card-gesture.ts` chỉ nhận callback và tọa độ pointer. App kết nối gesture với renderer picking và Battle.play. `services/landscape.ts` quản lý browser orientation; không sửa simulation. `ui/styles/landscape.css` chịu trách nhiệm bố cục, `ui/motion.ts` phản hồi thẻ. Kết quả/hướng dẫn vẫn dùng screen modules hiện có.

## Phạm vi kiểm tra

Test input tự động kiểm tra một pointer, ngưỡng drag, double-up, pointercancel và cleanup. QA trình duyệt theo viewport được ghi ở [báo cáo QA](06-implementation/qa.md). Chưa kiểm chứng khóa orientation hoặc haptic trên thiết bị iOS/Android thật.

Cập nhật mới: [HUD và phản hồi thẻ](MOBILE-HAND-QA.md), [bộ bài và chat nhanh](MOBILE-SHEETS-QA.md).

[Đấu trường và thành tích mobile](MOBILE-ARENA-QA.md): chọn chế độ, phòng bạn bè, phân trang theo chiều cao và xử lý tải chậm/lỗi.
