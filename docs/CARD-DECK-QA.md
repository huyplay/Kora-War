# QA deck 14 thẻ — 14/10/2026

Phạm vi: `cycle-v1`, builder 14 thẻ, tay 6, rút/đổi bài, 4 phép hỗ trợ, đóng băng và Nyx hậu tuyến. Quyết định người dùng tại [DECISIONS](DECISIONS.md). Renderer tiếp tục sân PBR/camera nghiêng/zoom/model và atlas đã có; đợt này bổ sung khung thành hai bên, biểu tượng phép, lưng bài/chồng rút, animation rút một thẻ và trạng thái Gia Tốc/Suy Yếu.

## Kiểm thử tự động

`npm run check` đạt **138/138 test**, kiểm tra ranh giới kiến trúc, TypeScript server/client và production build. `tests/fixtures/three-baseline.json` không thay đổi.

- Deck: 1.000 seed với hai thành phần deck, luôn 6 thẻ duy nhất/ít nhất 4 tướng và 1 phép. 500 lượt rút bảo toàn đúng 14 thẻ, chỉ gọi shuffle khi hết pile; 250 seed đổi hai thẻ vẫn giữ thành phần mở đầu. Thẻ trả xuống cuối pile, lệnh đổi/rút sai không đổi trạng thái.
- Combat: lệnh thiếu mana/sai UID nguyên tử; Ice đóng băng đủ 2 giây kể cả khi nhận choáng ngắn hơn; phe tác động, giới hạn khiên, hết hạn suy yếu/gia tốc; Nyx ưu tiên Du Hiệp phía sau tank. AI có tay toàn phép vẫn rút tiếp; chạy lặp lại cùng seed cho cùng snapshot sau nhiều vòng shuffle và có kết quả trận.
- Server: không lộ tay đối thủ/seed/pile/RNG, cần hai phía chốt hoặc hết 15 giây; UID bắt buộc, lệnh trùng idempotent, tọa độ đảo đúng theo người xem. Replay có đổi bài và UID, từ chối sửa UID, xác minh kết quả và thưởng đúng một lần.
- Raycast: phép hỗ trợ nhận chạm vào thân mô hình đồng minh; phép tấn công bỏ qua đồng minh. Các test Băng tactical làm chậm và golden fixture gốc vẫn giữ nguyên.

## QA trình duyệt Edge local

- Home mở builder được sau khi nạp xong asset. Loader được giữ tới khi handler/HUD hoàn tất để không có nút hiện ra nhưng chưa nhận click.
- Builder: 14 slot, catalog 18 thẻ. Bỏ 1 thẻ khóa nút lưu; thêm Hồi Sinh Lực mở lại nút lưu, reload vẫn giữ deck 9 tướng + 5 phép. Sau QA đã khôi phục đúng deck ban đầu qua UI.
- Kiểm tra viewport CSS 844×390 và khoảng 667×375, không tràn ngang. Đã sửa `!important` của roster cũ khiến thẻ cao hơn slot, chồng lên bộ sưu tập. Builder cuộn dọc khi cần; nút lưu nằm ở footer sticky.
- Opening luyện tập: timer 00:00/mana 4 đứng yên tới khi chốt, chọn thẻ thứ ba bị từ chối; đổi hai thẻ thay đúng hai ô, còn bốn ô giữ nguyên. Dùng Nyx đường giữa thay đúng ô bằng Vesper, pile 8→7. Debug được đánh dấu và không nhận thưởng.
- Kéo Raiko từ tay vào vùng triển khai trên canvas thành công: cùng ô nhận Kael, pile 8→7 và mana 10→7. Kiểm tra bằng input chuột trình duyệt; gesture cảm ứng có unit test riêng, chưa chạy trên điện thoại thật.
- PvP hai cookie local (`127.0.0.1` và `localhost`): tạo/vào phòng, màn đổi hai thẻ và đếm ngược, chờ người còn lại chốt, bắt đầu ở mana 4. Triệu hồi quân từ phía thứ hai xuất hiện bên phải của phía thứ nhất; dùng Ice thay thẻ và pile 8→7. Reload vào lại đúng phòng/tay/pile; khi trận kết thúc hiển thị kết quả. Không thấy lỗi console ở hai tab kiểm thử.
- Các test core/raycast xác minh tác động freeze và sát thương; QA tay trên trình duyệt xác minh chọn/chạm/gửi lệnh/rút thẻ. Không dùng screenshot để kết luận thời lượng đóng băng chính xác.
- Inspector/xuất trạng thái PvP dùng snapshot đã lọc từ server, không xuất các pile/seed dự phòng của Battle phía client. Lượt build cuối sau sửa này đã chạy lại toàn bộ `npm run check`.

Giới hạn: chưa benchmark điện thoại thật, chưa kiểm thử WAN/matchmaking/ranked. Synergy vẫn tính theo toàn bộ tướng trong deck, nên deck 14 cần playtest cân bằng thêm. Bundle Three.js còn cảnh báo kích thước trên 500 kB; đây không phải kết luận FPS thiết bị.
