# Phản hồi sát thương trụ — 16/10/2026

Task [#75](https://github.com/huyplay/Kora-War/issues/75), một phần arena [#4](https://github.com/huyplay/Kora-War/issues/4).

Vết nứt nền quanh trụ tăng theo phần HP đã mất trong snapshot, về 0 khi đầy máu và giữ dưới tàn tích khi trụ bị phá. Dấu trúng đòn ngắn ở thân trụ chỉ tạo từ HP delta, không phát từ snapshot đầu/reconnect. Giữ sáu slot, dùng chung một plane geometry, hai shader cho dấu nứt và hit; không tải texture/asset mới. Không gây sát thương, tác động input hoặc dời công trình trong mô phỏng.

Màu phe từ `vfx.ally/enemy`; hit dùng opacity/scale/blend/cooldown của `vfx.readability.events.hit`, thời gian tối đa từ maxDuration (không quá 0,35s). Độ mờ vết nứt dùng events.death.opacity. Content lịch sử thiếu profile dùng fallback. Không thêm schema/migration/publish; profile trận đã khóa vẫn là nguồn cấu hình.

Pause giữ tuổi hiệu ứng. Reduced motion dùng dấu hit tĩnh rồi ẩn theo lifetime, không khởi động lại chuyển động của hit đang tồn tại khi tắt tùy chọn. Collapse mới/đang chạy chuyển ngay sang tàn tích đứng yên, không tiếp tục tung rubble khi tắt reduced motion. Bệ cố định, configured body scale và reset giữ nguyên. Không đổi timing, lượng sát thương hoặc HP.

## Kiểm tra

- `npm run check`: architecture, server/client TypeScript, **403/403 tests**, production build; golden replay giữ nguyên. Sáu test mới cho HP/không initial burst, body height/palette/pause/expiry, nhịp/opacity/blend/lifetime, reduced toggle, missing/invalid/reset/pool, legacy/disposal; thêm một test collapse mới/giữa chừng giảm chuyển động, không bay lại và reset.
- `npm run smoke` sau build, Prettier và `git diff --check`; review World integration/reset/dispose và clock.
- Sáu vết nứt + sáu hit tối đa (mỗi plane hai tam giác), chỉ render phần visible. Không thêm texture/shadow pass; static architecture vẫn 36 batches/34.440 tam giác. Rubble hiện có tối đa 72 mảnh được giữ nguyên. Đây là giới hạn cấu trúc, không phải benchmark FPS.
- QA database riêng chỉ sao content/assets, không sao player/session. Fixture tower HP 150/damage 1, tướng HP 5.000/attack 25/skill cooldown 900s, mana đầu 10 và deck cố định để quan sát nhanh phá trụ. Các giá trị này không triển khai; main giữ revision 29.
- Dấu trúng đòn là billboard tại thân trụ, render trên model để tránh bị chìm trong geometry; vết nứt vẫn kiểm tra độ sâu và không phủ lên quân/công trình. Phản hồi hit bị giới hạn nhịp và lifetime, không có ánh sáng PointLight hay glow toàn màn hình mới.
- Chrome DOM **844×390**, **667×376**, **1536×720**: quan sát HP trụ giảm, dấu trúng đòn/vết nứt và trụ bị phá; zoom wheel/reset overview, pause/resume, chuyển reduced motion rồi trở về normal, reset trận và touch deploy (draw 8→7). Reset trả trụ đầy máu và dọn tàn tích/dấu cũ. Không cuộn trang hoặc warning/error console. QA phát hiện hit bị model che và sửa thành billboard render trên model, đã chạy lại toàn bộ check/smoke và nạp lại browser để xác nhận shader.
- Ảnh local: `.data/structure-damage-desktop.png`, `.data/structure-damage-small.png`, `.data/structure-reset-small.png`, `.data/structure-damage-final.png`. Viewport ghi trên là kích thước DOM, screenshot có vùng đệm do zoom browser. Snapshot đầu/reconnect, nhịp, opacity và disposal được kiểm bằng test có kiểm soát; không tuyên bố đã chạy reconnect PvP hoặc benchmark điện thoại thật trong task này.
