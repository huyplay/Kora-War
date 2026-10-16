# Đạn trụ và tầm bắn — 16/10/2026

Task [#65](https://github.com/huyplay/Kora-War/issues/65) làm rõ trụ bắn trên mobile. Không đổi core, sự kiện chiến đấu, lượng sát thương, cooldown hoặc tầm bắn; đây là lớp trình bày sau khi mô phỏng đã xác nhận đòn đánh.

- Điểm chạm lấy đúng hit target đã ghép trong event stream, theo vị trí đội hình và 55% chiều cao thân model nhân scale hiện tại. Bao gồm điểm của quân vừa chết trong frame; thiếu anchor lịch sử vẫn dùng fallback cũ. Không chọn lại một quân gần hơn hoặc dời quân trong mô phỏng.
- Đạn cập nhật cả x/y/z khi trận đang chạy, kể cả frame đi qua thời điểm tới đích; sau đó điểm impact được khóa. Pause không gọi lookup hoặc đổi điểm đích. Missing visual/điểm không hữu hạn giữ điểm hợp lệ gần nhất. Tham số flight lấy `presentation.arena.towers.projectileSeconds` đã khóa, không làm chậm thời điểm sát thương trong core.
- Reduced motion dùng dấu thân/chân tĩnh, không có đường đạn/muzzle đang chuyển động hoặc vòng phồng theo thời gian. Đạn đang bay khi bật tùy chọn chuyển sang dấu tĩnh; tắt lại không khởi động lại đường đạn đó. Đạn mới dùng tùy chọn mới. Dấu tự hết theo lifetime hiển thị và giữ khi pause.
- Tầm bắn dùng plane/shader lane thay đường GL mảnh; đặt trên nền để không chìm vào mặt đá. Bounds vẫn là `tower.x ± rules.towerRange` trên đúng lane và `board.halfWidth`, không đổi phép so sánh tầm bắn nghiêm ngặt trong core. Màu hai phe từ `vfx.ally/enemy`; độ mờ idle/firing và bật/tắt từ presentation database. Không có migration hoặc publish content.
- Giữ tối đa 32 shot và 32 instance cho mỗi lớp. Cùng điểm nguồn/đích không tạo quaternion lỗi; duration/vị trí không hợp lệ bị bỏ. Reset ẩn cả tầm bắn và shot; trụ chết ẩn vùng, trụ không còn trong snapshot trả plane/material; dispose trả toàn bộ tài nguyên.

## QA

- `npm run check`: kiến trúc, server/client TypeScript, **371 tests**, production build. Bảy test mới bao phủ scale/chiều cao/torso origin, World ghép hit–death–shot và fallback, cập nhật 3D khi vượt qua arrival, khóa impact, pause không lookup, missing/non-finite target, reduced-motion toggle, sáu vùng/range/palette/opacity/reset/missing/dead, budget/đầu vào suy biến/disposal. Các test event matching và golden replay hiện có vẫn qua.
- `npm run smoke`, Prettier và `git diff --check`; review trực tiếp World integration, callback và lifecycle.
- Chrome DOM **844×390**, **667×376**, **1536×720**: triển khai bằng touch, giao tranh nhiều lane, đường đạn và dấu mục tiêu, zoom wheel, pause/resume, bật/tắt reduced motion, reset trận. Document ở khung mobile không cuộn; console không có warning/error trong lượt QA. Ảnh local `.data/tower-vfx-final.png`, `.data/tower-desktop.png`. Chế độ thường được kiểm tra bằng media `no-preference`, chế độ giảm chuyển động bằng `reduce`; override được dọn sau QA.
- Database QA riêng chỉ sao content/asset, không sao player/session. Fixture có mana đầu/max 10, tướng HP 5.000/attack 1/skill cooldown 900s, tower damage 1/cooldown 0,35s và flight 0,65s để quan sát nhiều đạn; không triển khai những giá trị này. Main giữ content revision 29. Đây là QA trình duyệt, không phải benchmark hoặc nghiệm thu trên điện thoại thật.
