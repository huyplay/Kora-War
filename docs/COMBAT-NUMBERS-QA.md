# Số sát thương và hồi máu — 16/10/2026

Task [#85](https://github.com/huyplay/Kora-War/issues/85), tiếp tục hoàn thiện đồ họa giao tranh mobile.

`FloatingNumbers` dành chỗ cho số đang hiện trước, rồi chọn vị trí cho số mới trong chín ô gần điểm trúng đòn. Các ô được so theo diện tích chữ đè nhau và khoảng cách tới điểm gốc. Offset khóa cho tới khi số hết hạn, không dịch lại số cũ khi có hit mới hoặc số khác biến mất. Đây là cách giảm chồng chữ có giới hạn; khi quá đông hoặc camera thay đổi, vẫn có thể có chữ đè nhau thay vì đẩy chúng xa khỏi tướng.

Profile có sẵn trong `vfx.feedback.numbers` tiếp tục quyết định bật/tắt, cỡ pixel, thời gian, độ bay và màu damage/heal. Số theo origin Y hiển thị của model; World đọc delta HP thực qua `UnitFeedback`. Không thêm luật, giá trị sát thương/hồi máu, schema, migration hay phát hành content. Nội dung legacy không có profile giữ cách định cỡ world-space.

Pause giữ clock; khi bật reduced motion, số đang bay giữ nguyên vị trí và scale hiện tại, tiếp tục mờ/hết hạn theo lifetime. Tắt reduced motion chỉ làm các số mới chuyển động trở lại. Bỏ mẫu vị trí không hữu hạn, coi delta time âm/không hữu hạn là 0; dispose lặp an toàn và bỏ qua emit/configure/update muộn.

## Kiểm tra

- `npm run check`: architecture, TypeScript server/client, **427/427 tests**, production build; không sửa golden fixture. Năm test mới kiểm số damage/heal ở cùng/gần điểm, màu config, giữ vị trí số cũ, cỡ pixel qua viewport/zoom, expiry, pause/reduced motion, legacy pop, dữ liệu sai và vòng đời dispose. Các test pool 32 label/160 glyph, delta HP và gom hồi máu nhỏ tiếp tục đạt.
- `npm run smoke` sau build, scoped Prettier và `git diff --check`.
- Giữ **một atlas, một InstancedMesh/draw call, tối đa 32 label và 160 glyph**. Tìm chỗ tối đa chín ứng viên cho mỗi số mới; không tạo texture/material/geometry khi giao tranh. Không phải benchmark FPS thiết bị thật.
- Database QA riêng sao content/assets, không sao player/session. Fixture mana đầu 10, không xáo, HP tướng 5.000/attack 12/skill cooldown 900s để quan sát lâu; không triển khai các giá trị QA.
- Chrome DOM **844×390**, **667×376**, **1536×720**: chạm thả Solan/Lyra/Brann (chồng rút 8→5), dùng Hồi Sinh Lực (5→4), thả Aurelia (4→3), quan sát số sát thương và hồi máu, zoom/reset overview, pause/resume, đổi reduced motion. Trên desktop triển khai nhanh Orin ở lane dưới (3→2). Hai lần chạm màn nhỏ vào vùng ngoài giới hạn triển khai không dùng thẻ; không tính là kiểm tra thả quân thành công ở kích thước đó.
- Khung nhỏ không cuộn trang (`scrollX/Y=0`, body bằng viewport); console không warning/error. Ảnh `.data/numbers-mobile.png`, `.data/numbers-small-reduced.png`, `.data/numbers-desktop.png` là screenshot nguyên bản có vùng đệm của browser. Kiểm tra expiry/spacing chính xác bằng test có kiểm soát; browser xác nhận hình ảnh và thao tác.
- Không kiểm reconnect PvP/điện thoại thật trong task này; CI/CD tiếp tục tắt.
