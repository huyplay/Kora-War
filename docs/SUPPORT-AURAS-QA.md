# Dấu tăng tốc và suy yếu — 16/10/2026

Task [#83](https://github.com/huyplay/Kora-War/issues/83), tiếp tục hoàn thiện đồ họa chiến đấu.

`UnitSupportAuras` gom dấu hỗ trợ của content có readability profile vào một lượt vẽ: Gia Tốc là ba chevron theo hướng tiến của từng phe, Suy Yếu là vòng ấn đứt đoạn cùng rune ở giữa. Dấu nằm sát nền, theo origin/bán kính model đã giãn đội hình; có giới hạn kích thước cho tướng lớn để không giống vùng phép. Hai trạng thái vẫn có thể cùng hiện và tự hết riêng theo snapshot. Content cũ thiếu profile giữ vòng tròn legacy.

Màu lấy từ `gameplay.spells.haste/weaken.color`; opacity/scale/blend từ `vfx.readability.events.skill`. Opacity 0 ẩn dấu mà không bật lại vòng cũ. Thời hạn và điều kiện trạng thái vẫn do core/server; shader không áp dụng hiệu ứng combat. Không thêm schema, migration hoặc publish database. Số hồi máu và các phép còn lại giữ renderer hiện có.

Pause dùng clock đã dừng; reduced motion giữ glyph tĩnh, không dịch chevron hoặc pulse. Slot đọc dữ liệu snapshot mỗi frame, không giữ trạng thái đã hết hoặc quân đã chết. Vị trí không hợp lệ bỏ marker, clock không hữu hạn giữ giá trị trước. Reset/config change dọn batch, không dispose geometry dùng chung; dispose lặp an toàn và bỏ qua update/configure muộn. World truyền origin Y/bán kính hiển thị để tránh dấu lơ lửng hoặc quá rộng theo model nguồn.

## Kiểm tra

- `npm run check`: architecture, TypeScript server/client, **422/422 tests**, production build; golden replay giữ nguyên. Bốn test mới kiểm coexist/hướng/anchor/size cap/không sửa unit, expiry/death/invalid/pause/reduced/config, pool/reset/disposal và SpellEffects thay vòng cũ/legacy/config/lifecycle. Các test phép, freeze và async atlas cũ tiếp tục đạt.
- `npm run smoke` sau build, scoped Prettier và `git diff --check`.
- Tối đa **200 marker, một draw call**, một plane hai tam giác và một ShaderMaterial; không tải texture/asset mới. Batch tối đa 400 tam giác thay cho tối đa hai RingGeometry/lượt vẽ riêng mỗi quân; không tạo mesh/material khi thêm marker. Attribute kind/facing/phase gồm 600 float (2.400 byte); phase ổn định theo ID. Đây là giới hạn cấu trúc, không phải benchmark FPS.
- QA database riêng chỉ sao content/assets, không sao player/session. Fixture HP tướng 5.000/attack 1/skill cooldown 900s, mana đầu 10, không xáo, deck có Gia Tốc/Suy Yếu và thời hạn hai hiệu ứng 20s để quan sát. Không triển khai các giá trị này; main giữ revision 29 và thời hạn live.
- Chrome DOM **844×390**, **667×376**, **1536×720**: touch deploy hai thẻ (chồng rút 8→6), dùng Gia Tốc/Suy Yếu, quan sát AI dùng cả hai, zoom/reset overview, pause/resume, reduced motion toggle và chơi lại. Màn nhỏ sau reset chạm thả thẻ 8→7. Không cuộn trang, warning/error console hoặc lỗi shader. QA phát hiện marker trên tướng lớn quá rộng; đã thu gọn cap và reload production build, chạy lại check/smoke trước nghiệm thu.
- Ảnh local: `.data/support-mobile.png`, `.data/support-desktop.png`, `.data/support-small.png`, `.data/support-small-reduced.png`. Kích thước trên là viewport DOM; screenshot có vùng đệm do zoom browser.
- Exact expiry/invalid/disposal/pause được kiểm bằng test có kiểm soát. Browser QA không phải đo điện thoại thật hoặc kiểm reconnect PvP; CI/CD tiếp tục tắt.
