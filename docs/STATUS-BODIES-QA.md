# Phân biệt lớp khiên và đóng băng — 16/10/2026

Task [#81](https://github.com/huyplay/Kora-War/issues/81), tiếp tục hoàn thiện đồ họa chiến đấu.

Khiên có lưới năng lượng ba hướng, viền sáng và dải sáng lướt nhẹ. Đóng băng dùng vân tinh thể phân nhánh, mép phủ sương và phần chân đục hơn; không chuyển động khi quân bị đông cứng. Phần giữa các lớp giữ trong để nhìn model và thanh máu. Họa tiết có phase ổn định theo ID quân, không đổi khi thứ tự snapshot thay đổi và không dùng nguồn random.

Màu băng/khiên tiếp tục lấy từ `gameplay.spells.ice/shield.color`; bật/tắt, opacity và độ nới từ `vfx.feedback.bodies` đã khóa theo trận. Không thêm schema, migration hoặc publish database; không sửa HP/khiên, thời hạn trạng thái, combat hoặc replay. Content thiếu bodies profile tiếp tục không vẽ lớp thân. Hai lớp có thể cùng tồn tại và tự hết theo snapshot riêng.

Pause giữ clock. Reduced motion bỏ pulse và dải sáng lướt, giữ họa tiết tĩnh; màu, kích thước và opacity admin vẫn được tôn trọng. Clock không hữu hạn giữ giá trị hợp lệ trước đó, status/HP/ID/tọa độ lỗi không tạo lớp giả hoặc ma trận NaN. Reset xóa count/clock; dispose lặp an toàn và bỏ qua configure/begin/add/end muộn.

## Kiểm tra

- `npm run check`: architecture, TypeScript server/client, **418/418 tests**, production build; golden replay fixtures giữ nguyên. Bốn test mới kiểm phase theo ID khi reorder/expiry, dữ liệu lỗi, pause/reduced motion/config và pool/reset/disposal. Các test cũ cho coexist/height/padding/admin/installer vẫn đạt.
- `npm run smoke` sau build, Prettier cho TS/tài liệu QA mới và `git diff --check`.
- Giữ **một instanced draw call**, một geometry 80 tam giác và một ShaderMaterial, tối đa 200 lớp cho 100 quân. Thêm một instanced float phase, **800 byte**, không thêm mesh/material/texture tải mạng hoặc pass ánh sáng. Không cấp phát geometry/material khi đổi trạng thái. Đây là giới hạn cấu trúc, không phải benchmark điện thoại.
- Database QA riêng chỉ sao content/assets, không sao người chơi/session. Fixture HP tướng 5.000/attack 1/skill cooldown 900s, mana đầu 10, không xáo; thời hạn Băng 12s chỉ để quan sát. Các giá trị này không triển khai; main giữ revision 29 và Băng theo luật live đã chốt.
- Chrome DOM **844×390**, **667×376**, **1536×720**: touch deploy (chồng rút 8→6), dùng Khiên Aether và Băng, xem các lớp cùng tồn tại, zoom/reset overview, pause/resume, reduced motion toggle và chơi lại. Không cuộn trang, warning/error console hoặc lỗi shader. Không thay đổi tab trận đang chơi của người dùng.
- Ảnh local: `.data/status-desktop.png` (các quân có biểu tượng băng và khiên), `.data/status-mobile.png`, `.data/status-small-reduced.png`. Kích thước ghi ở trên là viewport DOM; screenshot có vùng đệm do browser zoom.
- Phase/invalid/disposal và clock pause chính xác kiểm bằng test có kiểm soát; browser QA chỉ là desktop giả lập viewport mobile, không phải benchmark máy thật hoặc kiểm reconnect PvP.
