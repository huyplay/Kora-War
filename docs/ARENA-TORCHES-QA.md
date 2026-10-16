# Chậu đuốc và ánh lửa — 16/10/2026

Task [#69](https://github.com/huyplay/Kora-War/issues/69), thuộc phạm vi arena [#4](https://github.com/huyplay/Kora-War/issues/4).

Bốn trụ đuốc có bệ đá bậc, thân, đai kim loại, chậu loe, miệng và lòng than. Phần tĩnh được bake vào các batch hiện có. Cùng một danh sách tọa độ cung cấp vị trí cho geometry, lửa và PointLight; đáy lửa bám miệng chậu cả khi đổi kích thước. Không thêm vật cản, lực đẩy hoặc mục tiêu vào mô phỏng.

Lửa gồm lớp ngoài, lõi nóng và quầng sáng; texture ngọn lửa tạo bằng canvas 64×128, dùng chung cho cả bốn đuốc. Ánh đuốc dao động nhẹ theo cùng render clock và cùng hệ số với lửa. Ban ngày giảm quầng sáng, ban đêm có vùng sáng ấm trên đá và tường. Mode/cường độ vẫn lấy `presentation.arena.lighting` trong content snapshot. Cường độ 0 tắt cả sprite, tàn lửa và nguồn sáng; không chỉ tắt PointLight như trước. Không thêm schema, migration hay publish content.

Pause giữ cùng clock cho lửa/ánh sáng/cờ/ấn cổng. Reduced motion giữ chúng ở hình tĩnh và ẩn tàn bay; tắt tùy chọn khôi phục chuyển động. Không tính lại normal cờ nếu thời điểm hình ảnh không đổi. Dispose trả texture/material dùng chung đúng một lần, dọn root và bỏ qua frame sau teardown.

## Kiểm tra

- `npm run check`: architecture, server/client TypeScript, **385/385 tests**, production build; các golden replay hiện có giữ nguyên. Năm test mới bao phủ geometry/footprint, chân lửa/nguồn sáng/hệ số dao động, day/night/off/budget tái dùng, pause/reduced-motion toggle và disposal. Lượt kiểm tra đầu phát hiện thêm một material batch; lòng than đã tái dùng màu/vật liệu nền thay vì tăng ngân sách.
- `npm run smoke` chạy sau build thành công; Prettier và `git diff --check`.
- Static architecture: **36 material batches, 32.280 tam giác**, dưới giới hạn 35.000 của test hiện có. Bốn PointLight vẫn không có shadow map. Lớp động có 12 sprite và một InstancedMesh tối đa 24 tàn lửa (12 ở low, 0 ở reduced motion/off). Thêm một texture 64×128; không có file tải thêm hoặc asset ID mới. Đây là ngân sách cấu trúc, không phải benchmark FPS trên điện thoại.
- Chrome DOM **844×390**, **667×376**, **1536×720**: profile ngày, đêm và đêm với torchIntensity=0; quan sát bệ/chậu, lửa, vùng sáng và tướng; zoom wheel/pinch tới giới hạn, về overview; chạm triển khai Solan rút thẻ thay thế (chồng rút 8→7); pause/resume; media reduced motion rồi trở lại no-preference. Không có cuộn trang hoặc warning/error console trong lượt kiểm tra.
- Ảnh local: `.data/torch-day-mobile.png`, `.data/torch-night-mobile.png`, `.data/torch-night-small.png`, `.data/torch-night-desktop.png`, `.data/torch-off-mobile.png`. Kích thước ghi trên là DOM viewport; screenshot có thêm vùng đệm do browser zoom 90%.
- Database QA riêng chỉ sao content/assets, không sao player/session. Fixture mana đầu 10, deck cố định, tướng HP 5.000/attack 1/skill cooldown 900s để quan sát; đổi mode/cường độ chỉ trong QA. Main tiếp tục revision 29. Kiểm tra trình duyệt không thay thế nghiệm thu thiết bị thật.
