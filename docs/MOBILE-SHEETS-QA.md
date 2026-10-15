# Bộ bài và chat nhanh mobile — 15/10/2026

Issue #28. Tiếp tục yêu cầu ít chữ, thao tác chạm/vuốt và màn hình ngang cố định. Thay đổi thuộc UI/input; không sửa luật combat, deck, vòng rút, database hay snapshot trận.

## Bộ bài

- Bỏ nút xóa phủ từng ảnh. Chạm thẻ để chọn/đọc chi tiết; dùng một nút Thêm/Bỏ và nút Lưu ở hàng dưới. Viền vàng biểu thị thẻ đang xem, dấu tick trong bộ sưu tập biểu thị thẻ đã có trong deck.
- Xem thẻ không dựng lại toàn bộ deck hoặc mất trang hiện tại. Chỉ thêm/bỏ mới cập nhật các ô. Nút Lưu vẫn dùng `cardDeckError` từ cấu hình trận; lỗi chỉ hiện khi có lỗi. Tên/kỹ năng/chi phí giữ trong aria-label và mô tả chi tiết.
- Hai hàng thẻ co giãn theo chiều cao còn lại. Hàng thao tác luôn hiện; bộ sưu tập dùng nút trang hoặc vuốt ngang.

## Chat nhanh

- Một hàng chứa tab câu/emoji, tắt phản hồi đối thủ và đóng. Bỏ tiêu đề/ghi chú lặp. Lớp chạm ngoài chỉ đóng bảng, không truyền lần chạm đó xuống sân hoặc tay bài. Escape đóng bảng; Tab giữ focus trong bảng đang mở.
- Bảng chọn nằm trên bong bóng phản hồi; mở lại ngay sau gửi không để bong bóng che câu hoặc emoji đầu tiên.
- Gửi phản hồi đóng bảng và trả focus về nút chat. Thanh tiến độ dùng đúng `communication.cooldownSeconds` trong content snapshot; các nút phản hồi khóa trong lúc gửi/chờ. Không thêm cooldown mới hoặc lặp toast khi đang chờ. Lỗi mạng/server vẫn hiện thông báo.
- Reset/reconfigure/dispose dọn timer và vô hiệu kết quả gửi bất đồng bộ thuộc phiên cũ. Mute được lưu bằng tùy chọn local hiện có. Whitelist, giới hạn gửi và PvP do server kiểm tra như trước.
- CSS chat được gom về `quick-chat.css`; bỏ các override cũ thu nhỏ nút xuống 30–40px. Animation mở bảng/tiến độ hỗ trợ reduced motion.

## Sửa vuốt cảm ứng

Touch có implicit pointer capture trên thẻ. Khi chuyển capture lên vùng phân trang, sự kiện `lostpointercapture` của thẻ con nổi lên không được hủy gesture của vùng cha. Chỉ mất capture của chính vùng cha mới hủy. Pointer cancel/dispose nhả capture; cử chỉ bị hủy không chuyển trang và không phát click ngoài ý muốn.

## QA đã chạy

- `npm run check`: kiến trúc, server/client typecheck, **236/236 test**, production build đạt. Mở rộng regression phân trang cho capture của thẻ con, pointercancel, mất capture của vùng cha và unmount giữa gesture. Không đổi fixture legacy.
- `npm run smoke`: production bundle, API, module config, auth và player trên database tạm đạt.
- Edge 844×390 và 667×375: deck 14 thẻ, chọn/bỏ Sét, khóa Lưu ở 13/14, thêm Hồi Sinh Lực, lưu và mở lại đúng deck. Bộ sưu tập đi tới trang cuối. Vuốt touch qua capability CDP chuyển từ trang 1 sang 2 khi bắt đầu trên thẻ.
- Chat trong trận: gửi câu và emoji, đóng sau gửi, khóa 14 nút theo cooldown rồi mở lại, mute, Escape và vòng focus. Chạm ngoài bằng touch khi đang chọn Nyx giữ nguyên lựa chọn và toàn bộ sáu mã thẻ.
- Database QA riêng được mở rộng tạm thành 24 phản hồi: câu dài, trang câu 2/2, emoji 2/2. 568×320 vẫn đủ nút/trang trong bảng, mọi nút hiển thị ≥44px. Document đúng kích thước viewport, không cuộn.
- `prefers-reduced-motion: reduce`: animation bảng là `none`, transition nút là `0s`. Console QA không có error/warn.
- Ảnh local tại `.data/qa-sheets/`, không commit database, log, build hoặc ảnh QA. Đây là kiểm tra trình duyệt, chưa phải kiểm thử trên phần cứng điện thoại thật. CI/CD tiếp tục tắt; Codex QA và tích hợp thủ công.
