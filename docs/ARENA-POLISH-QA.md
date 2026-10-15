# Arena và độ rõ giao tranh — 15/10/2026

Đợt triển khai đầu của issue #4, do Codex phụ trách. Không đổi core/data, luật cycle-v1 hoặc fixture replay; không phát hành revision database. Các texture/model Poly Haven và atlas GegX đã gán trong database tiếp tục được sử dụng. Nhánh đề xuất art cũ của Gemini chưa được tích hợp; không coi thông số trong bản proposal là số đo runtime.

## Thay đổi đã nghiệm thu

- Các khối đá/viền kiến trúc có cạnh vát để nhận ánh sáng, dùng geometry dùng chung theo kích thước rồi batch theo material. Giữ world-space UV, ba lane và vùng chiến đấu. Màu đồng tối hơn và bề mặt nhám hơn để viền không lấn át quân.
- Vùng sáng thả quân nâng lên trên mặt đá (trước đó y=0.05 thấp hơn mặt tile y=0.06). Không đổi tọa độ triển khai trong mô phỏng.
- Model nhập cung cấp bán kính hiển thị từ bounding box đã chuẩn hóa chiều cao. Formation dùng kích thước này cùng cấu hình presentation từ database để giãn đội hình và chừa khoảng trống ở hai đầu sân. Vị trí và chỉ số Unit trong core giữ nguyên.
- Thanh máu, shield bar và số sát thương theo chiều cao/scale thực của model; hiệu ứng đóng băng, cháy, tăng tốc và suy yếu theo scale đội hình. Vùng gây sát thương phép vẫn giữ tọa độ/radius của mô phỏng.
- Vùng raycast chọn phép theo kích thước model hiện tại. Sửa tình huống model đã thu nhỏ vẫn bắt nhầm cú chạm vào quân cạnh bên. Lệnh cast tiếp tục dùng vị trí logic của mục tiêu, kể cả khi hình ảnh được giãn đội hình.

## Kiểm thử đã chạy

- `npm run check`: architecture, TypeScript server/client, **170/170 tests**, production build đạt. Golden replay không chỉnh sửa. Bộ regression hiện có kiểm Băng cycle-v1 khóa di chuyển/đánh/kỹ năng đúng hai giây và Nyx ưu tiên hậu tuyến vẫn đạt.
- Regression mới: bounds/UV hữu hạn của geometry vát, budget mặt sân, thanh máu/vùng pick theo scale, chọn model nhỏ cạnh nhau, status VFX theo scale nhưng zone phép không đổi, đội hình hỗn hợp 18 và 100 quân giữ khoảng cách và giới hạn X mà không sửa trạng thái combat.
- Edge headless trên Windows, database QA riêng; nguồn content/assets được đọc read-only từ database chính. Fixture **54 quân, 18/lane**, ở 844×390 và 1536×720: overview 1×, zoom 1,85×, low quality, reset, tiếp tục combat và hết thời gian freeze. Không có pageerror; kiểm model picking vẫn trả mục tiêu hợp lệ ở zoom lớn.
- Luồng app thật: Home → luyện tập → story → giữ bài → chọn thẻ tướng → triển khai đường giữa → zoom/reset; đồng hồ trận tiếp tục, không có lỗi JavaScript.
- Đã xem ảnh cuối tại `.data/arena-dense-844-1x.png` và `.data/arena-dense-1536-185x.png` trong worktree task. Các ảnh/cấu hình fixture/JSON đo nằm trong `.data`, không vào Git hay production source. File harness tạm trong dist chỉ phục vụ QA và được xóa bởi lần production build kế tiếp.

## Budget và giới hạn

Kiến trúc tĩnh do `buildEnvironment` batch: **15 batches, 12.040 triangles**, dưới giới hạn 25.000 của đợt này. Đây không bao gồm model trụ/lõi/props nhập hoặc quân.

Trong fixture 54 quân, một frame high quality ghi khoảng **335 draw calls, 696.202 triangles, 138 geometries, 207 textures**. Đây là thống kê renderer tại thời điểm kiểm tra, không phải benchmark FPS hay cam kết hiệu năng điện thoại. Three.js bundle còn cảnh báo >500 kB.

Khoảng cách là bố trí hiển thị, không thêm va chạm/chặn đường vào combat. Bounds lấy từ tư thế model khởi tạo; vũ khí/vạt áo khi animation vươn rộng và sự che khuất theo camera vẫn có thể xảy ra. Cần làm tiếp chất lượng art tổng thể, bounds theo animation khi cần, và giảm chi phí model/VFX trên thiết bị thật. Issue #4 vẫn mở; chưa tuyên bố đạt hoàn toàn hình mẫu Castle Crush.
