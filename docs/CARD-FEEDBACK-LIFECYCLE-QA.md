# Vòng đời phản hồi thẻ — 16/10/2026

Task [#57](https://github.com/huyplay/Kora-War/issues/57) sửa phản hồi trình bày khi đổi bài mở đầu, tạm dừng hoặc đồng bộ lại. Không thay vòng rút, UID thẻ, mana/cooldown, gameplay hay content database.

- Bài mở đầu, mulligan và snapshot đầu sau nối lại không phát chuyến bay rút bài hoặc cue sẵn sàng bù. Trận mới và kết nối mới lấy mana hiện tại làm mốc, không báo tiêu mana từ trận trước.
- Tab ẩn hoặc mất kết nối dừng và dọn phản hồi thẻ/mana. PvP đợi snapshot hợp lệ tiếp theo trước khi bật phản hồi; trạng thái kết nối thành công trước snapshot không làm phát hiệu ứng cũ. Thẻ bỏ lỡ trong lúc đồng bộ xuất hiện ngay tại đúng ô; lượt rút combat tiếp theo vẫn có phản hồi bình thường.
- Tạm dừng thường giữ tiến độ hoạt ảnh thẻ và tiếp tục khi chơi lại. Nếu đủ mana thật sự sau resume, cue sẵn sàng vẫn phát một lần; nếu trạng thái đã được tiêu thụ khi inactive thì không phát lại. Waiting UID được xóa khi thẻ sẵn sàng hoặc rời tay, kể cả inactive. Chạm thiếu mana cập nhật readiness từ snapshot hiện hành trước khi báo chờ.
- Bật giảm chuyển động dừng WAAPI đang chạy ngay qua media-query change; cập nhật tiếp theo cũng kiểm tra preference. Âm vẫn tuân theo mute, bus UI và binding database hiện có. Không đổi file âm thanh hoặc cấu hình admin.
- Chỉ giữ một WAAPI cho mỗi phần tử thẻ/chồng rút và tối đa 16 tổng; số mana giữ tối đa một pulse. Hủy/hoàn tất cũ không thể bỏ quyền sở hữu của animation mới. Reset/dispose dọn hoạt ảnh; ô mana và các node thẻ còn trên tay giữ DOM/listener/focus.

## QA

- `npm run check`: kiến trúc, TypeScript server/client, 345 tests và production build; fixture golden không đổi. Chín test HandFeedback mới bao phủ mở đầu/resync, đổi đúng ô và giữ focus, readiness/wait, pause/resume, reduced motion, giới hạn/tái sử dụng/dọn animation. Sáu test ManaDisplay bao phủ baseline, tiêu thật, giới hạn một pulse, quiet/reduced/suspend/reset/dispose, tiến độ và accessibility.
- `npm run smoke`, `git diff --check` và review độc lập phần tích hợp.
- Chrome DOM 844×390: đổi hai thẻ đầu trận, dùng tướng/phép trong combat, chồng rút 8→7→6; pause/resume; bật/tắt reduced motion. Mô phỏng offline trong đấu thường QA: thông báo nối lại hiện, hand chuyển `hand-paused`; khôi phục mạng thì bỏ trạng thái này và dùng/rút thẻ tiếp được. Các lỗi request do chủ động offline là dự kiến.
- Chrome DOM 667×376: thả Solan bằng touch, còn 1 mana; chạm Aurelia hiện tiến độ 33,33% ngay trên thẻ, không tiêu thêm bài. Reduced motion cho cost animation `none`; bật chuyển động lại dùng `hand-wait-pulse`; pause chuyển animation sang `paused`. Sáu vùng thẻ khoảng 70×71 px; document bằng viewport, không cuộn trang. Ảnh local `.data/card-feedback-wait.png`.
- Các khẳng định một cue, hủy WAAPI giữa chừng và silent resync được kiểm tra bằng test lifecycle/callback; không khẳng định đã đo âm thanh qua loa hoặc tái hiện chuyển tab ẩn trên điện thoại thật. Đây là QA trình duyệt theo kích thước mobile, không phải benchmark thiết bị.
- Database QA tách riêng và không sao chép session/người chơi main. Lượt quan sát dài dùng HP tướng 5.000, đòn thường 1, cooldown kỹ năng 900s, hồi mana 0,25 rồi 0/s và fallback queue 1s. Toàn bộ fixture chỉ ở QA, không triển khai lên main; main giữ content revision 29.
