# Đạn tướng và điểm chạm — 16/10/2026

Task [#49](https://github.com/huyplay/Kora-War/issues/49) chỉ đổi trình bày chiến đấu. Sát thương, nhịp đánh, mục tiêu, freeze và kết quả vẫn do mô phỏng hiện tại quyết định; thời gian bay không trì hoãn sát thương.

## Cấu hình và triển khai

- `ContentConfig.vfx.combat` là profile tùy chọn trong database, khóa theo content snapshot của trận. Admin → VFX cho phép bật/tắt, chỉnh thời gian bay, độ cong, kích thước/vệt sáng/điểm chạm, kiểu và màu đạn từng tướng. Có ba kiểu: mũi tên, cầu phép và tia năng lượng. Chỉ đòn đánh xa phát đạn.
- `npm run presentation:combat` thêm profile cho content đang phát hành, tạo backup SQLite trước khi ghi, giữ nháp chưa phát hành và không ghi đè profile admin đã có. Chạy lại không tạo revision mới. Không thay asset, ví, gameplay hoặc revision/replay lịch sử.
- Snapshot không có profile và tướng chưa có entry tiếp tục dùng hiệu ứng cũ. Preset `defaultContent()` không tự chèn profile, giữ đường chạy legacy và golden fixture.

## Ghép sự kiện và giới hạn hiển thị

Đạn tướng nối sự kiện `projectile → hit`; trụ nối `hit → death? → projectile`, kiểm tra ID liên tiếp, thời gian, phe, lane và tọa độ. Tướng còn kiểm tra tầm đánh để không lấy nhầm hit kỹ năng ngay sau một đòn bắn công trình. Hit/death dùng `targetId`; tọa độ của quân vừa chết được giữ trong frame xử lý sự kiện. Khi dữ liệu không đủ, dùng tọa độ sự kiện, không tìm quân còn sống gần nhất để thay mục tiêu.

Nguồn bắn của event cũ không có source ID vẫn được suy ra từ tướng/phe/lane/vị trí và nhịp đánh; hai quân cùng loại trùng hoàn toàn tọa độ có thể không phân biệt được nguồn. Không sửa định dạng replay hoặc core để phục vụ VFX.

Pool cố định tối đa 40 đạn và 40 điểm chạm, dùng chung năm geometry; không tạo mesh/material/texture theo mỗi phát bắn. Pause giữ chuyển động. Reduced motion dùng điểm chạm tĩnh thay đạn bay. Reset/đổi content/dispose dọn pool; bỏ projectile quá cũ khi nhận lại snapshot.

## Kiểm tra

- `npm run check`: kiểm tra kiến trúc, TypeScript server/client, toàn bộ unit tests và Vite build. Không tạo lại golden fixture.
- Tám test mới: mục tiêu khi quân chồng hình; trụ kết liễu; guard công trình/kỹ năng; kiểu/màu/bay/điểm chạm/pause; pool burst 500 lần; reduced motion; validation/admin; backup/nháp/lịch sử/idempotence installer.
- QA Chrome trên database riêng: khung DOM 844×390, không cuộn trang; gọi Lyra, Aurelia, Vesper, Orin bằng chọn thẻ và touch trên lane; kiểm tra pause/resume, console, reduced motion. Admin sửa thời gian bay và kiểu Lyra, lưu/phát hành rồi reload để xác nhận.
- Fixture QA dùng mana 30 và thời gian bay 0,5 giây để dễ quan sát nhiều loại đạn. Các giá trị này không được đưa vào database chính; bản chính giữ mana 4/10 và thời gian bay mặc định 0,2 giây.

Đây là QA runtime trình duyệt desktop với khung mobile, không phải benchmark FPS hay thử nghiệm thiết bị điện thoại thật.
