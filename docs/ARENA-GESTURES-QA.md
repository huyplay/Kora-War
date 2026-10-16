# Vòng đời pinch trên mobile — 16/10/2026

Task [#67](https://github.com/huyplay/Kora-War/issues/67) sửa trạng thái ngón tay cũ khi pinch bị ngắt. Không đổi luật thả tướng/phép, giới hạn zoom, camera, mana hoặc deck; không thêm pan, nhấn giữ hay double-tap.

- Pinch hai ngón vẫn hủy chọn thẻ và zoom quanh tâm hai ngón. Ngón thứ ba hoặc thay một ngón khi pinch chưa kết thúc sẽ hủy cử chỉ; không nối khoảng cách cũ vào cặp mới gây zoom giật.
- Mất capture, pointercancel, capture thất bại hoặc mất quyền nhận input sẽ hủy cử chỉ, trả capture và chặn click cho tới khi các ngón liên quan đã thả, rồi giữ khoảng chặn click tương thích 450ms. Ngón mới trong khoảng cách ly cũng phải kết thúc; một timer không tự mở khóa khi còn ngón đang giữ.
- Theo dõi release/cancel trên document để nhận cả ngón nhấc ngoài canvas. Chạm thêm trên HUD khi đang giữ sân cũng hủy cử chỉ sân. Pointer lạ/mouse không tham gia pinch; normal touch tap vẫn giữ click dùng thẻ. Hidden/blur/pagehide dọn capture, khoảng cách và ngón cũ để không kẹt input sau khi quay lại.
- App hủy arena gesture khi pause/result, xoay dọc, đổi trận/về sảnh, nối trận PvP, mất kết nối hoặc mất WebGL context. Có cả điểm hủy sau khi request tạo trận hoàn tất. Chỉ nhận pinch/wheel khi trận đang chơi, kết nối sẵn sàng, màn hình ngang và không bị modal che.
- Document/window listener thuộc cùng AbortController; dispose dọn listener và capture. Khoảng cách, đồng hồ và lifecycle surface có thể được cung cấp riêng trong test; runtime dùng browser thật. Không thêm config hoặc migration database.

## QA

- `npm run check`: kiến trúc, server/client TypeScript, **380 tests**, production build. Chín test mới kiểm tra tap bình thường, ngón trên HUD, ba ngón và release muộn, mất capture/pointercancel, capture thất bại/dispose, hidden/blur/pagehide và pinch mới, disabled giữa chừng, thay ngón, wheel delta và dữ liệu không hữu hạn. Release capture giả phát lại lost-capture đồng bộ để kiểm tra callback không đệ quy. Các test CardGesture và gameplay/replay cũ vẫn qua.
- `npm run smoke`, Prettier và `git diff --check`; review trực tiếp bootstrap theo mode/phase/modal/connection và thời điểm khởi tạo LandscapeController. Không thay core/server/content.
- Chrome DOM **844×390** và **667×376**: chọn Lửa rồi pinch hai ngón, thêm ngón thứ ba, nhấc riêng/ngắm tiếp rồi thả hết; giữ chồng rút 8, mana 10 và hủy chọn. Chạm mới sau đó dùng đúng một phép, chồng rút thành 7. Giữ Băng rồi chuyển sang portrait gate, thả ngón và quay ngang: trận paused, vẫn giữ Băng/chồng rút 7. Resume và chạm mới dùng Băng đúng một lần, chồng rút thành 6. `touchCancel` giữa pinch giữ bài/mana; pinch mới sau đó zoom được. Khung mobile không cuộn; không có console warning/error trong lượt QA. Ảnh local `.data/arena-gesture-final.png`.
- Capture failure, blur/pagehide/hidden và disabled được kiểm tra bằng surface giả trong unit test; không tuyên bố đã nghiệm thu hệ điều hành thật hoặc mất mạng PvP trực tiếp trong lượt browser này. QA dùng database riêng, không sao player/session. Fixture dùng mana đầu/max 10, tướng HP 5.000/attack 1/skill cooldown 900s và deck mở đầu cố định để quan sát, không triển khai lên main. Database main giữ revision 29.
