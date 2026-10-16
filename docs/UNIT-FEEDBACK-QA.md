# Phản hồi tướng trên mobile — 16/10/2026

Task [#51](https://github.com/huyplay/Kora-War/issues/51) hoàn thiện số sát thương/hồi máu, băng và lá chắn. Không thay sát thương, triển khai, thời gian khống chế hay chỉ số chiến đấu.

## Cấu hình

`ContentConfig.vfx.feedback` là profile tùy chọn, được lưu trong SQLite và khóa theo content của trận. Admin → Hiệu ứng chỉnh bật/tắt số, kích thước pixel, thời gian hiển thị, độ bay lên, màu số, bật/tắt lớp bảo vệ, độ rõ và độ nới quanh model. Màu băng/lá chắn dùng `gameplay.spells.ice.color` và `gameplay.spells.shield.color`; tuổi thọ lấy trạng thái unit, không tự tạo timer VFX thay cho combat.

`npm run presentation:feedback` tạo backup, thêm profile vào content mới và giữ nháp chưa phát hành. Không ghi đè profile đã có; chạy lại không tạo revision. Không sửa gameplay, người chơi, ví, asset hoặc revision/replay lịch sử. Snapshot thiếu profile giữ cách hiển thị số và băng cũ, không hiện lớp khiên mới.

## Trình bày và ngân sách

- Số dùng pixel theo độ sâu camera/FOV/zoom nên giữ kích thước giữa các lane. Profile mặc định dùng quad cao 18px, glyph thực nằm bên trong atlas; 18px không phải kích thước font CSS. Số bắt đầu trên thanh máu, không bị model che; số vẫn là chênh lệch HP snapshot thực tế và không cộng phần lá chắn hấp thụ. Pool giữ tối đa 32 nhãn / 160 glyph, một atlas dùng chung.
- Lớp băng và khiên dùng một instanced draw call, một geometry/material, tối đa 200 lớp cho 100 quân. Chiều cao và bán kính theo model đang hiển thị/đội hình/spawn; băng và khiên có thể cùng tồn tại, hết độc lập. Không thêm collider, HP hoặc đẩy quân.
- Profile mới tắt shell/shard/rune băng cũ để tránh quầng trắng vẽ trùng; biểu tượng khống chế trên thanh máu vẫn hiện. Các hiệu ứng phép vùng khác giữ nguyên. Fallback cũ được chỉnh chiều cao shell/màu theo model và config.
- Đóng băng giữ pose ngay cả khi vừa xuất hiện hoặc snapshot `state` chưa cập nhật. Model nhập và model dự phòng đều dừng animation đến hết hiệu lực. Pause giữ pose/VFX; reduced motion dừng số bay, nhịp khiên và animation atlas/lửa trạng thái. Reset/dispose xóa instance và giải phóng tài nguyên.

## QA

`npm run check` kiểm tra kiến trúc, TypeScript server/client, toàn bộ unit tests và build production. Không tạo lại fixture legacy. Tám test profile/renderer/installer mới cùng một test pose đóng băng kiểm tra pixel qua các lane/zoom/chiều cao, pause/reduced motion, pool burst, trạng thái chồng nhau, hết hạn, màu, dữ liệu đầu vào bất biến, ẩn rune cũ, validation, backup/nháp/lịch sử/idempotence.

QA Chrome dùng DOM viewport 844×390: chọn thẻ và touch để gọi Solan/Lyra/Brann, dùng Khiên Aether/Băng, kiểm tra số, lớp bảo vệ, pause, reduced motion, không cuộn trang và console. Admin sửa kích thước số, lưu/phát hành rồi reload để kiểm tra database. Dữ liệu QA riêng có mana 30; lượt quan sát sau tăng HP tướng lên 5.000, đòn thường 1 và cooldown kỹ năng 900s để tướng không chết trong lúc kiểm tra. Các giá trị fixture này không được đưa vào main.

Đây là QA trình duyệt desktop ở khung mobile; chưa phải thử nghiệm thiết bị điện thoại thật hoặc benchmark FPS.
